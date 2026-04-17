# Graph Report - .  (2026-04-17)

## Corpus Check
- Corpus is ~25,726 words - fits in a single context window. You may not need a graph.

## Summary
- 509 nodes · 496 edges · 100 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Admin Dashboard|Auth & Admin Dashboard]]
- [[_COMMUNITY_Fee & Payment Service|Fee & Payment Service]]
- [[_COMMUNITY_Academic Service|Academic Service]]
- [[_COMMUNITY_Monorepo & Infra Docs|Monorepo & Infra Docs]]
- [[_COMMUNITY_Notification Adapters|Notification Adapters]]
- [[_COMMUNITY_Student Service & Crypto|Student Service & Crypto]]
- [[_COMMUNITY_User Management Service|User Management Service]]
- [[_COMMUNITY_Notification Service Core|Notification Service Core]]
- [[_COMMUNITY_Microservice Entrypoints|Microservice Entrypoints]]
- [[_COMMUNITY_Auth Error Types|Auth Error Types]]
- [[_COMMUNITY_Attendance Service|Attendance Service]]
- [[_COMMUNITY_Student Controller|Student Controller]]
- [[_COMMUNITY_Domain Error Types|Domain Error Types]]
- [[_COMMUNITY_JWT Auth Strategies|JWT Auth Strategies]]
- [[_COMMUNITY_String Utilities|String Utilities]]
- [[_COMMUNITY_NestJS App Modules|NestJS App Modules]]
- [[_COMMUNITY_HTTP Error Types|HTTP Error Types]]
- [[_COMMUNITY_Prisma Database Layer|Prisma Database Layer]]
- [[_COMMUNITY_Date Utilities|Date Utilities]]
- [[_COMMUNITY_Test Database Setup|Test Database Setup]]
- [[_COMMUNITY_Base Error Class|Base Error Class]]
- [[_COMMUNITY_Admin Auth Hooks|Admin Auth Hooks]]
- [[_COMMUNITY_Admin Portal Utils|Admin Portal Utils]]
- [[_COMMUNITY_Google OAuth Strategy|Google OAuth Strategy]]
- [[_COMMUNITY_Microsoft OAuth Strategy|Microsoft OAuth Strategy]]
- [[_COMMUNITY_Health Check|Health Check]]
- [[_COMMUNITY_Roles Auth Guard|Roles Auth Guard]]
- [[_COMMUNITY_JWT Auth Guard|JWT Auth Guard]]
- [[_COMMUNITY_Plan Auth Guard|Plan Auth Guard]]
- [[_COMMUNITY_Bulk Attendance DTO|Bulk Attendance DTO]]
- [[_COMMUNITY_Student Promotion DTO|Student Promotion DTO]]
- [[_COMMUNITY_UI Spinner Component|UI Spinner Component]]
- [[_COMMUNITY_CN Utility|CN Utility]]
- [[_COMMUNITY_Prisma Module|Prisma Module]]
- [[_COMMUNITY_Base Config|Base Config]]
- [[_COMMUNITY_Attendance Module|Attendance Module]]
- [[_COMMUNITY_Session Creation DTO|Session Creation DTO]]
- [[_COMMUNITY_Admin Root Layout|Admin Root Layout]]
- [[_COMMUNITY_Admin Home Page|Admin Home Page]]
- [[_COMMUNITY_Admin Providers|Admin Providers]]
- [[_COMMUNITY_Dashboard Layout|Dashboard Layout]]
- [[_COMMUNITY_Classes Page|Classes Page]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_Admin Header|Admin Header]]
- [[_COMMUNITY_Admin API Client|Admin API Client]]
- [[_COMMUNITY_Fee Module|Fee Module]]
- [[_COMMUNITY_Create Student DTO|Create Student DTO]]
- [[_COMMUNITY_Link Parent DTO|Link Parent DTO]]
- [[_COMMUNITY_List Students Query DTO|List Students Query DTO]]
- [[_COMMUNITY_Update Student DTO|Update Student DTO]]
- [[_COMMUNITY_Student Module|Student Module]]
- [[_COMMUNITY_List Users Query DTO|List Users Query DTO]]
- [[_COMMUNITY_Update User DTO|Update User DTO]]
- [[_COMMUNITY_Assign Role DTO|Assign Role DTO]]
- [[_COMMUNITY_User Module|User Module]]
- [[_COMMUNITY_TOTP Verify DTO|TOTP Verify DTO]]
- [[_COMMUNITY_Login DTO|Login DTO]]
- [[_COMMUNITY_Register DTO|Register DTO]]
- [[_COMMUNITY_Roles Decorator|Roles Decorator]]
- [[_COMMUNITY_Module 60|Module 60]]
- [[_COMMUNITY_Module 61|Module 61]]
- [[_COMMUNITY_Module 62|Module 62]]
- [[_COMMUNITY_Module 63|Module 63]]
- [[_COMMUNITY_Module 64|Module 64]]
- [[_COMMUNITY_Module 65|Module 65]]
- [[_COMMUNITY_Module 66|Module 66]]
- [[_COMMUNITY_Module 67|Module 67]]
- [[_COMMUNITY_Module 68|Module 68]]
- [[_COMMUNITY_Module 69|Module 69]]
- [[_COMMUNITY_Module 70|Module 70]]
- [[_COMMUNITY_Module 71|Module 71]]
- [[_COMMUNITY_Module 72|Module 72]]
- [[_COMMUNITY_Module 73|Module 73]]
- [[_COMMUNITY_Module 74|Module 74]]
- [[_COMMUNITY_Module 75|Module 75]]
- [[_COMMUNITY_Module 76|Module 76]]
- [[_COMMUNITY_Module 77|Module 77]]
- [[_COMMUNITY_Module 78|Module 78]]
- [[_COMMUNITY_Module 79|Module 79]]
- [[_COMMUNITY_Module 80|Module 80]]
- [[_COMMUNITY_Module 81|Module 81]]
- [[_COMMUNITY_Module 82|Module 82]]
- [[_COMMUNITY_Module 83|Module 83]]
- [[_COMMUNITY_Module 84|Module 84]]
- [[_COMMUNITY_Module 85|Module 85]]
- [[_COMMUNITY_Module 86|Module 86]]
- [[_COMMUNITY_Module 87|Module 87]]
- [[_COMMUNITY_Module 88|Module 88]]
- [[_COMMUNITY_Module 89|Module 89]]
- [[_COMMUNITY_Module 90|Module 90]]
- [[_COMMUNITY_Module 91|Module 91]]
- [[_COMMUNITY_Module 92|Module 92]]
- [[_COMMUNITY_Module 93|Module 93]]
- [[_COMMUNITY_Module 94|Module 94]]
- [[_COMMUNITY_Module 95|Module 95]]
- [[_COMMUNITY_Module 96|Module 96]]
- [[_COMMUNITY_Module 97|Module 97]]
- [[_COMMUNITY_Module 98|Module 98]]
- [[_COMMUNITY_Module 99|Module 99]]

## God Nodes (most connected - your core abstractions)
1. `AuthController` - 15 edges
2. `AcademicController` - 15 edges
3. `AcademicService` - 14 edges
4. `FeeController` - 13 edges
5. `FeeService` - 12 edges
6. `UserController` - 12 edges
7. `AuthService` - 12 edges
8. `StudentController` - 11 edges
9. `AISchool Monorepo` - 11 edges
10. `StudentService` - 10 edges

## Surprising Connections (you probably didn't know these)
- `NestJS Microservices (6 complete)` --conceptually_related_to--> `NestJS Framework`  [INFERRED]
  PROGRESS.md → CLAUDE.md
- `Next.js Portals` --conceptually_related_to--> `Next.js Framework`  [INFERRED]
  PROGRESS.md → CLAUDE.md
- `PROGRESS.md — 458-Task Checklist` --references--> `458-Task Build Checklist`  [EXTRACTED]
  CLAUDE.md → PROGRESS.md
- `createTestTenant()` --calls--> `generateSecureToken()`  [INFERRED]
  packages/testing/src/factories.ts → packages/utils/src/crypto.ts
- `createTestUser()` --calls--> `generateSecureToken()`  [INFERRED]
  packages/testing/src/factories.ts → packages/utils/src/crypto.ts

## Communities

### Community 0 - "Auth & Admin Dashboard"
Cohesion: 0.05
Nodes (5): AuthController, AuthService, LocalStrategy, AddStudentModal(), TotpService

### Community 1 - "Fee & Payment Service"
Cohesion: 0.07
Nodes (5): formatINR(), rupeesToPaise(), FeeController, FeeService, RazorpayService

### Community 2 - "Academic Service"
Cohesion: 0.08
Nodes (2): AcademicController, AcademicService

### Community 3 - "Monorepo & Infra Docs"
Cohesion: 0.08
Nodes (30): AISchool Monorepo, apps/ — NestJS & Next.js Apps, Docker (build+push CD), .github/workflows/ — CI/CD Pipelines, graphify-out/ — Knowledge Graph Outputs, graphify Skill, infrastructure/ — Nginx, Postgres, Mosquitto, Mosquitto MQTT Broker (+22 more)

### Community 4 - "Notification Adapters"
Cohesion: 0.08
Nodes (7): EmailAdapter, createLogger(), LoggerService, createTestApp(), PushAdapter, SmsAdapter, WhatsappAdapter

### Community 5 - "Student Service & Crypto"
Cohesion: 0.12
Nodes (9): generateSecureToken(), hashOtp(), sha256(), createTestSchool(), createTestTenant(), createTestUser(), buildPaginatedResult(), parsePagination() (+1 more)

### Community 6 - "User Management Service"
Cohesion: 0.14
Nodes (2): UserController, UserService

### Community 7 - "Notification Service Core"
Cohesion: 0.1
Nodes (2): NotificationController, NotificationService

### Community 8 - "Microservice Entrypoints"
Cohesion: 0.11
Nodes (4): bootstrap(), NotificationModule, NotificationProcessor, main()

### Community 9 - "Auth Error Types"
Cohesion: 0.11
Nodes (9): AccountDisabledError, ForbiddenError, InvalidCredentialsError, InvalidOtpError, InvalidTokenError, PlanUpgradeRequiredError, TokenExpiredError, TwoFactorRequiredError (+1 more)

### Community 10 - "Attendance Service"
Cohesion: 0.12
Nodes (2): AttendanceController, AttendanceService

### Community 11 - "Student Controller"
Cohesion: 0.17
Nodes (1): StudentController

### Community 12 - "Domain Error Types"
Cohesion: 0.18
Nodes (5): BusinessRuleError, ConflictError, NotFoundError, TenantMismatchError, ValidationError

### Community 13 - "JWT Auth Strategies"
Cohesion: 0.2
Nodes (1): JwtStrategy

### Community 14 - "String Utilities"
Cohesion: 0.22
Nodes (0): 

### Community 15 - "NestJS App Modules"
Cohesion: 0.25
Nodes (1): AppModule

### Community 16 - "HTTP Error Types"
Cohesion: 0.29
Nodes (3): BadRequestError, ServiceUnavailableError, TooManyRequestsError

### Community 17 - "Prisma Database Layer"
Cohesion: 0.33
Nodes (1): PrismaService

### Community 18 - "Date Utilities"
Cohesion: 0.4
Nodes (2): formatDate(), formatDateTime()

### Community 19 - "Test Database Setup"
Cohesion: 0.5
Nodes (0): 

### Community 20 - "Base Error Class"
Cohesion: 0.5
Nodes (1): AppError

### Community 21 - "Admin Auth Hooks"
Cohesion: 0.5
Nodes (0): 

### Community 22 - "Admin Portal Utils"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Google OAuth Strategy"
Cohesion: 0.5
Nodes (1): GoogleStrategy

### Community 24 - "Microsoft OAuth Strategy"
Cohesion: 0.5
Nodes (1): MicrosoftStrategy

### Community 25 - "Health Check"
Cohesion: 0.5
Nodes (1): HealthController

### Community 26 - "Roles Auth Guard"
Cohesion: 0.5
Nodes (1): RolesGuard

### Community 27 - "JWT Auth Guard"
Cohesion: 0.5
Nodes (1): JwtAuthGuard

### Community 28 - "Plan Auth Guard"
Cohesion: 0.5
Nodes (1): PlanGuard

### Community 29 - "Bulk Attendance DTO"
Cohesion: 0.67
Nodes (2): AttendanceRecordDto, BulkAttendanceDto

### Community 30 - "Student Promotion DTO"
Cohesion: 0.67
Nodes (2): PromoteStudentDto, PromotionItem

### Community 31 - "UI Spinner Component"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "CN Utility"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Prisma Module"
Cohesion: 1.0
Nodes (1): PrismaModule

### Community 34 - "Base Config"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Attendance Module"
Cohesion: 1.0
Nodes (1): AttendanceModule

### Community 36 - "Session Creation DTO"
Cohesion: 1.0
Nodes (1): CreateSessionDto

### Community 37 - "Admin Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Admin Home Page"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Admin Providers"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Dashboard Layout"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Classes Page"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Dashboard Page"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Login Page"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Admin Header"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Admin API Client"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Fee Module"
Cohesion: 1.0
Nodes (1): FeeModule

### Community 47 - "Create Student DTO"
Cohesion: 1.0
Nodes (1): CreateStudentDto

### Community 48 - "Link Parent DTO"
Cohesion: 1.0
Nodes (1): LinkParentDto

### Community 49 - "List Students Query DTO"
Cohesion: 1.0
Nodes (1): ListStudentsQueryDto

### Community 50 - "Update Student DTO"
Cohesion: 1.0
Nodes (1): UpdateStudentDto

### Community 51 - "Student Module"
Cohesion: 1.0
Nodes (1): StudentModule

### Community 52 - "List Users Query DTO"
Cohesion: 1.0
Nodes (1): ListUsersQueryDto

### Community 53 - "Update User DTO"
Cohesion: 1.0
Nodes (1): UpdateUserDto

### Community 54 - "Assign Role DTO"
Cohesion: 1.0
Nodes (1): AssignRoleDto

### Community 55 - "User Module"
Cohesion: 1.0
Nodes (1): UserModule

### Community 56 - "TOTP Verify DTO"
Cohesion: 1.0
Nodes (1): SetupTotpVerifyDto

### Community 57 - "Login DTO"
Cohesion: 1.0
Nodes (1): LoginDto

### Community 58 - "Register DTO"
Cohesion: 1.0
Nodes (1): RegisterDto

### Community 59 - "Roles Decorator"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Module 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Module 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Module 62"
Cohesion: 1.0
Nodes (1): AuthModule

### Community 63 - "Module 63"
Cohesion: 1.0
Nodes (1): AcademicModule

### Community 64 - "Module 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Module 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Module 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Module 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Module 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Module 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Module 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Module 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Module 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Module 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Module 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Module 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Module 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Module 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Module 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Module 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Module 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Module 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Module 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Module 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Module 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Module 85"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Module 86"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Module 87"
Cohesion: 1.0
Nodes (0): 

### Community 88 - "Module 88"
Cohesion: 1.0
Nodes (0): 

### Community 89 - "Module 89"
Cohesion: 1.0
Nodes (0): 

### Community 90 - "Module 90"
Cohesion: 1.0
Nodes (0): 

### Community 91 - "Module 91"
Cohesion: 1.0
Nodes (0): 

### Community 92 - "Module 92"
Cohesion: 1.0
Nodes (0): 

### Community 93 - "Module 93"
Cohesion: 1.0
Nodes (0): 

### Community 94 - "Module 94"
Cohesion: 1.0
Nodes (0): 

### Community 95 - "Module 95"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Module 96"
Cohesion: 1.0
Nodes (0): 

### Community 97 - "Module 97"
Cohesion: 1.0
Nodes (0): 

### Community 98 - "Module 98"
Cohesion: 1.0
Nodes (0): 

### Community 99 - "Module 99"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **37 isolated node(s):** `PrismaModule`, `AttendanceModule`, `CreateSessionDto`, `AttendanceRecordDto`, `BulkAttendanceDto` (+32 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `UI Spinner Component`** (2 nodes): `spinner.tsx`, `Spinner()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CN Utility`** (2 nodes): `cn()`, `cn.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Module`** (2 nodes): `prisma.module.ts`, `PrismaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Base Config`** (2 nodes): `validateEnv()`, `base.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Attendance Module`** (2 nodes): `attendance.module.ts`, `AttendanceModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Session Creation DTO`** (2 nodes): `create-session.dto.ts`, `CreateSessionDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Root Layout`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Home Page`** (2 nodes): `page.tsx`, `Home()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Providers`** (2 nodes): `providers.tsx`, `Providers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Layout`** (2 nodes): `layout.tsx`, `DashboardLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Classes Page`** (2 nodes): `page.tsx`, `toggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Page`** (2 nodes): `page.tsx`, `StatCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Page`** (2 nodes): `page.tsx`, `onSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin Header`** (2 nodes): `header.tsx`, `Header()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Admin API Client`** (2 nodes): `processQueue()`, `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Fee Module`** (2 nodes): `fee.module.ts`, `FeeModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Student DTO`** (2 nodes): `create-student.dto.ts`, `CreateStudentDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Link Parent DTO`** (2 nodes): `link-parent.dto.ts`, `LinkParentDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `List Students Query DTO`** (2 nodes): `list-students-query.dto.ts`, `ListStudentsQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update Student DTO`** (2 nodes): `update-student.dto.ts`, `UpdateStudentDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Student Module`** (2 nodes): `student.module.ts`, `StudentModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `List Users Query DTO`** (2 nodes): `list-users-query.dto.ts`, `ListUsersQueryDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update User DTO`** (2 nodes): `update-user.dto.ts`, `UpdateUserDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Assign Role DTO`** (2 nodes): `assign-role.dto.ts`, `AssignRoleDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User Module`** (2 nodes): `user.module.ts`, `UserModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TOTP Verify DTO`** (2 nodes): `setup-totp-verify.dto.ts`, `SetupTotpVerifyDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login DTO`** (2 nodes): `login.dto.ts`, `LoginDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Register DTO`** (2 nodes): `register.dto.ts`, `RegisterDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Roles Decorator`** (2 nodes): `roles.decorator.ts`, `Roles()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 60`** (2 nodes): `requires-plan.decorator.ts`, `RequiresPlan()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 61`** (2 nodes): `public.decorator.ts`, `Public()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 62`** (2 nodes): `auth.module.ts`, `AuthModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 63`** (2 nodes): `AcademicModule`, `academic.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 64`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 65`** (1 nodes): `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 66`** (1 nodes): `badge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 67`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 68`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 69`** (1 nodes): `pagination.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 70`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 71`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 72`** (1 nodes): `enums.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 73`** (1 nodes): `auth.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 74`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 75`** (1 nodes): `kafka.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 76`** (1 nodes): `auth.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 77`** (1 nodes): `database.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 78`** (1 nodes): `redis.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 79`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 80`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 81`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 82`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 83`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 84`** (1 nodes): `payloads.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 85`** (1 nodes): `topics.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 86`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 87`** (1 nodes): `queues.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 88`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 89`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 90`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 91`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 92`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 93`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 94`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 95`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 96`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 97`** (1 nodes): `sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 98`** (1 nodes): `auth.store.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 99`** (1 nodes): `current-user.decorator.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `bootstrap()` connect `Microservice Entrypoints` to `Student Service & Crypto`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `LoggerService` connect `Notification Adapters` to `Microservice Entrypoints`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `PrismaModule`, `AttendanceModule`, `CreateSessionDto` to the rest of the system?**
  _37 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Admin Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Fee & Payment Service` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Academic Service` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Monorepo & Infra Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._