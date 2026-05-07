# AISchool ERP — Architectural Fixes Checklist

> Generated: 2026-05-07  
> Source: Full architectural audit (architect + AI review)  
> Auto-resume: Read this file, find first `[ ]`, continue from there.

---

## Progress Summary

| Priority | Total | Done | % |
|---|---|---|---|
| 🔴 Week 1 — Critical (prod broken) | 10 | 10 | 100% |
| 🟠 Week 2 — Security hardening | 10 | 10 | 100% |
| 🟡 Week 3 — Async / event wiring | 5 | 5 | 100% |
| 🔵 Week 4 — Infra + observability | 8 | 0 | 0% |
| ⚪ Ongoing — Tests, portals, perf | 17 | 0 | 0% |
| **TOTAL** | **50** | **25** | **50%** |

---

## 🔴 Week 1 — Critical (production is broken)

- [x] **W1-01** — Fix JWT fallback secret: throw startup error if `JWT_ACCESS_SECRET` missing/short in all 14 non-auth services  
  _Files: all services `src/guards/jwt.strategy.ts` — currently `|| "fallback"` fallback_

- [x] **W1-02** — Fix forgot-password: emit event to notification-service instead of returning token in HTTP response  
  _File: `apps/auth-service/src/auth/auth.service.ts:153`_

- [x] **W1-03** — Fix mobile API: change base URL default from `localhost:3001` to `localhost:3000` (gateway)  
  _File: `apps/mobile/src/services/api.ts:4`_

- [x] **W1-04** — Fix mobile refresh token: auth-service uses HttpOnly cookie, mobile sends body — align the two  
  _File: `apps/mobile/src/services/api.ts:23` + `apps/auth-service/src/auth/auth.controller.ts`_

- [x] **W1-05** — Add `developer-api` to `docker-compose.yml` (service exists, proxied by gateway, but never starts)  
  _File: `docker-compose.yml`_

- [x] **W1-06** — Add `management-portal` Dockerfile + docker-compose entry  
  _File: `apps/management-portal/Dockerfile` (missing), `docker-compose.yml`_

- [x] **W1-07** — Build management portal foundation: `lib/api.ts`, `store/auth.store.ts`, `providers.tsx` (currently a non-functional UI shell)  
  _Dir: `apps/management-portal/src/`_

- [x] **W1-08** — Fix Razorpay env validation: throw at startup if `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` missing  
  _File: `apps/fee-service/src/payment/razorpay.service.ts:11-12`_

- [x] **W1-09** — Fix password reset token exposure: return generic message only, send token via notification-service  
  _File: `apps/auth-service/src/auth/auth.service.ts:154`_

- [x] **W1-10** — Fix AI service SQL table names to match Prisma `@@map` names (verify all queries use correct table names)  
  _Dir: `apps/ai-service/routers/`_

---

## 🟠 Week 2 — Security Hardening

- [x] **W2-01** — Add `RolesGuard` + `@Roles()` decorator to sensitive routes in all services (payroll, fee, HR, user, student)  
  _All services — `RolesGuard` exists in auth-service but is never re-used elsewhere_

- [x] **W2-02** — Replace `@Body() body: any` with typed class-validator DTOs in `hr-service` (21 routes)  
  _File: `apps/hr-service/src/hr/hr.controller.ts`_

- [x] **W2-03** — Replace `@Body() body: any` with typed DTOs in `library-service` (12 routes)  
  _File: `apps/library-service/src/library/library.controller.ts`_

- [x] **W2-04** — Replace `@Body() body: any` with typed DTOs in `academic-service` controllers (cafeteria, survey, visitor)  
  _Dir: `apps/academic-service/src/`_

- [x] **W2-05** — Replace `@Body() body: any` with typed DTOs in `expense-service`, `scholarship-service`  
  _Files: respective controller files_

- [x] **W2-06** — Fix AI service CORS: replace `allow_origins=["*"]` with env-configured origins  
  _File: `apps/ai-service/main.py:31-36`_

- [x] **W2-07** — Fix API gateway CORS: change default from `true` (allow all) to empty list  
  _File: `apps/api-gateway/src/main.ts:42`_

- [x] **W2-08** — Whitelist allowed models in report service dynamic access  
  _File: `apps/report-service/src/report/report.service.ts:281`_

- [x] **W2-09** — Fix `WEBHOOK_ENCRYPTION_KEY` and `PII_ENCRYPTION_KEY` non-null assertions → startup validation  
  _Files: `apps/developer-api/src/webhooks/webhook.service.ts:20`, `apps/hr-service/src/hr/staff.service.ts:6`_

- [x] **W2-10** — Fix email provisioning: replace predictable `SchoolERP@2026!` password with `crypto.randomBytes`  
  _File: `apps/user-service/src/email-provisioning/email-provision.service.ts:93`_

---

## 🟡 Week 3 — Async / Event Wiring

- [x] **W3-01** — Wire `packages/events` with BullMQ: publish `student.enrolled` from student-service, consume in attendance-service + fee-service  
  _Package: `packages/events/` (exists but unused)_

- [x] **W3-02** — Wire `fee.paid` event: publish from fee-service, consume in notification-service (send receipt SMS/email)  
  _Files: `apps/fee-service/src/fee/fee.service.ts`, `apps/notification-service/`_

- [x] **W3-03** — Wire `exam.result.published` event: publish from exam-service, consume in notification-service (alert parents/students)  
  _Files: `apps/exam-service/`, `apps/notification-service/`_

- [x] **W3-04** — Add `@nestjs/schedule` cron jobs: daily attendance absent alerts, weekly fee reminders, sandbox reset  
  _Services: `notification-service`, `fee-service`, `developer-api`_

- [x] **W3-05** — Wire webhook dispatch: call `webhookService.dispatch()` from student enrollment, fee payment, result publication  
  _File: `apps/developer-api/src/webhooks/webhook.service.ts` (dispatch exists but never called)_

---

## 🔵 Week 4 — Infra + Observability

- [ ] **W4-01** — Add `app.enableShutdownHooks()` + SIGTERM handler to all 25 `main.ts` files  
  _All service `src/main.ts` files_

- [ ] **W4-02** — Add `/health` endpoint to 12 services missing it (admission, certificate, developer-api, event, expense, hr, lms, ops, payroll, saas, scholarship, transport)  
  _Respective service `src/health/` dirs_

- [ ] **W4-03** — Add `ThrottlerModule` to the 21 services missing rate limiting  
  _All services' `src/app.module.ts` except auth, saas, developer-api_

- [ ] **W4-04** — Configure Prisma connection pool: add `connection_limit` to DATABASE_URL or `PrismaClient` options  
  _File: `packages/database/src/prisma.service.ts`_

- [ ] **W4-05** — Add Redis `.on("error")` handlers in notification-service, attendance-service, ops/feature-flags  
  _Respective service Redis client init files_

- [ ] **W4-06** — Expand CD pipeline to cover all 25 services (currently only 3)  
  _File: `.github/workflows/cd.yml`_

- [ ] **W4-07** — Wire E2E tests into CI pipeline  
  _File: `.github/workflows/ci.yml`_

- [ ] **W4-08** — Complete Helm `values.yaml` for all 25 services (currently only 7 configured)  
  _File: `infrastructure/k8s/helm/school-erp/values.yaml`_

---

## ⚪ Ongoing — Tests, Portals, Performance

### Tests
- [ ] **OG-01** — Add controller E2E tests for auth-service (guard, validation, response shape)
- [ ] **OG-02** — Add controller E2E tests for fee-service
- [ ] **OG-03** — Add controller E2E tests for student-service
- [ ] **OG-04** — Add unit tests for ops-service modules (alumni, asset, community, facility, social)
- [ ] **OG-05** — Add unit tests for developer-api (sandbox, deprecation, webhooks)
- [ ] **OG-06** — Add pytest test suite for AI service (all 7 routers)
- [ ] **OG-07** — Add frontend tests for admin-portal (React Testing Library + Playwright)
- [ ] **OG-08** — Add React Native tests for mobile app (Jest + RNTL)

### Portals
- [ ] **OG-09** — Fix admin portal dashboard: replace hardcoded mock data with real API calls  
  _File: `apps/admin-portal/src/app/(dashboard)/dashboard/page.tsx:68-217`_

- [ ] **OG-10** — Fix management portal analytics: replace static hardcoded data with AI service calls  
  _File: `apps/management-portal/src/app/(dashboard)/analytics/page.tsx:9-28`_

- [ ] **OG-11** — Add missing teacher portal pages (homework, exam grading, report cards, LMS authoring, PTM)

- [ ] **OG-12** — Add missing student portal pages (attendance, assignments, exam results, LMS, library, certificates)

### Performance
- [ ] **OG-13** — Fix N+1 in fee invoice generation: replace per-student queries with `createMany` + `$transaction`  
  _File: `apps/fee-service/src/fee/fee.service.ts:47`_

- [ ] **OG-14** — Fix N+1 in payroll processing: batch queries, use `$transaction`  
  _File: `apps/payroll-service/src/payroll/payroll.service.ts:44-124`_

- [ ] **OG-15** — Add Puppeteer browser pooling in report-service and exam-service  
  _Files: `apps/report-service/src/report/report.service.ts`, `apps/exam-service/src/exam/report-card.service.ts`_

- [ ] **OG-16** — Add Redis caching for timetable, subjects, grade levels in academic-service  
  _File: `apps/academic-service/`_

- [ ] **OG-17** — Add pagination to library, HR, and AI service list endpoints  
  _Respective controller/router files_

---

_Last updated: 2026-05-07 | Updated by: Claude Code | Week 1 COMPLETE_
