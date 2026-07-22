# Fable-aM

Prompt-driven motion agent inside After Effects. Type what you want; it
generates brand-compliant ExtendScript, runs it against the live comp, and
auto-repairs its own AE errors (up to 2 retries).

## Install

```bash
./install.sh        # symlink into CEP extensions + enable PlayerDebugMode
```

Restart AE → **Window → Extensions → Fable-aM**.

## Setup

No API key needed. The panel generates code through the local Fable-aM agent
server (`mcp/server.js --http`), which runs the `claude` CLI on your Claude
subscription. The panel auto-starts the server if it isn't running; the dot
in the header shows the connection state:

- **green** — local agent online (generation via Claude Code, free with your plan)
- **red** — offline; if a Vercel AI Gateway key is set in settings, the panel
  falls back to it, otherwise generation is disabled

Settings (all optional, stored in panel localStorage): custom agent URL,
fallback gateway key, fallback gateway model.

```bash
cd mcp && npm install          # once
node server.js --http 3845     # manual start (panel normally does this itself)
```

## Use

- Open a comp, select layers if relevant, describe the task:
  - "gold hairline sweep across the selected layer, EASE_IN_OUT, 1.2s"
  - "animate the logo in with a blur-to-sharp entrance"
  - "make the background a drifting sand gradient"
- The panel snapshots comp + selection and sends it as context, so
  "this layer" works.
- Every run is appended to `logs/runs.jsonl` (prompt, code, result, repair
  count) — the training corpus for the Phase 3 learning KB.

## Claude Connector (MCP) — no API key needed

`mcp/` is an MCP server that exposes After Effects to Claude directly, so
Claude Code / Claude Desktop become the brain (on your Claude subscription)
instead of the panel calling an LLM gateway with an API key. It drives the
running AE app via AppleScript `DoScript` and reuses `jsx/host.jsx`, so the
CEP panel does not need to be open.

Tools: `ae_brand_guide` (Souqna rules), `ae_get_context` (comp/selection
snapshot), `ae_run_script` (undo-grouped ExtendScript, returns `OK` /
`ERR: … @line n` so Claude can self-repair). Runs log to `logs/runs.jsonl`
with `"source": "mcp"`.

```bash
cd mcp && npm install

# Claude Code (any project):
claude mcp add --scope user fable-am -- node "$(pwd)/server.js"

# Claude Desktop — add to claude_desktop_config.json:
#   "fable-am": { "command": "node", "args": ["<abs path>/mcp/server.js"] }

# claude.ai web custom connector (needs a public tunnel, e.g. ngrok):
node server.js --http 3845   # then expose http://127.0.0.1:3845/mcp
```

Requirements: AE must be running; macOS will ask once for Automation
permission (Terminal/Claude → After Effects); AE Preferences → Scripting &
Expressions → **Allow Scripts to Write Files and Access Network** must be on
(the bridge returns results through a temp file).

## Architecture

- `CSXS/manifest.xml` — CEP panel manifest (AE 2020+, CSXS 7+)
- `index.html` + `js/main.js` — panel UI + brain (local-first generation via
  the agent server, gateway fallback, repair loop, online/offline dot, logging)
- `jsx/host.jsx` — ExtendScript bridge: `FAM_runFile` (undo-grouped eval),
  `FAM_getContext` (comp/selection snapshot)
- `knowledge/brand.md` — system prompt: Souqna palette, easing tokens,
  crash-safe AE scripting rules
- `mcp/server.js` + `mcp/ae-bridge.js` — Claude Connector: MCP server
  (stdio + Streamable HTTP) bridging to AE via AppleScript `DoScript`

## Roadmap

- ~~Phase 2 — richer context (property-level reads), per-project history~~ ✓
  selected layers report transform, comp-space bounds, effects, and which
  properties are keyframed; the panel feeds the project's recent successful
  prompts into each generation
- ~~Phase 3 — learning KB distilled from runs.jsonl (auto-appended pitfalls)~~ ✓
  any run that needed a repair, failed, or took a visual fix is sent to
  `POST /distill`; the agent appends one transferable pitfall bullet to
  `knowledge/learned.md` (deduped against brand.md + existing bullets,
  capped at ~80 lines). Both the panel prompt and the MCP `ae_brand_guide`
  tool serve brand.md + learned.md
- ~~Phase 4 — visual review pass (frame render → critique → fix before "done")~~ ✓
  after a successful run the panel renders a mid-animation frame
  (`FAM_saveFrame`), the agent views it (`POST /review`, Read tool only) and
  either passes or returns a fix script that adjusts the applied state; one
  round, best-effort, local agent only
- ~~Phase 5 — supervised self-upgrade proposals~~ ✓
  `npm run propose` analyzes the run corpus against the knowledge files and
  writes evidence-backed upgrade proposals (new motif specs, rule fixes,
  learned→brand consolidation) to `knowledge/proposals/` — each with a
  rationale and an exact patch. Nothing is auto-applied: review, then
  `npm run apply -- <file>`. The panel notes pending proposals on load.
