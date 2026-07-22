/* AppleScript bridge into a running After Effects instance.
 * Reuses jsx/host.jsx (FAM_runFile / FAM_getContext) as the single source of
 * truth: each call evalFiles host.jsx, runs one expression, and writes the
 * result to a temp file that we poll — DoScript itself returns nothing.
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

// AE 2026+ uses "com.adobe.AfterEffects.application"; 2025 and earlier use
// "com.adobe.AfterEffects". Probe both, cache whichever exists.
const AE_BUNDLE_IDS = ["com.adobe.AfterEffects.application", "com.adobe.AfterEffects"];
let aeBundleId = null;
const EXT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const HOST_JSX = path.join(EXT_DIR, "jsx", "host.jsx");
export const BRAND_MD = path.join(EXT_DIR, "knowledge", "brand.md");
export const LEARNED_MD = path.join(EXT_DIR, "knowledge", "learned.md");
export const LOG_FILE = path.join(EXT_DIR, "logs", "runs.jsonl");

// ExtendScript and AppleScript both accept JSON-style \" and \\ escapes.
const q = (s) => JSON.stringify(s);

function osascript(script) {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], { timeout: 15_000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr.trim() || err.message));
      else resolve(stdout.trim());
    });
  });
}

async function resolveAeBundleId() {
  if (aeBundleId) return aeBundleId;
  for (const id of AE_BUNDLE_IDS) {
    const out = await osascript(`exists application id ${q(id)}`).catch(() => "false");
    if (out === "true") {
      aeBundleId = id;
      return id;
    }
  }
  throw new Error(
    "After Effects does not appear to be installed (no app with a known " +
      "After Effects bundle identifier was found)."
  );
}

export async function aeIsRunning() {
  const id = await resolveAeBundleId();
  const out = await osascript(`running of application id ${q(id)}`);
  return out === "true";
}

/* Run `bodyExpr` (an ExtendScript expression, evaluated after host.jsx is
 * loaded) inside AE and return its string result. */
async function evalInAE(bodyExpr, timeoutMs) {
  if (!(await aeIsRunning())) {
    throw new Error(
      "After Effects is not running. Open After Effects (with your project) and try again."
    );
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "fam-mcp-"));
  const resultPath = path.join(workDir, "result.txt");
  const donePath = path.join(workDir, "result.done");
  const wrapperPath = path.join(workDir, "wrapper.jsx");

  const wrapper = `(function () {
  var __r;
  try {
    $.evalFile(new File(${q(HOST_JSX)}));
    __r = ${bodyExpr};
  } catch (e) {
    __r = "ERR: " + e.toString() + (e.line ? " @line " + e.line : "");
  }
  var f = new File(${q(resultPath)});
  f.encoding = "UTF-8";
  f.open("w");
  f.write(String(__r));
  f.close();
  var d = new File(${q(donePath)});
  d.open("w");
  d.write("1");
  d.close();
})();`;
  await fs.writeFile(wrapperPath, wrapper, "utf8");

  const doScript = `$.evalFile(new File(${q(wrapperPath)}))`;
  // JSON.stringify's quote/backslash escaping is valid inside an AppleScript
  // string literal, so reuse it for the embedded ExtendScript source.
  await osascript(`tell application id ${q(aeBundleId)} to DoScript ${q(doScript)}`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fs.access(donePath);
      const result = await fs.readFile(resultPath, "utf8");
      await fs.rm(workDir, { recursive: true, force: true });
      return result;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  await fs.rm(workDir, { recursive: true, force: true });
  throw new Error(`Timed out after ${timeoutMs / 1000}s waiting for After Effects.`);
}

/* Snapshot of the active comp + selection, as a JSON string. */
export function getContext({ timeoutMs = 30_000 } = {}) {
  return evalInAE("FAM_getContext()", timeoutMs);
}

/* Execute ExtendScript inside an undo group. Resolves to "OK" or "ERR: ...". */
export async function runScript(code, { timeoutMs = 120_000 } = {}) {
  const payloadPath = path.join(
    os.tmpdir(),
    `fam-mcp-payload-${crypto.randomUUID()}.jsx`
  );
  await fs.writeFile(payloadPath, code, "utf8");
  try {
    return await evalInAE(`FAM_runFile(${q(payloadPath)})`, timeoutMs);
  } finally {
    await fs.rm(payloadPath, { force: true });
  }
}

export async function record(entry) {
  try {
    await fs.appendFile(LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {
    /* logging is best-effort */
  }
}
