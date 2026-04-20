# AISchool ERP

> Production-grade K-12 School Enterprise Resource Planning system — 25 microservices, 5 web portals, mobile app, AI/ML engine, IoT integration, and blockchain certificate verification.

[![CI](https://github.com/arafat233/aischool-erp/actions/workflows/ci.yml/badge.svg)](https://github.com/arafat233/aischool-erp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)
[![Tasks](https://img.shields.io/badge/tasks-657%2F657-brightgreen)](PROGRESS.md)

---

## What is this?

AISchool ERP is a **full-stack monorepo** covering every operational and academic need of a modern K-12 school — from student admission to alumni management, IoT air quality monitoring to blockchain certificate verification, AI dropout prediction to NSQF vocational education tracking.

Built with **NestJS microservices**, **Next.js 14 App Router**, **Expo 51** mobile, and a **Python FastAPI** AI engine — all in a single **Turborepo + pnpm workspace**.

---

## Architecture

```
Clients (5 Next.js portals + Expo mobile)
         │
    Nginx API Gateway (TLS + rate limiting)
         │
    25 NestJS Microservices (:3001 – :3023, :8000, :8080)
         │
    PostgreSQL 16 (Prisma) · Redis Cluster · Kafka · InfluxDB · MQTT
         │
    HashiCorp Vault · Polygon Blockchain · MinIO · Kubernetes
```

See [BLUEPRINT.md](BLUEPRINT.md) for the full architecture diagram, schema, all endpoints, and deployment details.

---

## Services

| Service | Port | Purpose |
|---|---|---|
| auth-service | 3001 | JWT, MFA, session security |
| user-service | 3002 | User CRUD, GDPR erasure |
| student-service | 3003 | Students, CWSN/IEP, gamification, mentoring |
| academic-service | 3004 | Classes, timetable, LMS, vocational/NEP |
| attendance-service | 3005 | Student + staff attendance, biometric |
| fee-service | 3006 | Fee, Razorpay, receipts, FX payments |
| notification-service | 3007 | FCM, SMS, email, WhatsApp |
| exam-service | 3008 | Exams, marks, grades, CBT |
| lms-service | 3009 | Lessons, assignments, plagiarism, live class |
| hr-service | 3010 | Staff onboarding, leave, appraisal |
| payroll-service | 3011 | Salary, EPF/ESI/TDS, bank NEFT |
| certificate-service | 3012 | TC/BC/CC + Polygon blockchain hash |
| admission-service | 3013 | Application, shortlisting, enrolment |
| transport-service | 3014 | Routes, GPS tracking |
| health-service | 3015 | Health visits, vaccinations, infirmary |
| library-service | 3016 | Books, issue/return, OPAC |
| event-service | 3017 | Events, magazine, yearbook |
| expense-service | 3018 | Expense claims, budget |
| scholarship-service | 3019 | Schemes, eligibility, disbursement |
| ops-service | 3020 | Compliance, hostel, MDM, feature flags, international |
| report-service | 3021 | Cross-service reports, PDF/Excel export |
| saas-service | 3022 | Multi-tenant management, Stripe billing |
| developer-api | 3023 | Third-party REST API, webhooks |
| ai-service | 8000 | Dropout risk, timetable solver, essay grading |
| biometric-bridge | 8080 | ZKTeco device bridge → MQTT |

---

## Portals

| Portal | Port | Users |
|---|---|---|
| Admin Portal | 4000 | School administrators, principals |
| Teacher Portal | 4001 | Teaching staff |
| Student Portal | 4002 | Students |
| Parent Portal | 4003 | Parents / guardians |
| Management Portal | 4004 | School owners, executives |
| Mobile App | — | All roles (iOS + Android) |

---

## Quick Start

```bash
# Prerequisites: Node ≥ 20, pnpm ≥ 9, Docker Compose ≥ 2.24, Python ≥ 3.12

# 1. Install dependencies
export PNPM_HOME="$HOME/Library/pnpm" && export PATH="$PNPM_HOME:$PATH"
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in .env values (see BLUEPRINT.md §15 for all variables)

# 3. Start infrastructure
docker compose up -d postgres redis-0 redis-1 redis-2 redis-3 redis-4 redis-5 \
  kafka-0 kafka-1 kafka-2 zookeeper-0 zookeeper-1 zookeeper-2 \
  influxdb mosquitto minio vault

# 4. Database setup
pnpm --filter @aischool/prisma db:migrate
pnpm --filter @aischool/prisma db:seed

# 5. Start everything
pnpm dev

# AI service (separate terminal)
cd apps/ai-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

---

## Key Features

### Academic
- Timetable builder with AI optimisation (OR-Tools MILP)
- LMS with video lessons, quizzes, plagiarism detection (BullMQ)
- Live classes via Daily.co integration
- CBT (Computer Based Testing) engine
- NEP 2020 competency mapping + FLN dashboard (Grades 1–3)
- NSQF vocational education with OJT tracking

### Operations
- GPS live bus tracking with parent notifications
- IoT air quality monitoring (CO₂, PM2.5, temp, humidity) via MQTT + InfluxDB
- Hostel management with dual-approval leave workflow
- MDM integration (Jamf + Microsoft Intune) with lesson-mode device lockdown

### Compliance & Legal
- POSH/POCSO complaint management with ICC register
- RTE 25% seat lottery (seeded Fisher-Yates, deterministic + auditable)
- EPF/ESI/TDS/PT payroll compliance + ECR 2.0 export
- GDPR right-to-erasure (30-day pseudonymisation pipeline)
- UDISE data package compilation

### Intelligence
- AI dropout risk prediction (Random Forest)
- Fee defaulter risk scoring (Gradient Boosting)
- Attendance anomaly detection (Isolation Forest)
- AI essay grading with feedback (Anthropic API)
- Session anomaly detection (impossible travel, new IP, brute force)

### Finance
- Multi-currency fee payments with live FX rates
- Razorpay + Stripe integration
- Scholarship auto-eligibility engine
- Expense approval workflow + P&L reports

### Student Engagement
- Gamification engine: points, 15 badge rules (5 categories × 3 tiers), streaks, leaderboards
- Digital portfolio + digital ID with QR code
- CWSN/IEP management with exam accommodations
- Mentoring with effectiveness tracking

### Infrastructure
- Kubernetes with HPA, PDB, cert-manager (Let's Encrypt)
- HashiCorp Vault for secrets (sidecar injection, 30-day rotation)
- Blockchain certificate verification on Polygon (Solidity + ethers.js)
- ELK + Prometheus/Grafana + Jaeger distributed tracing
- Redis-backed feature flags with deterministic hash rollout + auto-rollback
- HMAC-SHA256 chained audit log (immutable)
- mTLS between services (Istio service mesh)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS (TypeScript), Fastify adapter |
| Frontend | Next.js 14 App Router, Tailwind CSS |
| Mobile | Expo 51, React Native, expo-router |
| AI/ML | Python 3.12, FastAPI, scikit-learn, OR-Tools |
| ORM | Prisma (PostgreSQL 16) |
| Cache | Redis Cluster (6 nodes) |
| Queues | BullMQ (on Redis) |
| Messaging | Apache Kafka (3 brokers) |
| IoT | InfluxDB + Mosquitto MQTT |
| Storage | MinIO (S3-compatible) |
| Secrets | HashiCorp Vault |
| Blockchain | Solidity + Polygon + ethers.js |
| Containers | Docker + Kubernetes + Helm |
| CI/CD | GitHub Actions → GHCR → Helm upgrade |
| Observability | ELK + Prometheus + Grafana + Jaeger |

---

## Documentation

- **[BLUEPRINT.md](BLUEPRINT.md)** — Complete architecture, schemas, all endpoints, deployment guide
- **[PROGRESS.md](PROGRESS.md)** — Build checklist (657/657 tasks complete)

---

## Progress

```
Phase 1 — Foundation           82/82   ████████████████  100%
Phase 2 — Core Academic       130/130  ████████████████  100%
Phase 3 — Operations          172/172  ████████████████  100%
Phase 4 — Intelligence+Mobile  88/88   ████████████████  100%
Phase 5 — Platform+DevOps      72/72   ████████████████  100%
Phase 6 — Compliance+Niche    113/113  ████████████████  100%

Total:                        657/657  ████████████████  100% ✅
```

---

## License

MIT © 2026 AISchool ERP
