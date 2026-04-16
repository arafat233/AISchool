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
