# AISchool — Claude Code Instructions

## 🚨 SESSION RESUME — READ THIS FIRST ON EVERY NEW SESSION

1. Read `/Users/Najeeb-CapOne/Desktop/AISchool/PROGRESS.md` — find first `[ ]` unchecked task
2. Read `/Users/Najeeb-CapOne/Desktop/AISchool/progress.json` — get current phase/module/task
3. Working directory is `/Users/Najeeb-CapOne/Desktop/AISchool/` — **all code AND vault live here**
4. Continue building from the first unchecked task — **no permission needed, full admin granted**
5. Before context runs out: commit all work, update checkboxes in PROGRESS.md, update progress.json, recalculate %

**pnpm path:** `export PNPM_HOME="/Users/Najeeb-CapOne/Library/pnpm" && export PATH="$PNPM_HOME:$PATH"`

This is a personal AI learning vault **and monorepo** — Obsidian notes, Claude Code, graphify knowledge graphs, and the School ERP codebase all live in one folder.

## Vault / Repo Layout

| Path | Purpose |
|---|---|
| `apps/` | NestJS microservices + Next.js portals |
| `packages/` | Shared packages (types, utils, config, ui, …) |
| `infrastructure/` | Nginx, Postgres init, Mosquitto configs |
| `.github/workflows/` | CI (lint+test) and CD (Docker build+push) |
| `raw/` | Drop papers, tweets, screenshots, notes — graphify processes this |
| `graphify-out/` | Generated graph outputs (graph.json, HTML, Obsidian vault) |
| `graphify-out/obsidian/` | Knowledge graph as Obsidian notes |
| `PROGRESS.md` | Build checklist (458 tasks, 6 phases) |
| `progress.json` | Machine-readable task tracker |

## graphify

Run `/graphify` with no arguments to process the `raw/` folder.
- Use `/graphify --update` after adding new files (skips already-processed files)
- Use `/graphify query "..."` to query the graph without re-running the pipeline
- Outputs land in `graphify-out/` — hidden folder, use `ls -la` to see it

## Obsidian Git

Auto-commits on every file change (1 min debounce). Pulls on boot. Push manually via the command palette (`Obsidian Git: Push`).

## Skills

- **graphify** (`~/.claude/skills/graphify/SKILL.md`) — any input → knowledge graph

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
