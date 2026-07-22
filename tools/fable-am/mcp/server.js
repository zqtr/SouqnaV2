/* Fable-aM MCP server — exposes After Effects to Claude as a connector.
 * Transports:
 *   node server.js              → stdio (Claude Code / Claude Desktop)
 *   node server.js --http 3845  → Streamable HTTP (claude.ai custom connector via tunnel)
 */
import fs from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { getContext, runScript, record, BRAND_MD, LEARNED_MD } from "./ae-bridge.js";
import { resolveClaude, runClaude, stripFences, serializeMessages } from "./claude-cli.js";

const LEARNED_HEADER = "# Learned pitfalls (auto-distilled from problem runs)\n";

async function readKnowledge() {
  let text = await fs.readFile(BRAND_MD, "utf8");
  try {
    const learned = await fs.readFile(LEARNED_MD, "utf8");
    if (learned.trim()) text += "\n\n" + learned.trim();
  } catch {
    /* no learned KB yet */
  }
  return text;
}

const text = (s) => ({ content: [{ type: "text", text: s }] });
const errText = (s) => ({ content: [{ type: "text", text: s }], isError: true });

function buildServer() {
  const server = new McpServer({ name: "fable-am", version: "0.1.0" });

  server.registerTool(
    "ae_brand_guide",
    {
      title: "Souqna brand guide",
      description:
        "The Souqna motion brand guide: palette, easing tokens, and crash-safe " +
        "After Effects scripting rules. Read this BEFORE writing any script " +
        "with ae_run_script — all generated motion must comply with it.",
      inputSchema: {},
    },
    async () => {
      try {
        return text(await readKnowledge());
      } catch (e) {
        return errText("Could not read brand guide: " + e.message);
      }
    }
  );

  server.registerTool(
    "ae_get_context",
    {
      title: "Snapshot the active comp",
      description:
        "Returns a JSON snapshot of the active After Effects composition: name, " +
        "size, duration, frame rate, current time, layer names, and the selected " +
        "layers (index, name, kind, in/out points). Call this before writing a " +
        'script so references like "this layer" resolve to real layer indices. ' +
        'Returns {"comp":null} if no comp is open.',
      inputSchema: {},
    },
    async () => {
      try {
        return text(await getContext());
      } catch (e) {
        return errText(e.message);
      }
    }
  );

  server.registerTool(
    "ae_run_script",
    {
      title: "Run ExtendScript in After Effects",
      description:
        "Executes ExtendScript (ES3) against the live After Effects project, " +
        'wrapped in a single undo group. Returns "OK" on success or ' +
        '"ERR: <message> @line <n>" on failure — on ERR, fix the root cause in ' +
        "the script and run it again (the failed run was still undo-grouped, so " +
        "partial changes may exist; prefer idempotent scripts). Follow the rules " +
        "from ae_brand_guide, and call ae_get_context first to target the right " +
        "comp and layers.",
      inputSchema: {
        code: z.string().describe("The full ExtendScript (ES3) source to execute."),
        description: z
          .string()
          .optional()
          .describe("One-line summary of what the script does (for the run log)."),
      },
    },
    async ({ code, description }) => {
      try {
        const result = await runScript(code);
        await record({
          ts: Date.now(),
          source: "mcp",
          prompt: description || null,
          code,
          result,
        });
        return result === "OK" ? text("OK") : errText(result);
      } catch (e) {
        await record({
          ts: Date.now(),
          source: "mcp",
          prompt: description || null,
          error: e.message,
        });
        return errText(e.message);
      }
    }
  );

  return server;
}

const args = process.argv.slice(2);
const httpIdx = args.indexOf("--http");

if (httpIdx === -1) {
  const server = buildServer();
  await server.connect(new StdioServerTransport());
  console.error("fable-am MCP server running on stdio");
} else {
  const port = Number(args[httpIdx + 1]) || 3845;
  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // CORS for the CEP panel only on /health and /agent (its origin varies by
  // CEP version). /mcp intentionally gets none — the panel never calls it.
  app.use(["/health", "/agent", "/review", "/distill"], (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.get("/health", async (_req, res) => {
    res.json({ ok: true, claude: !!(await resolveClaude()) });
  });

  app.post("/agent", async (req, res) => {
    const { messages, imagePath } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] required" });
    }
    const bin = await resolveClaude();
    if (!bin) {
      return res.status(503).json({
        error: "claude CLI not found — install Claude Code or set FAM_CLAUDE_BIN",
      });
    }
    let prompt = serializeMessages(messages);
    let extraArgs = ["--max-turns", "1"];
    if (typeof imagePath === "string" && imagePath) {
      try {
        await fs.access(imagePath);
        prompt +=
          "\n\nCurrent frame render of the comp: " + imagePath +
          "\nView it with the Read tool when visual judgment would help (recommendations, placement, critique).";
        extraArgs = ["--max-turns", "4", "--allowedTools", "Read"];
      } catch {
        /* frame missing — run text-only */
      }
    }
    try {
      const out = await runClaude(bin, prompt, { extraArgs });
      // Raw reply: the panel decides SAY vs script (shared logic with the
      // gateway fallback path).
      res.json({ reply: out.trim() });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  /* POST /review {messages, imagePath} → {verdict:"pass", note} | {code}
   * Visual review: Claude views the rendered frame (Read tool only) and
   * either passes it or returns a script that fixes the current state. */
  app.post("/review", async (req, res) => {
    const { messages, imagePath } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0 || typeof imagePath !== "string") {
      return res.status(400).json({ error: "messages[] and imagePath required" });
    }
    try {
      await fs.access(imagePath);
    } catch {
      return res.status(400).json({ error: "imagePath does not exist: " + imagePath });
    }
    const bin = await resolveClaude();
    if (!bin) {
      return res.status(503).json({
        error: "claude CLI not found — install Claude Code or set FAM_CLAUDE_BIN",
      });
    }
    const parts = messages.map((m) => `<${m.role}>\n${m.content}\n</${m.role}>`);
    parts.push(
      "You are reviewing the RESULT of the last script above, which has ALREADY " +
        "been applied to the composition. Use the Read tool to view the rendered " +
        "frame (captured mid-animation):\n" + imagePath + "\n\n" +
        "Judge it against the task and the brand rules (scale, placement relative " +
        "to the target, subtlety — calm, editorial, premium, never flashy).\n" +
        'If it looks right, reply with exactly "VERDICT: PASS" and nothing else.\n' +
        "If it does not, reply with ONLY a corrected full ExtendScript (ES3) that " +
        "FIXES the current state — modify or delete the layers the script created; " +
        "do NOT re-create them from scratch on top. No prose, no markdown fences."
    );
    try {
      const out = (
        await runClaude(bin, parts.join("\n\n"), {
          timeoutMs: 240_000,
          extraArgs: ["--max-turns", "4", "--allowedTools", "Read"],
        })
      ).trim();
      if (/^VERDICT:\s*PASS/i.test(out)) {
        res.json({ verdict: "pass" });
      } else {
        res.json({ code: stripFences(out) });
      }
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  // Stateless: one server+transport per request.
  app.post("/mcp", async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: e.message },
          id: null,
        });
      }
    }
  });

  /* POST /distill {entry} → {added} | {skipped}
   * Learning KB: distill one transferable pitfall from a problem run and
   * append it to knowledge/learned.md (dedup against existing rules). */
  app.post("/distill", async (req, res) => {
    const entry = req.body && req.body.entry;
    if (!entry || !entry.prompt) {
      return res.status(400).json({ error: "entry with prompt required" });
    }
    const bin = await resolveClaude();
    if (!bin) {
      return res.status(503).json({ error: "claude CLI not found" });
    }
    let learned = LEARNED_HEADER;
    try { learned = await fs.readFile(LEARNED_MD, "utf8"); } catch { /* first pitfall */ }
    if (learned.split("\n").length > 80) {
      return res.json({ skipped: "learned.md is full — consolidate it manually" });
    }
    let brand = "";
    try { brand = await fs.readFile(BRAND_MD, "utf8"); } catch { /* still distill */ }

    const prompt = [
      "Rules the generator already follows:\n<rules>\n" + brand + "\n\n" + learned + "\n</rules>",
      "A Fable-aM generation run had problems.",
      "Task prompt: " + entry.prompt,
      entry.errors && entry.errors.length
        ? "Errors before repair:\n" + entry.errors.join("\n") : "",
      entry.result && entry.result !== "OK"
        ? "Final result (still failing): " + entry.result : "",
      entry.review === "fixed"
        ? "The first working version LOOKED wrong; a visual-review fix was applied (appended at the end of the code)." : "",
      "Final code:\n" + String(entry.code || "").slice(0, 4000),
      'Distill ONE new, transferable pitfall rule that would have prevented this: a single markdown bullet starting with "- ", max 40 words, imperative, about scripting or visual craft — not about this specific comp. If the rules above already cover it, or the failure is too one-off to generalize, reply exactly SKIP.',
    ].filter(Boolean).join("\n\n");

    try {
      const out = (await runClaude(bin, prompt, { extraArgs: ["--max-turns", "1"] })).trim();
      if (/^SKIP\b/.test(out) || !/^- /.test(out)) {
        return res.json({ skipped: out.slice(0, 120) });
      }
      const bullet = out.split("\n")[0].trim();
      const base = learned.endsWith("\n") ? learned : learned + "\n";
      await fs.writeFile(LEARNED_MD, base + bullet + "\n");
      res.json({ added: bullet });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  const reject = (res) =>
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    });
  app.get("/mcp", (_req, res) => reject(res));
  app.delete("/mcp", (_req, res) => reject(res));

  app.listen(port, "127.0.0.1", () => {
    console.error(`fable-am MCP server listening on http://127.0.0.1:${port}/mcp`);
  });
}
