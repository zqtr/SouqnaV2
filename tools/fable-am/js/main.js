/* Fable-aM panel brain.
 * Flow: prompt → AE context snapshot → code generation → temp .jsx → evalFile
 * in AE → on ERR, feed the error back and retry (max 2 repairs).
 *
 * Generation is local-first: it goes to the Fable-aM agent server
 * (mcp/server.js --http), which runs the `claude` CLI on the user's Claude
 * subscription — no API key. If the local agent is offline and a Vercel AI
 * Gateway key is set in settings, that is used as a fallback.
 * Runs log to logs/runs.jsonl — the seed corpus for the Phase 3 learning KB.
 */
(function () {
  var cs = new CSInterface();
  var fs = cep_node.require("fs");
  var path = cep_node.require("path");
  var cp = cep_node.require("child_process");
  var extDir = cs.getSystemPath(SystemPath.EXTENSION);

  var BRAND = fs.readFileSync(path.join(extDir, "knowledge", "brand.md"), "utf8");
  var LEARNED_FILE = path.join(extDir, "knowledge", "learned.md");
  var LOG_FILE = path.join(extDir, "logs", "runs.jsonl");
  var TMP = path.join(extDir, "logs", "_run.jsx");
  var MAX_REPAIRS = 2;
  var DEFAULT_AGENT_URL = "http://127.0.0.1:3845";

  var $log = document.getElementById("log");
  var $prompt = document.getElementById("prompt");
  var $send = document.getElementById("send");
  var $key = document.getElementById("apiKey");
  var $model = document.getElementById("model");
  var $agentUrl = document.getElementById("agentUrl");
  var $dot = document.getElementById("dot");
  var $dotText = document.getElementById("dotText");

  $key.value = localStorage.getItem("fam.key") || "";
  $model.value = localStorage.getItem("fam.model") || "";
  $agentUrl.value = localStorage.getItem("fam.agentUrl") || "";
  $key.onchange = function () { localStorage.setItem("fam.key", $key.value.trim()); };
  $model.onchange = function () { localStorage.setItem("fam.model", $model.value.trim()); };
  $agentUrl.onchange = function () {
    localStorage.setItem("fam.agentUrl", $agentUrl.value.trim());
    checkHealth();
  };
  document.getElementById("gear").onclick = function () {
    document.getElementById("settings").classList.toggle("open");
  };

  function agentUrl() {
    return ($agentUrl.value.trim() || DEFAULT_AGENT_URL).replace(/\/+$/, "");
  }

  function say(text, cls) {
    var d = document.createElement("div");
    d.className = "msg " + cls;
    d.textContent = text;
    $log.appendChild(d);
    $log.scrollTop = $log.scrollHeight;
    return d;
  }

  function evalScript(code) {
    return new Promise(function (resolve) { cs.evalScript(code, resolve); });
  }

  function stripFences(s) {
    return s.replace(/^\s*```[a-z]*\s*/i, "").replace(/\s*```\s*$/, "").trim();
  }

  function fetchTimeout(url, opts, ms) {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, ms);
    opts = opts || {};
    opts.signal = ctl.signal;
    return fetch(url, opts).finally(function () { clearTimeout(timer); });
  }

  /* ---- online / offline indicator --------------------------------------- */

  var agentOnline = false;
  var triedAutostart = false;

  function updateDot() {
    $dot.className = "dot " + (agentOnline ? "online" : "offline");
    $dotText.textContent = agentOnline
      ? "local agent online"
      : ($key.value.trim() ? "local agent offline — gateway fallback" : "local agent offline");
  }

  function autostartAgent() {
    try {
      var server = path.join(extDir, "mcp", "server.js");
      if (!fs.existsSync(server)) return;
      var cmd = 'nohup node "' + server + '" --http 3845 >/dev/null 2>&1 &';
      cp.spawn("/bin/zsh", ["-lc", cmd], { detached: true, stdio: "ignore" }).unref();
      setTimeout(checkHealth, 2500);
    } catch (e) { /* stay offline; the dot reports it */ }
  }

  function checkHealth() {
    fetchTimeout(agentUrl() + "/health", null, 2000)
      .then(function (res) { return res.json(); })
      .then(function (j) { agentOnline = !!(j.ok && j.claude); })
      .catch(function () { agentOnline = false; })
      .then(function () {
        // Only auto-start the bundled default, never a custom URL.
        if (!agentOnline && !triedAutostart && !$agentUrl.value.trim()) {
          triedAutostart = true;
          autostartAgent();
        }
        updateDot();
      });
  }

  setInterval(checkHealth, 5000);
  checkHealth();

  /* ---- code generation --------------------------------------------------- */

  async function llmLocal(messages, imagePath) {
    var res = await fetchTimeout(agentUrl() + "/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages, imagePath: imagePath || undefined }),
    }, 240000);
    if (!res.ok) {
      var detail = "";
      try { detail = (await res.json()).error || ""; } catch (e) {}
      throw new Error("Local agent " + res.status + (detail ? ": " + detail : ""));
    }
    return (await res.json()).reply;
  }

  async function llmGateway(messages) {
    var model = $model.value.trim() || "anthropic/claude-sonnet-4";
    var res = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + $key.value.trim(),
      },
      body: JSON.stringify({ model: model, max_tokens: 4000, messages: messages }),
    });
    if (!res.ok) throw new Error("Gateway " + res.status + ": " + (await res.text()).slice(0, 300));
    var data = await res.json();
    return data.choices[0].message.content;
  }

  function llm(messages, imagePath) {
    if (agentOnline) return llmLocal(messages, imagePath);
    if ($key.value.trim()) return llmGateway(messages);
    throw new Error(
      "Local agent offline and no fallback gateway key set. Start it with:\n" +
      "node \"" + path.join(extDir, "mcp", "server.js") + "\" --http 3845"
    );
  }

  function runInAE(code) {
    fs.writeFileSync(TMP, code, "utf8");
    return evalScript('FAM_runFile("' + TMP.replace(/\\/g, "\\\\") + '")');
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* Visual review: render a mid-animation frame, let the agent look at it.
   * Resolves to {verdict:"pass"} or {code:<fix script>}. Throws on failure —
   * callers treat review as best-effort. */
  async function visualReview(messages, ctx, code) {
    var framePath = path.join(extDir, "logs", "_frame.png");
    try { fs.unlinkSync(framePath); } catch (e) {}
    var at = "";
    try {
      var c = JSON.parse(ctx);
      if (c.comp) at = "," + (c.comp.time + 0.5);
    } catch (e) {}
    var r = await evalScript('FAM_saveFrame("' + framePath.replace(/\\/g, "\\\\") + '"' + at + ")");
    if (r !== "OK") throw new Error(r);
    var waited = 0;
    while (!fs.existsSync(framePath) && waited < 8000) { await sleep(200); waited += 200; }
    if (!fs.existsSync(framePath)) throw new Error("frame render timed out");

    var res = await fetchTimeout(agentUrl() + "/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.concat([{ role: "assistant", content: code }]),
        imagePath: framePath,
      }),
    }, 300000);
    if (!res.ok) {
      var detail = "";
      try { detail = (await res.json()).error || ""; } catch (e) {}
      throw new Error("Review " + res.status + (detail ? ": " + detail : ""));
    }
    return res.json();
  }

  function record(entry) {
    try { fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n"); } catch (e) {}
  }

  /* brand.md is static; learned.md grows via /distill — read it fresh each run. */
  function systemPrompt() {
    var learned = "";
    try { learned = fs.readFileSync(LEARNED_FILE, "utf8"); } catch (e) {}
    return learned.trim() ? BRAND + "\n\n" + learned.trim() : BRAND;
  }

  /* Fire-and-forget: let the agent distill a pitfall from a problem run. */
  function distill(entry) {
    fetchTimeout(agentUrl() + "/distill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry: entry }),
    }, 240000).catch(function () { /* best-effort */ });
  }

  /* Last few successful prompts from this project, so the model knows what
   * has already been applied and can ground follow-ups like "same on the logo". */
  function projectHistory(project, limit) {
    var items = [];
    try {
      var lines = fs.readFileSync(LOG_FILE, "utf8").trim().split("\n");
      for (var i = lines.length - 1; i >= 0 && items.length < limit; i--) {
        try {
          var e = JSON.parse(lines[i]);
          if (e.result === "OK" && e.prompt && (!project || e.project === project)) {
            items.unshift(e.prompt);
          }
        } catch (skip) {}
      }
    } catch (e) {}
    return items;
  }

  async function generate() {
    var prompt = $prompt.value.trim();
    if (!prompt) return;
    if (!agentOnline && !$key.value.trim()) {
      say("Local agent is offline and no fallback gateway key is set. Start the agent (node mcp/server.js --http 3845) or add a key in settings.", "err");
      return;
    }

    var mode = agentOnline ? "local" : "gateway";
    $send.disabled = true;
    say(prompt, "user");
    $prompt.value = "";
    var status = say("thinking…", "agent meta");

    try {
      var ctx = await evalScript("FAM_getContext()");
      var project = null;
      try { project = JSON.parse(ctx).project || null; } catch (e) {}
      var hist = projectHistory(project, 5);
      var histText = hist.length
        ? "\n\nEarlier successful runs in this project (already applied — don't redo unless asked):\n- " + hist.join("\n- ")
        : "";
      var messages = [
        { role: "system", content: systemPrompt() },
        { role: "user", content: "AE context:\n" + ctx + histText + "\n\nTask:\n" + prompt },
      ];

      // Snapshot the current frame so replies are visually grounded (best-effort).
      var framePath = null;
      if (agentOnline) {
        try {
          var fp = path.join(extDir, "logs", "_ctx.png");
          try { fs.unlinkSync(fp); } catch (e) {}
          if ((await evalScript('FAM_saveFrame("' + fp.replace(/\\/g, "\\\\") + '")')) === "OK") {
            var w = 0;
            while (!fs.existsSync(fp) && w < 4000) { await sleep(150); w += 150; }
            if (fs.existsSync(fp)) framePath = fp;
          }
        } catch (e) {}
      }

      var reply = await llm(messages, framePath);

      // RECOMMEND mode: the agent answers back instead of running a script.
      if (/^\s*SAY:/i.test(reply)) {
        say(reply.replace(/^\s*SAY:\s*/i, ""), "agent");
        status.textContent = "✓ recommendation — describe one to build it";
        status.className = "msg agent meta";
        record({ ts: Date.now(), source: "panel", mode: mode, project: project, prompt: prompt, context: ctx, result: "SAY" });
        $send.disabled = false;
        return;
      }

      var code = stripFences(reply);
      var result = "", attempt = 0, errors = [];

      while (true) {
        status.textContent = attempt === 0 ? "running in AE…" : "repairing (attempt " + attempt + ")…";
        result = await runInAE(code);
        if (result === "OK" || attempt >= MAX_REPAIRS) break;
        errors.push(result);
        messages.push({ role: "assistant", content: code });
        messages.push({
          role: "user",
          content: "That script failed inside After Effects with:\n" + result +
            "\nFix the root cause and reply with ONLY the corrected full script.",
        });
        code = stripFences(await llm(messages));
        attempt++;
      }

      // Visual review round (local agent only — the gateway can't see images).
      var review = "skipped";
      if (result === "OK" && agentOnline) {
        try {
          status.textContent = "reviewing the look…";
          var rev = await visualReview(messages, ctx, code);
          if (rev.verdict === "pass") {
            review = "pass";
          } else if (rev.code) {
            status.textContent = "applying visual fix…";
            var fixResult = await runInAE(rev.code);
            review = fixResult === "OK" ? "fixed" : "fix-failed: " + fixResult;
            if (fixResult === "OK") code += "\n\n// --- visual fix ---\n" + rev.code;
          }
        } catch (e) {
          review = "error: " + e.message; // best-effort — never blocks a done
        }
      }

      record({ ts: Date.now(), source: "panel", mode: mode, project: project, prompt: prompt, context: ctx, code: code, result: result, repairs: attempt, errors: errors, review: review });

      // Anything that didn't work first try is a lesson for the learning KB.
      if (mode === "local" && (attempt > 0 || review === "fixed" || result !== "OK")) {
        distill({ prompt: prompt, errors: errors, result: result, repairs: attempt, review: review, code: code });
      }
      status.textContent = result === "OK"
        ? "✓ done" +
          (attempt ? " (after " + attempt + " repair" + (attempt > 1 ? "s" : "") + ")" : "") +
          (review === "pass" ? " — visual pass" : review === "fixed" ? " — after a visual fix" : "")
        : "failed after " + attempt + " repair" + (attempt !== 1 ? "s" : "") + " — " + result;
      status.className = "msg " + (result === "OK" ? "agent ok" : "err");
    } catch (e) {
      status.textContent = "✗ " + e.message;
      status.className = "msg err";
      record({ ts: Date.now(), source: "panel", mode: mode, prompt: prompt, error: e.message });
    }
    $send.disabled = false;
  }

  $send.onclick = generate;
  $prompt.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
  });

  say("Fable-aM ready. Open a comp, describe what you want.", "agent meta");

  // Phase 5: surface pending self-upgrade proposals (never auto-applied).
  try {
    var pending = fs.readdirSync(path.join(extDir, "knowledge", "proposals"))
      .filter(function (f) { return /\.md$/.test(f); });
    if (pending.length) {
      say(pending.length + " self-upgrade proposal" + (pending.length > 1 ? "s" : "") +
        " pending — review knowledge/proposals/, apply with: npm run apply -- <file>", "agent meta");
    }
  } catch (e) { /* no proposals dir yet */ }
})();
