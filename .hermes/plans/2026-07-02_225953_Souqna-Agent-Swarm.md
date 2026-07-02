# Souqna Multi-Agent Swarm Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. All work stays in plan mode until explicitly approved for execution.

**Goal:** Create and operate a large-scale, coordinated swarm of specialized agents (Hermes Agent, Claude Code, Codex, and fable-5/Claude variants) focused exclusively on Souqna development, with strict isolation, parallel execution, and high throughput on Builder, Souqy Studio, storefront, apps, and Arabic/RTL quality.

**Architecture:** 
- Central Hermes orchestrator (this session) stays in plan mode and dispatches via `delegate_task` + external CLI spawning.
- Workers use git worktrees for parallel changes without conflicts.
- Coordination via `.hermes/kanban` board + shared `AGENTS.md` rules + per-agent CLAUDE.md.
- Model specialization: Hermes (orchestration + memory), Claude Code (deep refactors + reviews), Codex (feature implementation), fable-5 (creative/high-reasoning subtasks).
- Safety: All agents default to plan mode or `--permission-mode plan`; no direct production writes without human + review gate.

**Tech Stack & Tools:**
- Souqna: Next.js 14 App Router, TypeScript, Tailwind v4, Clerk, Neon SQL, Vercel.
- Agent CLIs: `claude` (Claude Code), `codex`, `hermes`, fable-5 via Anthropic model flag.
- Coordination: `delegate_task`, tmux for PTY sessions, git worktrees, kanban.

---

## Phase 0: Prerequisites & Safety Setup

### Task 0.1: Verify agent CLIs are available

**Objective:** Confirm all four agent types can be invoked.

**Files:**
- Check: `which claude`, `which codex`, `hermes --version`

**Step 1:** Run health checks
```bash
claude --version
codex --version || echo "codex not in PATH"
hermes doctor
claude auth status
```

**Expected:** All report healthy versions and auth.

### Task 0.2: Create swarm workspace structure

**Objective:** Establish isolated directories and coordination files.

**Files:**
- Create: `.hermes/swarm/`
- Create: `.hermes/swarm/worktrees/`
- Create: `.hermes/swarm/boards/`
- Modify: `AGENTS.md` (add swarm section if missing)

**Step 1:** Create directories
```bash
mkdir -p .hermes/swarm/{worktrees,boards,logs,contexts}
```

**Step 2:** Add swarm rules to AGENTS.md
Add a new section at the top of `AGENTS.md`:
```markdown
## Swarm Mode (Multi-Agent)
- All agents must load `AGENTS.md` + this swarm section.
- Default to plan mode.
- Use worktrees under `.hermes/swarm/worktrees/`.
- Report progress to kanban board.
- Never touch production data or billing without explicit approval.
```

---

## Phase 1: Coordination Layer

### Task 1.1: Initialize Kanban board for swarm

**Objective:** Set up durable multi-agent task queue.

**Files:**
- Use Hermes kanban commands

**Step 1:** Initialize board
```bash
hermes kanban init --name souqna-swarm
```

**Step 2:** Create initial lanes
- `backlog`
- `in-progress`
- `review`
- `done`
- `blocked`

### Task 1.2: Create shared swarm context files

**Objective:** Give every agent consistent Souqna + swarm rules.

**Files:**
- Create: `.hermes/swarm/contexts/souqna-core.md` (extract key sections from AGENTS.md + MEMORY)
- Create: `.hermes/swarm/contexts/swarm-rules.md`

**Content for swarm-rules.md:**
```markdown
# Swarm Rules
- Stay in plan mode unless human explicitly says "execute".
- Every task must have a corresponding kanban card.
- Use worktree per major feature.
- Report status every 15 minutes via kanban comment.
- Fable-5 agents focus on creative generation and high-reasoning analysis.
- Claude Code agents handle complex refactors and security reviews.
- Codex agents implement features and write tests.
- Hermes agents orchestrate and maintain persistent memory.
```

---

## Phase 2: Agent Spawning Patterns

### Task 2.1: Define spawning templates for each agent type

**Objective:** Create reusable terminal commands / scripts for launching each agent type with correct flags.

**Files:**
- Create: `.hermes/swarm/spawn/`

**Spawn patterns (document in plan, implement as shell snippets later):**

**Hermes subagent (via delegate_task):**
```json
{
  "goal": "...",
  "context": "Load AGENTS.md + .hermes/swarm/contexts/*",
  "role": "leaf",
  "background": true
}
```

**Claude Code (tmux + plan mode):**
```bash
tmux new-session -d -s claude-souqna-01 -x 140 -y 50
tmux send-keys -t claude-souqna-01 'cd /Users/abm/Desktop/SouqnaV2 && claude --permission-mode plan --model claude-sonnet-4-6' Enter
```

**Codex:**
```bash
codex exec --full-auto '...' --workdir /path/to/worktree
```

**Fable-5 (via claude with specific model flag if available):**
```bash
claude -p '...' --model fable-5   # or whatever the exact alias is
```

### Task 2.2: Create worktree helper

**Objective:** Safe parallel git work for swarm.

**Files:**
- Create: `.hermes/swarm/scripts/create-worktree.sh`

**Step 1:** Script content (to be written in plan execution phase)
```bash
#!/bin/bash
BRANCH=$1
WT_NAME=$2
git worktree add -b "swarm/$BRANCH" ".hermes/swarm/worktrees/$WT_NAME" main
```

---

## Phase 3: Role Specialization & Division of Labor

### Task 3.1: Define agent personas

**Hermes Agents (orchestrators):**
- Dispatch tasks
- Maintain memory and kanban
- Aggregate results
- Handle long-running cron-style monitoring

**Claude Code Agents:**
- Deep code reviews
- Large-scale refactors
- Security & performance analysis
- Souqy Studio and Builder work

**Codex Agents:**
- Feature implementation
- Test writing (TDD)
- Marketplace apps and integrations
- Storefront block development

**Fable-5 Agents:**
- High-creativity tasks (new Souqy prompts, narrative content, design system experiments)
- Complex reasoning on ambiguous requirements
- Arabic/RTL linguistic quality review

### Task 3.2: Initial swarm composition (10+ agents)

**Objective:** Launch first wave of parallel workers.

**Suggested initial swarm:**
- 2× Hermes orchestrators (one for backlog, one for review)
- 3× Claude Code (Builder + Souqy + reviews)
- 3× Codex (features + tests)
- 2× Fable-5 (creative + Arabic quality)

**Step 1:** Document launch sequence in the plan (no actual launch yet).

---

## Phase 4: Souqna-Specific Focus Areas

Map high-priority Souqna surfaces to agent types:

- **Souqy Studio** (`src/components/sections/begin/souqy-studio/`, `src/lib/souqy/`, `src/app/actions/souqyStudio.ts`): Claude Code + Fable-5
- **Builder** (`src/app/account/builder/`, `src/components/builder/`): Claude Code
- **Storefront blocks** (`src/components/storefront/blocks/`): Codex
- **Apps marketplace & integrations** (`src/lib/apps/`): Codex + Hermes
- **Arabic/RTL & localization**: Fable-5 + Hermes
- **Auth, payments, orders** (high risk): Claude Code review only, no direct changes

All agents must respect the "Don't do" list in AGENTS.md.

---

## Phase 5: Monitoring, Cost Control & Safety

### Task 5.1: Monitoring setup

- tmux sessions for interactive agents
- `process` tool polling for background Codex/Hermes
- Kanban `tail` and `stats`
- Cost tracking via `/cost` or model usage logs

### Task 5.2: Guardrails

- All agents start with `--permission-mode plan` or equivalent
- `--max-turns 15` for print-mode tasks
- `--max-budget-usd` caps where supported
- Secret redaction and PII rules enforced
- No agent may run `git push`, deploy, or touch `.env` without explicit human approval

### Task 5.3: Fable-5 specific handling

Since the user previously disliked fable-5 as primary model, the plan must include:
- Fable-5 only used for narrow creative/high-reasoning subtasks
- Always paired with a review agent (Claude Code or Hermes)
- Explicit opt-in per task

---

## Open Questions & Risks

- Exact model alias for "fable 5" in Claude Code / Anthropic CLI?
- Current auth state for Codex and Claude Code in this environment?
- Desired concurrency limit (delegation.max_concurrent_children)?
- Preferred coordination UI (kanban vs shared markdown board vs custom dashboard)?

**Risks:**
- High token/cost burn with 10+ agents
- Context window degradation in long-running swarm sessions
- Git worktree merge conflicts if coordination is weak
- fable-5 quality variability (hence review requirement)

---

## Next Step After This Plan

Once this plan is reviewed and approved, the user can say:

> "Execute Phase 0 and Phase 1 only"

Or request a refined version focused on a specific Souqna surface first.

This plan is deliberately high-level on the swarm infrastructure so that the actual implementation can be broken into many small, verifiable tasks using the subagent-driven-development workflow.