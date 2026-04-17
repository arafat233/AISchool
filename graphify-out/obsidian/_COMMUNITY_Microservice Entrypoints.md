---
type: community
cohesion: 0.11
members: 19
---

# Microservice Entrypoints

**Cohesion:** 0.11 - loosely connected
**Members:** 19 nodes

## Members
- [[.constructor()_22]] - code - apps/notification-service/src/notification/notification.module.ts
- [[.constructor()_24]] - code - apps/notification-service/src/processors/notification.processor.ts
- [[.log()]] - code - packages/logger/src/logger.service.ts
- [[.onModuleInit()_1]] - code - apps/notification-service/src/notification/notification.module.ts
- [[.startWorker()]] - code - apps/notification-service/src/processors/notification.processor.ts
- [[NotificationModule]] - code - apps/notification-service/src/notification/notification.module.ts
- [[NotificationProcessor]] - code - apps/notification-service/src/processors/notification.processor.ts
- [[bootstrap()]] - code - apps/academic-service/src/main.ts
- [[main()]] - code - packages/database/prisma/seed.ts
- [[main.ts_6]] - code - apps/academic-service/src/main.ts
- [[main.ts_1]] - code - apps/attendance-service/src/main.ts
- [[main.ts_5]] - code - apps/auth-service/src/main.ts
- [[main.ts_2]] - code - apps/fee-service/src/main.ts
- [[main.ts]] - code - apps/notification-service/src/main.ts
- [[main.ts_3]] - code - apps/student-service/src/main.ts
- [[main.ts_4]] - code - apps/user-service/src/main.ts
- [[notification.module.ts]] - code - apps/notification-service/src/notification/notification.module.ts
- [[notification.processor.ts]] - code - apps/notification-service/src/processors/notification.processor.ts
- [[seed.ts]] - code - packages/database/prisma/seed.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Microservice_Entrypoints
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Notification Adapters]]
- 1 edge to [[_COMMUNITY_Student Service & Crypto]]

## Top bridge nodes
- [[bootstrap()]] - degree 9, connects to 1 community
- [[.log()]] - degree 4, connects to 1 community