# Graph Report - .  (2026-04-16)

## Corpus Check
- Corpus is ~157 words - fits in a single context window. You may not need a graph.

## Summary
- 11 nodes · 15 edges · 3 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Claude & graphify Workflow|Claude & graphify Workflow]]
- [[_COMMUNITY_Obsidian Vault & Sync|Obsidian Vault & Sync]]
- [[_COMMUNITY_graphify Outputs|graphify Outputs]]

## God Nodes (most connected - your core abstractions)
1. `AISchool Claude Code Instructions` - 6 edges
2. `graphify-out/ Folder` - 5 edges
3. `graphify Skill` - 5 edges
4. `graphify-out/obsidian/ Folder` - 3 edges
5. `Obsidian` - 3 edges
6. `raw/ Folder` - 2 edges
7. `Claude Code` - 2 edges
8. `~/.claude/skills/graphify/SKILL.md` - 1 edges
9. `Obsidian Git Plugin` - 1 edges
10. `graph.json Output` - 1 edges

## Surprising Connections (you probably didn't know these)
- `AISchool Claude Code Instructions` --references--> `graphify-out/ Folder`  [EXTRACTED]
  CLAUDE.md → CLAUDE.md  _Bridges community 0 → community 2_
- `AISchool Claude Code Instructions` --references--> `graphify-out/obsidian/ Folder`  [EXTRACTED]
  CLAUDE.md → CLAUDE.md  _Bridges community 0 → community 1_
- `graphify-out/ Folder` --references--> `graphify-out/obsidian/ Folder`  [EXTRACTED]
  CLAUDE.md → CLAUDE.md  _Bridges community 2 → community 1_

## Communities

### Community 0 - "Claude & graphify Workflow"
Cohesion: 0.6
Nodes (5): AISchool Claude Code Instructions, Claude Code, graphify Skill, ~/.claude/skills/graphify/SKILL.md, raw/ Folder

### Community 1 - "Obsidian Vault & Sync"
Cohesion: 0.67
Nodes (3): Obsidian, Obsidian Git Plugin, graphify-out/obsidian/ Folder

### Community 2 - "graphify Outputs"
Cohesion: 0.67
Nodes (3): graph.json Output, GRAPH_REPORT.md Output, graphify-out/ Folder

## Knowledge Gaps
- **4 isolated node(s):** `~/.claude/skills/graphify/SKILL.md`, `Obsidian Git Plugin`, `graph.json Output`, `GRAPH_REPORT.md Output`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `graphify-out/ Folder` connect `graphify Outputs` to `Claude & graphify Workflow`, `Obsidian Vault & Sync`?**
  _High betweenness centrality (0.400) - this node is a cross-community bridge._
- **Why does `AISchool Claude Code Instructions` connect `Claude & graphify Workflow` to `Obsidian Vault & Sync`, `graphify Outputs`?**
  _High betweenness centrality (0.389) - this node is a cross-community bridge._
- **Why does `graphify Skill` connect `Claude & graphify Workflow` to `graphify Outputs`?**
  _High betweenness centrality (0.278) - this node is a cross-community bridge._
- **What connects `~/.claude/skills/graphify/SKILL.md`, `Obsidian Git Plugin`, `graph.json Output` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._