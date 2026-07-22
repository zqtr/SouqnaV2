/* Apply a reviewed self-upgrade proposal (the supervised half of Phase 5).
 *   npm run apply -- knowledge/proposals/<file>.md
 * Applies the proposal's patch to brand.md / learned.md and moves the
 * proposal to knowledge/proposals/applied/.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { BRAND_MD, LEARNED_MD } from "./ae-bridge.js";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node apply-proposal.js <proposal.md>");
  process.exit(1);
}
const file = path.resolve(arg);
const raw = await fs.readFile(file, "utf8");
const m = raw.match(/```json\n([\s\S]*?)\n```/);
if (!m) {
  console.error("No patch block found in " + file);
  process.exit(1);
}
const p = JSON.parse(m[1]);
const target = p.file === "learned.md" ? LEARNED_MD : BRAND_MD;
let content = await fs.readFile(target, "utf8").catch(() => "");

if (p.find) {
  const occurrences = content.split(p.find).length - 1;
  if (occurrences !== 1) {
    console.error(`find-text matched ${occurrences} times in ${p.file} (need exactly 1) — ${p.file} may have changed since the proposal. Aborting.`);
    process.exit(1);
  }
  content = content.replace(p.find, p.replace);
} else {
  content = content.trimEnd() + "\n\n" + p.replace.trim() + "\n";
}
await fs.writeFile(target, content);

const appliedDir = path.join(path.dirname(file), "applied");
await fs.mkdir(appliedDir, { recursive: true });
await fs.rename(file, path.join(appliedDir, path.basename(file)));
console.log(`Applied "${p.title}" to ${p.file}. Proposal archived to proposals/applied/.`);
