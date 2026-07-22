/* Phase 5 — supervised self-upgrade proposals.
 * Analyzes the run corpus (logs/runs.jsonl) against the current knowledge
 * files and writes 0-3 upgrade proposals to knowledge/proposals/.
 * Nothing is applied automatically — review a proposal, then apply it with:
 *   npm run apply -- knowledge/proposals/<file>.md
 */
import fs from "node:fs/promises";
import path from "node:path";
import { BRAND_MD, LEARNED_MD, LOG_FILE } from "./ae-bridge.js";
import { resolveClaude, runClaude, stripFences } from "./claude-cli.js";

const PROPOSALS_DIR = path.join(path.dirname(BRAND_MD), "proposals");

function compactEntry(e) {
  const c = {
    prompt: e.prompt || null,
    source: e.source || null,
    result: e.result || (e.error ? "ERR(panel): " + e.error : null),
    repairs: e.repairs || 0,
    review: e.review || null,
  };
  if (e.errors && e.errors.length) c.firstError = e.errors[0];
  return c;
}

const raw = await fs.readFile(LOG_FILE, "utf8").catch(() => "");
const entries = raw.trim().split("\n").filter(Boolean).map((l) => {
  try { return JSON.parse(l); } catch { return null; }
}).filter(Boolean);
const recent = entries.slice(-60);
const compact = recent.map(compactEntry);
const problems = recent
  .filter((e) => (e.repairs && e.repairs > 0) || e.review === "fixed" ||
    (e.result && e.result !== "OK") || e.error)
  .slice(-5)
  .map((e) => ({
    prompt: e.prompt,
    errors: e.errors || (e.error ? [e.error] : []),
    review: e.review || null,
    code: String(e.code || "").slice(0, 1500),
  }));

const brand = await fs.readFile(BRAND_MD, "utf8");
const learned = await fs.readFile(LEARNED_MD, "utf8").catch(() => "");

const bin = await resolveClaude();
if (!bin) {
  console.error("claude CLI not found — install Claude Code or set FAM_CLAUDE_BIN");
  process.exit(1);
}

const prompt = [
  "You are the supervisor of Fable-aM, an After Effects motion agent. Its behavior is driven by two knowledge files that you may propose upgrades to. A human reviews and applies every proposal — be conservative and evidence-driven.",
  "<brand.md>\n" + brand + "\n</brand.md>",
  learned.trim() ? "<learned.md>\n" + learned + "\n</learned.md>" : "learned.md is empty.",
  "Recent runs (compact):\n" + JSON.stringify(compact, null, 1),
  problems.length ? "Recent problem runs (detail):\n" + JSON.stringify(problems, null, 1) : "",
  "Look for SYSTEMIC issues backed by the evidence above: recurring prompt patterns with no motif spec; rules that repeatedly fail or get overridden; learned.md bullets mature enough to consolidate into brand.md (propose the brand.md edit AND the learned.md bullet removal as one proposal when so); contradictions between rules.",
  'Reply with ONLY a JSON array of 0-3 proposals (empty array if the evidence is too thin — that is a good answer). Each: {"title": "...", "rationale": "2-4 sentences citing the evidence", "file": "brand.md"|"learned.md", "find": "<exact existing text to replace, or empty string to append>", "replace": "<new text>"}. "find" must be copied verbatim from the file. No markdown fences.',
].filter(Boolean).join("\n\n");

console.log(`Analyzing ${recent.length} runs (${problems.length} with problems)…`);
const out = stripFences((await runClaude(bin, prompt, {
  timeoutMs: 300_000,
  extraArgs: ["--max-turns", "1"],
})).trim());

let proposals;
try {
  proposals = JSON.parse(out);
  if (!Array.isArray(proposals)) throw new Error("not an array");
} catch (e) {
  console.error("Could not parse proposals JSON:", e.message);
  console.error(out.slice(0, 500));
  process.exit(1);
}

if (proposals.length === 0) {
  console.log("No upgrade proposals — current knowledge holds up against the corpus.");
  process.exit(0);
}

await fs.mkdir(PROPOSALS_DIR, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
let n = 0;
for (const p of proposals) {
  if (!p.title || !p.file || typeof p.replace !== "string") continue;
  const target = p.file === "learned.md" ? learned : brand;
  if (p.find && !target.includes(p.find)) {
    console.warn(`skipped "${p.title}" — its find-text is not present in ${p.file}`);
    continue;
  }
  n++;
  const slug = p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const file = path.join(PROPOSALS_DIR, `${stamp}-${slug}.md`);
  const body = [
    `# Proposal: ${p.title}`,
    `status: pending · proposed: ${new Date().toISOString()}`,
    "",
    "## Rationale",
    p.rationale || "(none given)",
    "",
    "## Patch (applied by apply-proposal.js — do not edit by hand)",
    "```json",
    JSON.stringify({ title: p.title, file: p.file, find: p.find || "", replace: p.replace }, null, 2),
    "```",
    "",
    `Apply with: npm run apply -- "${file}"`,
  ].join("\n");
  await fs.writeFile(file, body + "\n");
  console.log(`wrote ${file}`);
}
console.log(`${n} proposal${n === 1 ? "" : "s"} pending review.`);
