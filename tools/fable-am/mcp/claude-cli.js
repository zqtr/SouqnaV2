/* Headless `claude` CLI plumbing shared by the agent server and the
 * propose/apply scripts. Generation runs on the user's Claude subscription —
 * no API key anywhere. */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

let claudeBin = null;

export async function resolveClaude() {
  if (claudeBin) return claudeBin;
  const candidates = [
    process.env.FAM_CLAUDE_BIN,
    path.join(os.homedir(), ".claude", "local", "claude"),
    path.join(os.homedir(), ".local", "bin", "claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      await fs.access(c, fs.constants ? fs.constants.X_OK : 1);
      claudeBin = c;
      return c;
    } catch {
      /* try next */
    }
  }
  // Last resort: ask a login shell, which has the user's full PATH.
  const found = await new Promise((resolve) => {
    const child = spawn("/bin/zsh", ["-lc", "command -v claude"], { timeout: 10_000 });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code === 0 ? out.trim() : null));
  });
  if (found) claudeBin = found;
  return claudeBin;
}

export const stripFences = (s) =>
  s.replace(/^\s*```[a-z]*\s*/i, "").replace(/\s*```\s*$/, "").trim();

export function serializeMessages(messages) {
  const parts = messages.map((m) => `<${m.role}>\n${m.content}\n</${m.role}>`);
  parts.push(
    "Follow the reply contract from the system message (SCRIPT or SAY:). Never wrap your reply in markdown fences."
  );
  return parts.join("\n\n");
}

export function runClaude(bin, prompt, { timeoutMs = 180_000, extraArgs = [] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      bin,
      [
        "-p",
        "--output-format", "text",
        // Don't load the user's MCP servers (which would include this very
        // server) into the headless run.
        "--strict-mcp-config",
        "--mcp-config", '{"mcpServers":{}}',
        ...extraArgs,
      ],
      // Neutral cwd so the run doesn't pick up any project's CLAUDE.md.
      { stdio: ["pipe", "pipe", "pipe"], cwd: os.tmpdir() }
    );
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`claude timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`claude exited ${code}: ${err.trim().slice(0, 300)}`));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}
