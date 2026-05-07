# Changelog

All notable changes to the AISchool ERP monorepo are documented here.

---

## [1.0.0] — 2026-05-07

### Added — Infrastructure & Platform

- **Monorepo scaffold** with pnpm workspaces + Turborepo (`turbo run build/test/lint`)
- **Docker Compose** full-stack orchestration: 25 NestJS services, 5 Next.js portals, AI service, PostgreSQL, Redis, MQTT broker, NGINX
  - YAML anchors (`x-service-defaults`, `x-backend-healthcheck`) applied to all services
  - Per-service health checks (`/health` endpoints)
- **GitHub Actions CI** (`ci.yml`): lint → test (NestJS + portal + Python AI) → build gate
- **GitHub Actions CD** (`cd.yml`): dorny/paths-filter change detection → Docker build/push to GHCR → deploy placeholder
- **`.dockerignore`**: excludes node_modules, .env, .git, __pycache__, raw/, graphify-out/
- **Dependabot** (`dependabot.yml`): weekly npm (grouped), pip, GitHub Actions updates
- **Shared packages**: `@school-erp/types`, `@school-erp/utils`, `@school-erp/config`, `@school-erp/errors`, `@school-erp/events`, `@school-erp/ui`, `@school-erp/logger`, `@school-erp/tsconfig`

### Added — Backend Services (25 NestJS microservices)

| Service | Port | Key Features |
|---|---|---|
| api-gateway | 3000 | JWT auth guard, rate limiting (ThrottlerModule), reverse-proxy to all services |
| auth-service | 3001 | JWT issue/refresh, bcrypt passwords, Redis token blacklist |
| user-service | 3002 | User CRUD, avatar upload to S3/R2, role management |
| student-service | 3003 | Student profiles, parent contacts API |
| academic-service | 3004 | Timetables, homework, calendar, PTM, staff comms, broadcast alerts |
| attendance-service | 3005 | Daily attendance, biometric integration, BullMQ processing |
| fee-service | 3006 | Fee structures, invoices, payment processing, Stripe webhooks |
| notification-service | 3007 | Multi-channel alerts (push/SMS/WhatsApp/email), BullMQ workers, parent contact lookup |
| exam-service | 3008 | Exams, online exams, plagiarism scanning (BullMQ + AI service) |
| lms-service | 3009 | Courses, lessons, video content |
| hr-service | 3010 | Staff profiles, PII encryption (`PII_ENCRYPTION_KEY`) |
| payroll-service | 3011 | Payroll runs, payslip generation, E2E test suite |
| certificate-service | 3012 | Certificate generation and issuance |
| admission-service | 3013 | Admission applications, enrollment workflow |
| transport-service | 3014 | Routes, stops, vehicles, drivers, trip tracking |
| health-service | 3015 | Medical profiles, visits, medications, incidents, vaccinations, fitness, AED |
| library-service | 3016 | Books, borrowing, reading programs |
| event-service | 3017 | School events, registrations |
| expense-service | 3018 | Expense claims, approvals |
| scholarship-service | 3019 | Scholarship applications and awards |
| ops-service | 3020 | Assets, facilities, alumni, community (PTA, volunteers, CSR, lost+found, store) |
| report-service | 3021 | Custom report generation |
| saas-service | 3022 | Multi-tenant school management |
| developer-api | 3023 | Webhook management, sandbox environment, API key auth |
| ai-service | 8000 | Python FastAPI: plagiarism detection, essay scoring, content recommendations |

### Added — Frontend Portals (5 Next.js 14 apps)

- **admin-portal** (port 4000): School admin dashboard
- **teacher-portal** (port 4001): Teacher dashboard, gradebook, attendance
- **student-portal** (port 4002): Student dashboard, assignments, grades
- **parent-portal** (port 4003): Parent dashboard, child progress, fee payment
- **management-portal** (port 4004): School management analytics

Each portal has:
- Next.js 14 App Router with TypeScript
- Tailwind CSS + shadcn/ui components
- Dockerfiles (3-stage: deps → builder → runner)
- Jest + React Testing Library test suite

### Added — Mobile App (React Native / Expo)

- Expo Router-based navigation
- Biometric authentication (expo-local-authentication)
- Push notifications (expo-notifications)
- QR code / barcode scanning
- Offline-first with AsyncStorage
- Jest test suite with full native module mocks

### Added — Biometric Bridge Service

- Standalone Node.js service bridging hardware biometric devices to attendance-service
- Device health monitoring, conflict detection
- Jest unit tests (config parsing, health monitor, conflict service)

### Added — Testing

- **NestJS services**: `jest.config.ts` with ts-jest for all 23 services
- **Shared packages**: 100+ unit tests across utils (pagination, currency, string, crypto, date), errors, events
- **API Gateway**: proxy config spec (21 tests)
- **Biometric bridge**: config, health monitor, conflict service specs
- **Payroll E2E**: 11 integration tests
- **Portal dashboards**: RTL test suites for all 5 portals
- **Logger package**: 8 unit tests
- **AI service**: pytest suite

### Added — Security & Quality

- **Typed DTOs** with class-validator across all controllers (eliminated `@Body() body: any`)
- **`ValidationPipe({ whitelist: true, transform: true })`** globally in all services
- **NestJS Logger** replacing `console.log` in all production code
- **Rate limiting** on api-gateway (burst/minute/hour tiers)
- **PII encryption** for HR sensitive data

### Added — Integrations

- **BullMQ** async job queues: plagiarism scanning, notifications, attendance processing
- **Prisma ORM** with connection pooling across all services
- **S3/R2 object storage** for avatar uploads (AWS SDK v3, compatible with Cloudflare R2)
- **MQTT** for IoT device communication (transport GPS, biometric devices)
- **Stripe** webhook processing for fee payments

---

## Legend

- **Added** — new feature
- **Changed** — change to existing functionality
- **Fixed** — bug fix
- **Removed** — removed feature
- **Security** — security fix
