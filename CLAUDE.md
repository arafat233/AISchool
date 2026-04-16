# AISchool — Claude Code Instructions

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
