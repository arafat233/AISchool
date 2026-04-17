---
type: community
cohesion: 0.50
members: 4
---

# Test Database Setup

**Cohesion:** 0.50 - moderately connected
**Members:** 4 nodes

## Members
- [[cleanupTestDb()]] - code - packages/testing/src/db-setup.ts
- [[db-setup.ts]] - code - packages/testing/src/db-setup.ts
- [[disconnectTestDb()]] - code - packages/testing/src/db-setup.ts
- [[getTestPrisma()]] - code - packages/testing/src/db-setup.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Test_Database_Setup
SORT file.name ASC
```
