# AISchool ERP

> Production-grade K-12 School Enterprise Resource Planning system — 25 NestJS microservices, 5 Next.js 14 portals, React Native mobile app, Python FastAPI AI engine, and full DevOps pipeline.

[![CI](https://github.com/arafat233/aischool-erp/actions/workflows/ci.yml/badge.svg)](https://github.com/arafat233/aischool-erp/actions/workflows/ci.yml)
[![CD](https://github.com/arafat233/aischool-erp/actions/workflows/cd.yml/badge.svg)](https://github.com/arafat233/aischool-erp/actions/workflows/cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

---

## What is this?

AISchool ERP is a **full-stack monorepo** covering every operational and academic need of a modern K-12 school — from student admission to alumni management, AI plagiarism detection to S3/R2 file storage, biometric attendance to blockchain certificate verification.

Built with **NestJS microservices**, **Next.js 14 App Router**, **Expo 51** mobile, and a **Python FastAPI** AI engine — all in a single **Turborepo + pnpm workspace** that runs locally with a single command.

---

## Architecture

```
Clients
  ├── Admin Portal    (Next.js 14 · :3100)
  ├── Teacher Portal  (Next.js 14 · :3101)
  ├── Student Portal  (Next.js 14 · :3102)
  ├── Parent Portal   (Next.js 14 · :3103)
  ├── Mgmt Portal     (Next.js 14 · :3104)
  └── Mobile App      (Expo 51 · iOS + Android)
         │
    API Gateway (:3000) — JWT auth guard · ThrottlerModule rate limiting
         │
    25 NestJS Microservices (:3001 – :3023)
    + Python AI Service (:8000)
         │
    PostgreSQL 16 (Prisma ORM)
    Redis 7 (BullMQ queues · token blacklist)
    MQTT (Mosquitto · IoT / biometric devices)
    InfluxDB (GPS / sensor time-series)
```

---

## Services

| Service | Port | Purpose |
|---|---|---|
| **api-gateway** | 3000 | JWT guard, rate limiting, reverse proxy |
| **auth-service** | 3001 | Login, JWT, OAuth (Google/Microsoft), 2FA, refresh tokens |
| **user-service** | 3002 | User CRUD, avatar upload (S3/R2), GDPR erasure |
| **student-service** | 3003 | Student profiles, parent contacts |
| **academic-service** | 3004 | Timetables, homework, calendar, PTM, alerts |
| **attendance-service** | 3005 | Student & staff attendance, biometric integration |
| **fee-service** | 3006 | Fee structures, invoices, Stripe/Razorpay |
| **notification-service** | 3007 | Push, SMS, email, WhatsApp (BullMQ workers) |
| **exam-service** | 3008 | Exams, online exams, plagiarism scanning (AI) |
| **lms-service** | 3009 | Courses, lessons, video content |
| **hr-service** | 3010 | Staff profiles, PII encryption |
| **payroll-service** | 3011 | Payroll runs, payslips |
| **certificate-service** | 3012 | Certificate generation & issuance |
| **admission-service** | 3013 | Applications, enrollment workflow |
| **transport-service** | 3014 | Routes, vehicles, drivers, GPS trips |
| **health-service** | 3015 | Medical records, visits, medications, incidents |
| **library-service** | 3016 | Books, borrowing, reading programs |
| **event-service** | 3017 | School events, registrations |
| **expense-service** | 3018 | Expense claims, approvals |
| **scholarship-service** | 3019 | Applications, eligibility, awards |
| **ops-service** | 3020 | Assets, facilities, alumni, community (PTA, volunteers) |
| **report-service** | 3021 | Custom reports, PDF/Excel export |
| **saas-service** | 3022 | Multi-tenant school management |
| **developer-api** | 3023 | Webhook management, sandbox, API key auth |
| **ai-service** | 8000 | Plagiarism detection, essay scoring, recommendations |

---

## Portals

| Portal | Port | Users |
|---|---|---|
| Admin Portal | 3100 | School administrators, principals |
| Teacher Portal | 3101 | Teaching staff |
| Student Portal | 3102 | Students |
| Parent Portal | 3103 | Parents / guardians |
| Management Portal | 3104 | School owners, executives |
| Mobile App | — | All roles (iOS + Android via Expo) |

---

## Quick Start

### Prerequisites
- Node ≥ 20, pnpm ≥ 9, Docker Compose ≥ 2.24

### 1. Install dependencies
```bash
export PNPM_HOME="$HOME/Library/pnpm" && export PATH="$PNPM_HOME:$PATH"
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — POSTGRES_PASSWORD is required at minimum
```

### 3. Start infrastructure (Docker)
```bash
docker compose up -d postgres redis mosquitto influxdb
```

### 4. Build shared packages
```bash
pnpm --filter @school-erp/types build
pnpm --filter @school-erp/errors build
pnpm --filter @school-erp/events build
pnpm --filter @school-erp/config build
pnpm --filter @school-erp/utils build
pnpm --filter @school-erp/logger build
pnpm --filter @school-erp/database build
```

### 5. Run database migrations + seed
```bash
cd packages/database
DATABASE_URL="postgresql://school_erp:<password>@localhost:5432/school_erp" \
  npx prisma migrate deploy
DATABASE_URL="postgresql://school_erp:<password>@localhost:5432/school_erp" \
  npx ts-node --transpile-only prisma/seed.ts
cd ../..
```

### 6. Start services
```bash
# Load .env and start backend + frontend
set -a && source .env && set +a

# Backend (each in its own terminal or use & for background)
pnpm --filter @school-erp/auth-service dev
pnpm --filter @school-erp/user-service dev
pnpm --filter @school-erp/api-gateway dev

# Frontend portals
pnpm --filter @school-erp/admin-portal dev    # http://localhost:3100
pnpm --filter @school-erp/teacher-portal dev  # http://localhost:3101
pnpm --filter @school-erp/student-portal dev  # http://localhost:3102
pnpm --filter @school-erp/parent-portal dev   # http://localhost:3103
```

---

## Test Credentials

After running the seed, these accounts are available:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@schoolerp.local` | `Admin@123!` |
| School Admin | `schooladmin@demo.local` | `Admin@123!` |
| Teacher | `teacher@demo.local` | `Admin@123!` |
| Student | `student@demo.local` | `Admin@123!` |
| Parent | `parent@demo.local` | `Admin@123!` |

**Login endpoint:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@schoolerp.local","password":"Admin@123!"}'
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS 10 (TypeScript), SWC compiler |
| Frontend | Next.js 14 App Router, Tailwind CSS, shadcn/ui |
| Mobile | Expo 51, React Native, expo-router |
| AI/ML | Python 3.12, FastAPI, scikit-learn |
| ORM | Prisma 5 (PostgreSQL 16) |
| Cache / Queues | Redis 7, BullMQ |
| IoT / MQTT | Mosquitto 2, InfluxDB 2.7 |
| Object Storage | S3 / Cloudflare R2 (AWS SDK v3) |
| CI | GitHub Actions (lint + test + build) |
| CD | GitHub Actions → GHCR Docker images |

---

## Project Structure

```
AISchool/
├── apps/
│   ├── api-gateway/           # NestJS reverse proxy + auth guard
│   ├── auth-service/          # JWT, OAuth, 2FA
│   ├── user-service/          # User management + S3 avatar upload
│   ├── ...                    # 22 more NestJS services
│   ├── ai-service/            # Python FastAPI AI engine
│   ├── biometric-bridge/      # Node.js IoT bridge
│   ├── admin-portal/          # Next.js admin dashboard
│   ├── teacher-portal/        # Next.js teacher dashboard
│   ├── student-portal/        # Next.js student dashboard
│   ├── parent-portal/         # Next.js parent dashboard
│   ├── management-portal/     # Next.js management dashboard
│   └── mobile/                # Expo React Native app
├── packages/
│   ├── types/                 # Shared TypeScript types
│   ├── utils/                 # Shared utilities (pagination, crypto, etc.)
│   ├── config/                # Shared NestJS config factories
│   ├── errors/                # Shared error classes
│   ├── events/                # BullMQ queue names + job options
│   ├── logger/                # Winston logger service
│   ├── database/              # Prisma client + PrismaModule
│   ├── ui/                    # Shared React component library
│   └── tsconfig/              # Shared TypeScript configs
├── infrastructure/
│   ├── postgres/              # init.sql (extensions)
│   ├── mosquitto/             # MQTT broker config
│   └── nginx/                 # Nginx reverse proxy config
├── .github/workflows/
│   ├── ci.yml                 # Lint + test (NestJS, portals, Python)
│   └── cd.yml                 # Docker build + push to GHCR
├── docker-compose.yml         # Full stack orchestration
├── CHANGELOG.md               # Version history
└── PROGRESS.md                # Build task tracker
```

---

## CI/CD

- **CI** (`ci.yml`): runs on every PR — ESLint, Jest (NestJS + portals), pytest (AI service)
- **CD** (`cd.yml`): runs on push to `main` — detects changed services via `dorny/paths-filter`, builds Docker images, pushes to GHCR

Docker images: `ghcr.io/<owner>/school-erp-<service>:latest`

---

## Documentation

- **[CHANGELOG.md](CHANGELOG.md)** — Full feature inventory and version history
- **[PROGRESS.md](PROGRESS.md)** — Build checklist (all phases complete)

---

## License

MIT © 2026 AISchool ERP
