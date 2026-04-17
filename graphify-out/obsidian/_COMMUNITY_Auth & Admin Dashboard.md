---
type: community
cohesion: 0.05
members: 42
---

# Auth & Admin Dashboard

**Cohesion:** 0.05 - loosely connected
**Members:** 42 nodes

## Members
- [[.constructor()_35]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.constructor()_36]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.constructor()_38]] - code - apps/auth-service/src/strategies/local.strategy.ts
- [[.forgotPassword()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.forgotPassword()_1]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.generateCurrentToken()]] - code - apps/auth-service/src/auth/totp.service.ts
- [[.generateSecret()]] - code - apps/auth-service/src/auth/totp.service.ts
- [[.getMe()_1]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.googleAuth()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.googleCallback()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.handleOAuthLogin()]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.issuer()]] - code - apps/auth-service/src/auth/totp.service.ts
- [[.login()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.login()_1]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.logout()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.logout()_1]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.microsoftAuth()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.microsoftCallback()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.refresh()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.refreshTokens()]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.register()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.register()_1]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.resetPassword()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.resetPassword()_1]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.setupTotp()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[.setupTotp()_1]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.validate()_2]] - code - apps/auth-service/src/strategies/local.strategy.ts
- [[.validateLocalUser()]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.verify()]] - code - apps/auth-service/src/auth/totp.service.ts
- [[.verifyAndEnableTotp()]] - code - apps/auth-service/src/auth/auth.service.ts
- [[.verifyTotp()]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[AddStudentModal()]] - code - apps/admin-portal/src/app/(dashboard)/students/page.tsx
- [[AuthController]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[AuthService]] - code - apps/auth-service/src/auth/auth.service.ts
- [[LocalStrategy]] - code - apps/auth-service/src/strategies/local.strategy.ts
- [[TotpService]] - code - apps/auth-service/src/auth/totp.service.ts
- [[auth.controller.ts]] - code - apps/auth-service/src/auth/auth.controller.ts
- [[auth.service.ts]] - code - apps/auth-service/src/auth/auth.service.ts
- [[handleBulkUpload()]] - code - apps/admin-portal/src/app/(dashboard)/students/page.tsx
- [[local.strategy.ts]] - code - apps/auth-service/src/strategies/local.strategy.ts
- [[page.tsx_6]] - code - apps/admin-portal/src/app/(dashboard)/students/page.tsx
- [[totp.service.ts]] - code - apps/auth-service/src/auth/totp.service.ts

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Auth_&_Admin_Dashboard
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_Student Service & Crypto]]
- 4 edges to [[_COMMUNITY_User Management Service]]

## Top bridge nodes
- [[.forgotPassword()_1]] - degree 3, connects to 2 communities
- [[.handleOAuthLogin()]] - degree 4, connects to 1 community
- [[.login()_1]] - degree 4, connects to 1 community
- [[.verifyAndEnableTotp()]] - degree 4, connects to 1 community
- [[.register()_1]] - degree 3, connects to 1 community