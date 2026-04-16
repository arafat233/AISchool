# AISchool — Claude Code Instructions

## 🚨 SESSION RESUME — READ THIS FIRST ON EVERY NEW SESSION

1. Read `/Users/Najeeb-CapOne/Desktop/AISchool/PROGRESS.md` — find first `[ ]` unchecked task
2. Read `/Users/Najeeb-CapOne/Desktop/AISchool/progress.json` — get current phase/module/task
3. `cd /Users/Najeeb-CapOne/Desktop/school-erp/` — all code lives here
4. Continue building from the first unchecked task — **no permission needed, full admin granted**
5. Before context runs out: commit all work, update checkboxes in PROGRESS.md, update progress.json, recalculate %

**pnpm path:** `export PNPM_HOME="/Users/Najeeb-CapOne/Library/pnpm" && export PATH="$PNPM_HOME:$PATH"`

This is a personal AI learning vault combining Obsidian (notes), Claude Code, and graphify (knowledge graphs).

## Vault Layout

| Path | Purpose |
|---|---|
| `raw/` | Drop papers, tweets, screenshots, notes, code here — graphify processes this |
| `graphify-out/` | Generated outputs (graph.json, GRAPH_REPORT.md, obsidian vault, HTML) |
| `graphify-out/obsidian/` | Knowledge graph as Obsidian notes — open as a vault in Obsidian |

## graphify

Run `/graphify` with no arguments to process the `raw/` folder.
- Use `/graphify --update` after adding new files (skips already-processed files)
- Use `/graphify query "..."` to query the graph without re-running the pipeline
- Outputs land in `graphify-out/` — hidden folder, use `ls -la` to see it

## Obsidian Git

Auto-commits on every file change (1 min debounce). Pulls on boot. Push manually via the command palette (`Obsidian Git: Push`).

## Skills

- **graphify** (`~/.claude/skills/graphify/SKILL.md`) — any input → knowledge graph
