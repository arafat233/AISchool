# AISchool ERP — Project Blueprint

> **Version:** 1.0 · **Last Updated:** 2026-04-20 · **Status:** 657/657 tasks complete (100%)

---

## Table of Contents

1. [What This Is](#1-what-this-is)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Database Schema Overview](#3-database-schema-overview)
4. [Microservices — Ports & Responsibilities](#4-microservices--ports--responsibilities)
5. [API Endpoints by Service](#5-api-endpoints-by-service)
6. [Frontend Portals & Pages](#6-frontend-portals--pages)
7. [Mobile App](#7-mobile-app)
8. [Auth, RBAC & Middleware](#8-auth-rbac--middleware)
9. [AI / ML Service](#9-ai--ml-service)
10. [Deployment — Docker / Kubernetes / Helm](#10-deployment--docker--kubernetes--helm)
11. [Infrastructure & Integrations](#11-infrastructure--integrations)
12. [Security Architecture](#12-security-architecture)
13. [Observability Stack](#13-observability-stack)
14. [Feature Flags & A/B Testing](#14-feature-flags--ab-testing)
15. [Environment Variables](#15-environment-variables)
16. [How to Run Locally](#16-how-to-run-locally)
17. [Full File Structure](#17-full-file-structure)
18. [Feature Status Table](#18-feature-status-table)

---

## 1. What This Is

**AISchool ERP** is a full-stack, production-grade **School Enterprise Resource Planning** system built as a **pnpm monorepo** (Turborepo). It covers every operational and academic need of a K-12 school, from admissions to alumni, from payroll to IoT sensors.

| Dimension | Detail |
|---|---|
| **Monorepo tool** | Turborepo + pnpm workspaces |
| **Backend** | NestJS microservices (25 services) |
| **Frontend** | Next.js 14 App Router (5 portals) |
| **Mobile** | Expo 51 / React Native (expo-router) |
| **AI/ML** | Python 3.12 FastAPI |
| **Primary DB** | PostgreSQL 16 via Prisma ORM |
| **Cache / Queue** | Redis Cluster (6 nodes) + BullMQ |
| **Message Broker** | Apache Kafka (3 brokers) |
| **IoT** | InfluxDB + MQTT (Mosquitto) |
| **Smart Contracts** | Solidity on Polygon (certificate verification) |
| **Secrets** | HashiCorp Vault (sidecar injection) |
| **Orchestration** | Kubernetes + Helm (HPA, PDB, cert-manager) |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                     │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ Admin Portal │ │Teacher Portal│ │Student Portal│ │Parent Portal │      │
│  │  :4000       │ │   :4001      │ │   :4002      │ │   :4003      │      │
│  │  Next.js 14  │ │  Next.js 14  │ │  Next.js 14  │ │  Next.js 14  │      │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘      │
│         │                │                │                │               │
│  ┌──────┴───────┐                                                          │
│  │ Mgmt Portal  │         ┌──────────────────────────────┐                 │
│  │   :4004      │         │     Expo Mobile App          │                 │
│  │  Next.js 14  │         │  iOS + Android (Expo 51)     │                 │
│  └──────────────┘         └──────────────────────────────┘                 │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS / WSS
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                        API GATEWAY (Nginx)                                  │
│              /api/v1/<service>  →  upstream microservice                    │
│              JWT validation + rate limiting + TLS termination               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ Internal HTTP
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                        MICROSERVICES LAYER                                  │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   Auth   │ │   User   │ │ Student  │ │ Academic │ │Attendance│        │
│  │  :3001   │ │  :3002   │ │  :3003   │ │  :3004   │ │  :3005   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   Fee    │ │  Notify  │ │   Exam   │ │   LMS    │ │    HR    │        │
│  │  :3006   │ │  :3007   │ │  :3008   │ │  :3009   │ │  :3010   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Payroll  │ │  Cert    │ │Admission │ │Transport │ │  Health  │        │
│  │  :3011   │ │  :3012   │ │  :3013   │ │  :3014   │ │  :3015   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Library  │ │  Event   │ │ Expense  │ │Scholarship│ │   Ops   │        │
│  │  :3016   │ │  :3017   │ │  :3018   │ │  :3019   │ │  :3020   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  Report  │ │   SaaS   │ │Dev API   │ │AI Service│ │Biometric │        │
│  │  :3021   │ │  :3022   │ │  :3023   │ │  :8000   │ │  :8080   │        │
│  │          │ │          │ │          │ │ FastAPI  │ │ Node.js  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────────┐
│                        DATA & MESSAGING LAYER                               │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ PostgreSQL16 │  │Redis Cluster │  │  Kafka x3    │  │  InfluxDB     │  │
│  │  (Prisma)    │  │  (6 nodes)   │  │  (Zookeeper) │  │  (IoT/90d)    │  │
│  │  Multi-tenant│  │  BullMQ jobs │  │  Topics x12  │  │  MQTT bridge  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │  HashiCorp   │  │  Polygon     │  │  MinIO / S3  │                     │
│  │   Vault      │  │  (Solidity)  │  │  (documents) │                     │
│  └──────────────┘  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Overview

All services share a single **PostgreSQL 16** cluster with row-level isolation per `tenant_id`. Prisma ORM manages all migrations.

### Core Tables (shared across services)

```sql
-- Tenant (SaaS multi-tenancy)
tenants { id, name, slug, plan, maxStudents, isActive, createdAt }

-- Users (unified across all portals)
users { id, tenantId, email, passwordHash, role, isActive, mfaEnabled, createdAt }
-- role: SUPER_ADMIN | ADMIN | PRINCIPAL | TEACHER | STUDENT | PARENT | ACCOUNTANT | LIBRARIAN | DRIVER | NURSE

-- Students
students { id, tenantId, admissionNo, name, dob, gender, class, section, rollNo,
           parentId, address, bloodGroup, photoUrl, isActive, apaarId, udiseNo }

-- Staff / Employees
staff { id, tenantId, employeeCode, name, designation, department, joinDate,
        email, phone, isActive, pfAccountNo, esiNo, bankAccountNo, ifscCode }
```

### Academic Tables

```sql
-- Classes & Sections
classes { id, tenantId, name, section, academicYear, teacherId, roomNo }

-- Subjects
subjects { id, tenantId, classId, name, code, maxMarks, passingMarks, isVocational, nsqfLevel }

-- Timetable
timetable { id, tenantId, classId, subjectId, teacherId, dayOfWeek, periodNo, startTime, endTime }

-- Lessons (LMS)
lessons { id, tenantId, subjectId, title, contentType, contentUrl, duration, order, isPublished }

-- Assignments
assignments { id, tenantId, lessonId, title, description, dueDate, maxMarks }

-- Submissions
submissions { id, tenantId, assignmentId, studentId, fileUrl, submittedAt,
              marksAwarded, feedback, plagiarismScore }

-- Exams
exams { id, tenantId, name, type, startDate, endDate, classId }

-- Exam Results
exam_results { id, tenantId, examId, studentId, subjectId, marksObtained,
               grade, rank, isAbsent }
```

### Attendance Tables

```sql
attendance { id, tenantId, studentId, date, status, markedBy, latitude, longitude }
-- status: PRESENT | ABSENT | LATE | EXCUSED | HOLIDAY

staff_attendance { id, tenantId, staffId, date, inTime, outTime, biometricId, status }
```

### Finance Tables

```sql
-- Fee Structure
fee_structures { id, tenantId, name, academicYear, classId, components JSONB, dueDate }
-- components: [{name, amount, isOptional, lateFeePerDay}]

-- Fee Payments
fee_payments { id, tenantId, studentId, feeStructureId, amountPaid, paymentDate,
               paymentMode, transactionId, receiptNo, lateFee }

-- Payroll
payrolls { id, tenantId, staffId, month, year, basicSalary, hra, da, ta,
           otherAllowances, pfDeduction, esiDeduction, tdsDeduction,
           advanceDeduction, netPay, status, approvedBy }

-- Expenses
expenses { id, tenantId, category, description, amount, date, paidTo,
           billUrl, approvedBy, budgetHeadId }

-- Budgets
budgets { id, tenantId, academicYear, headName, allocatedAmount, spentAmount }

-- Scholarships
scholarships { id, tenantId, name, criteria JSONB, amountRs, renewable,
               fundedBy, disbursements JSONB }
```

### Operations Tables

```sql
-- Transport
routes { id, tenantId, name, stops JSONB, driverId, vehicleNo, capacity }
student_transport { id, tenantId, studentId, routeId, stopName, pickupTime, dropTime }

-- Health
health_records { id, tenantId, studentId, visitDate, complaint, diagnosis,
                 treatment, referredTo, nursId }
vaccinations { id, tenantId, studentId, vaccineName, doseNo, scheduledDate, givenDate }

-- Library
books { id, tenantId, isbn, title, author, publisher, edition, category,
        totalCopies, availableCopies, location }
book_issues { id, tenantId, bookId, memberId, memberType, issueDate, dueDate,
              returnDate, fineAmountRs }

-- Visitors
visitors { id, tenantId, name, phone, purpose, hostName, checkIn, checkOut,
           photoUrl, badgeNo }

-- Events
events { id, tenantId, title, description, startDate, endDate, venue,
         organizer, registrations JSONB, budget, status }

-- Hostel
hostel_rooms { id, tenantId, block, roomNo, capacity, type, floor, currentOccupancy }
hostel_allotments { id, tenantId, studentId, roomId, bedNo, fromDate, toDate,
                    depositPaid, guardianContact }
hostel_leave { id, tenantId, studentId, fromDate, toDate, type, wardenApproved,
               parentApproved, gatePassNo }
```

### Compliance & Niche Tables

```sql
-- POSH/POCSO
icc_members { id, tenantId, name, designation, memberType, joinDate, expiryDate }
posh_complaints { id, tenantId, ref, complainantName, isAnonymous, respondentName,
                  incidentDate, filedAt, deadline90d, status, resolution }
pocso_incidents { id, tenantId, ref, victimClass, reportedBy, incidentDate,
                  filingDeadline24h, policeReported, status }

-- RTE
rte_applications { id, tenantId, studentName, dob, category, incomeProofUrl,
                   applicationDate, lotteryRound, allotted, admissionNo }

-- IEP / CWSN
cwsn_profiles { id, tenantId, studentId, disabilityType, udid, udidVerified,
                govtBenefits TEXT[], specialEducatorId }
iep_plans { id, tenantId, studentId, academicYear, goals JSONB, startDate,
            reviewDate, parentSignedAt, status }
exam_accommodations { id, tenantId, studentId, examId, accommodations TEXT[] }

-- Gamification
gamification_points { id, tenantId, studentId, action, points, awardedAt }
badges_awarded { id, tenantId, studentId, badgeId, badgeName, tier, awardedAt }
streaks { id, tenantId, studentId, currentStreak, longestStreak, lastActivityDate }
rewards { id, tenantId, name, description, pointCost, stock, category }
reward_redemptions { id, tenantId, studentId, rewardId, redeemedAt, pointsSpent }

-- International
ib_units { id, tenantId, studentId, programme, theme, title, subjectId,
           centralIdea, lines JSONB, status }
cambridge_entries { id, tenantId, studentId, subject, level, centreNo,
                    candidateNo, session, predictedGrade }
foreign_students { id, tenantId, studentId, nationality, passportNo, passportExpiry,
                   visaType, visaExpiry, studentPermitNo, permitExpiry }

-- Insurance
insurance_policies { id, tenantId, insurer, policyNo, sumAssuredRs, premiumRs,
                     coverageStart, coverageEnd, totalCovered }
insurance_claims { id, tenantId, policyId, studentId, accidentDate, claimAmountRs,
                   status, settlementRs, filedAt }

-- Accreditation
accreditation_frameworks { id, tenantId, framework, accreditationBody, targetYear,
                            currentScore, targetScore }
ssr_data { id, tenantId, frameworkId, criterionCode, value, evidenceUrl, submittedAt }
improvement_actions { id, tenantId, frameworkId, criterion, action, responsible,
                      targetDate, status, closedAt }
```

---

## 4. Microservices — Ports & Responsibilities

| Service | Port | Stack | Responsibilities |
|---|---|---|---|
| **auth-service** | 3001 | NestJS | JWT issue/refresh, MFA (TOTP), session management, brute-force protection, impossible-travel detection |
| **user-service** | 3002 | NestJS | User CRUD, role assignment, password reset, GDPR erasure (30-day pseudonymisation), profile photo |
| **student-service** | 3003 | NestJS | Student CRUD, CWSN/IEP, gamification engine, mentoring, portfolio, digital ID, pre-primary milestones |
| **academic-service** | 3004 | NestJS | Classes, timetable, subjects, homework, curriculum mapping, competency tracking, FLN, vocational/NSQF |
| **attendance-service** | 3005 | NestJS | Student/staff attendance, biometric sync, geo-fenced check-in, BLE beacon, monthly reports |
| **fee-service** | 3006 | NestJS | Fee structure, payment (Razorpay/Stripe), receipts, late fee, concessions, due alerts, foreign FX |
| **notification-service** | 3007 | NestJS | FCM push, SMS (Twilio), Email (SendGrid), WhatsApp (Meta API), in-app, templates, bulk send |
| **exam-service** | 3008 | NestJS | Exam scheduling, hall tickets, mark entry, grade calculation, rank list, progress cards, CBT |
| **lms-service** | 3009 | NestJS | Video lessons, SCORM/PDF content, quizzes, plagiarism (BullMQ), live class (Daily.co), recordings |
| **hr-service** | 3010 | NestJS | Staff onboarding, leave management, appraisal (5-level BARS), transfer, increment, documents |
| **payroll-service** | 3011 | NestJS | Salary computation, EPF/ESI/TDS/PT, slip PDF, bank NEFT file, advance deduction, payroll lock |
| **certificate-service** | 3012 | NestJS | TC/BC/CC/migration generation (Puppeteer PDF), Polygon blockchain hash, QR verification |
| **admission-service** | 3013 | NestJS | Online application, document upload, shortlisting, interview scheduling, fee payment, enrolment |
| **transport-service** | 3014 | NestJS | Route/stop management, driver assignment, GPS live tracking (MQTT), parent notifications |
| **health-service** | 3015 | NestJS | Visit records, vaccinations, infirmary stock, BMI tracking, health camp, emergency contacts |
| **library-service** | 3016 | NestJS | Book catalogue, issue/return, fine, reservation, e-books, OPAC search, overdue alerts |
| **event-service** | 3017 | NestJS | Events calendar, registration, attendance, budget, media gallery, magazine/yearbook |
| **expense-service** | 3018 | NestJS | Expense claims, budget heads, approval workflow, vendor ledger, P&L summary |
| **scholarship-service** | 3019 | NestJS | Scheme management, auto-eligibility check, disbursement, renewal, compliance reports |
| **ops-service** | 3020 | NestJS | Compliance (POSH/POCSO/RTE/Labour), hostel, MDM, feature flags, international (IB/FX), insurance, accreditation |
| **report-service** | 3021 | NestJS | Cross-service aggregated reports, PDF/Excel export, scheduled email delivery, dashboard KPIs |
| **saas-service** | 3022 | NestJS | Tenant provisioning, plan management, usage metering, billing (Stripe), white-labelling |
| **developer-api** | 3023 | NestJS | Third-party REST API (rate-limited), OAuth2 app registration, webhook management, API key issuance |
| **ai-service** | 8000 | Python FastAPI | Dropout prediction, attendance anomaly, smart timetable (OR-Tools VRP), fee defaulter risk, essay grading |
| **biometric-bridge** | 8080 | Node.js | ZKTeco SDK bridge, device polling (TCP/IP), MQTT publisher, fallback manual sync |

---

## 5. API Endpoints by Service

### auth-service (:3001)

```
POST   /auth/login                    # email+password → JWT pair
POST   /auth/refresh                  # refresh token → new access token
POST   /auth/logout                   # invalidate refresh token
POST   /auth/mfa/setup                # generate TOTP QR
POST   /auth/mfa/verify               # TOTP code verification
POST   /auth/password/reset-request   # send reset email
POST   /auth/password/reset           # set new password with token
GET    /auth/sessions                  # list active sessions (user)
DELETE /auth/sessions/:id             # revoke session
```

### user-service (:3002)

```
GET    /users                          # list (paginated, role-filtered)
POST   /users                          # create user
GET    /users/:id                      # get user
PATCH  /users/:id                      # update user
DELETE /users/:id                      # soft delete
POST   /users/:id/assign-role          # change role
POST   /users/:id/gdpr-erase           # GDPR right-to-erasure
POST   /users/:id/photo                # upload profile photo
```

### student-service (:3003)

```
GET    /students                       # list students (class/section filter)
POST   /students                       # enrol student
GET    /students/:id                   # student profile
PATCH  /students/:id                   # update profile
DELETE /students/:id                   # withdraw

# CWSN / IEP
POST   /students/:id/cwsn              # set CWSN profile
POST   /students/:id/iep               # create IEP plan
GET    /students/:id/iep               # get IEP plans
POST   /students/:id/iep/:iepId/review # conduct term review
POST   /students/:id/exam-accommodations # set accommodations

# Gamification
POST   /students/:id/points            # award points
GET    /students/:id/points            # total points balance
GET    /students/:id/badges            # badges earned
POST   /students/leaderboard/:classId  # class leaderboard
GET    /students/leaderboard/house     # house leaderboard
POST   /students/:id/rewards/redeem    # redeem reward
GET    /students/:id/portfolio         # digital portfolio

# Pre-Primary
POST   /students/:id/activities        # record daily activity
GET    /students/:id/milestones        # developmental milestones
POST   /students/:id/milestones/:code  # update milestone
POST   /students/:id/pickup-verify     # verify authorised pickup

# Mentoring
POST   /students/:id/mentor            # assign mentor
POST   /students/:id/mentor/meeting    # log mentoring session
GET    /students/:id/mentor/report     # effectiveness report
```

### academic-service (:3004)

```
# Classes & Timetable
GET/POST /classes
GET/POST /classes/:id/timetable
GET/POST /subjects

# Homework
POST   /homework                       # create assignment
GET    /homework/:classId              # assignments for class
POST   /homework/:id/submit            # student submission
POST   /homework/:id/grade             # teacher grading

# Vocational / NEP
POST   /vocational/subjects            # create vocational subject
POST   /vocational/ojt                 # assign OJT
POST   /vocational/ojt/:id/attendance  # record OJT attendance
POST   /vocational/competency          # assess competency
GET    /vocational/holistic-card/:id   # holistic progress card

# FLN
GET    /fln/dashboard                  # FLN dashboard (Gr 1–3)
POST   /fln/:studentId/level           # update FLN level

# Curriculum Mapping
POST   /curriculum/lesson-outcome      # map lesson to learning outcome
GET    /curriculum/outcomes/:classId   # outcomes progress
```

### attendance-service (:3005)

```
POST   /attendance/mark                # bulk mark (teacher)
POST   /attendance/biometric           # biometric sync event
GET    /attendance/:classId/:date      # daily register
GET    /attendance/student/:id/monthly # monthly report
POST   /attendance/staff/mark          # staff attendance
GET    /attendance/staff/:id/monthly   # staff monthly
GET    /attendance/analytics           # school-wide analytics
```

### fee-service (:3006)

```
GET/POST  /fee-structures              # fee structure CRUD
POST      /payments                    # record payment (Razorpay webhook)
GET       /payments/student/:id        # payment history
GET       /payments/receipt/:id        # generate PDF receipt
GET       /fee/defaulters              # overdue list
POST      /fee/concession              # apply concession
POST      /fee/foreign-currency        # FX payment (live rate)
GET       /fee/report                  # collection summary
```

### exam-service (:3008)

```
GET/POST  /exams                       # exam CRUD
POST      /exams/:id/hall-tickets      # generate hall tickets (PDF)
POST      /exams/:id/marks             # bulk mark entry
GET       /exams/:id/result/:studentId # individual result
GET       /exams/:id/rank-list         # class rank list
GET       /exams/:id/progress-card/:id # progress card PDF
GET       /exams/cbt/:id               # online CBT delivery
```

### lms-service (:3009)

```
GET/POST  /lessons                     # lesson CRUD
POST      /lessons/:id/quiz            # add quiz
POST      /lessons/:id/enrol           # student enrolment
POST      /lessons/:id/progress        # update progress
POST      /assignments/:id/submit      # submit with plagiarism scan
GET       /assignments/:id/plagiarism  # plagiarism report
POST      /live-class                  # create Daily.co room
```

### hr-service (:3010)

```
GET/POST  /staff                       # staff CRUD
POST      /staff/:id/onboard           # onboarding checklist
GET/POST  /leave/types                 # leave policy
POST      /leave/apply                 # apply leave
PATCH     /leave/:id/approve           # approve/reject
GET       /leave/:staffId/balance      # leave balance
POST      /appraisal                   # create appraisal
PATCH     /appraisal/:id/submit        # submit ratings
GET       /appraisal/:staffId          # appraisal history
```

### payroll-service (:3011)

```
POST   /payroll/run/:month/:year       # run payroll batch
GET    /payroll/:staffId/:month/:year  # individual payslip
POST   /payroll/:id/approve            # approve payroll
GET    /payroll/slip/:id/pdf           # payslip PDF
GET    /payroll/epf/ecr                # EPF ECR 2.0 export
GET    /payroll/esi/challan            # ESI challan
GET    /payroll/bank/neft              # NEFT bank file
GET    /payroll/wage-compliance        # minimum wage check
```

### certificate-service (:3012)

```
POST   /certificates/tc                # Transfer Certificate
POST   /certificates/bc                # Bonafide Certificate
POST   /certificates/cc                # Character Certificate
POST   /certificates/migration         # Migration Certificate
GET    /certificates/:id/pdf           # download PDF
GET    /certificates/verify/:hash      # blockchain verification (public)
```

### ops-service (:3020)

```
# Compliance
GET    /compliance/calendar            # annual compliance calendar
POST   /compliance/posh/complaint      # file POSH complaint
POST   /compliance/pocso/incident      # report POCSO incident
GET    /compliance/posh/report         # annual POSH report
POST   /compliance/rte/application     # RTE application
POST   /compliance/rte/lottery         # conduct RTE lottery
GET    /compliance/labour/epf/ecr      # EPF ECR
GET    /compliance/udise               # UDISE data package

# Hostel
GET    /hostel/rooms                   # room occupancy
POST   /hostel/allot                   # allot bed
POST   /hostel/leave                   # apply leave
PATCH  /hostel/leave/:id/approve       # approve leave
POST   /hostel/rollcall                # night roll call

# MDM
POST   /mdm/devices                    # register device
POST   /mdm/lesson-mode                # activate lesson mode (restrict devices)
POST   /mdm/lock/:deviceId             # remote lock
POST   /mdm/wipe/:deviceId             # remote wipe

# Feature Flags
GET    /flags                          # list all flags
POST   /flags                          # create flag
PATCH  /flags/:key                     # update flag / set rollout %
POST   /flags/:key/kill-switch         # activate kill switch
GET    /flags/:key/evaluate            # evaluate flag for context

# International
POST   /international/ib/unit          # save IB unit of inquiry
POST   /international/cambridge/entry  # Cambridge entry details
GET    /international/cas/:studentId   # CAS hours progress
POST   /international/fx/payment       # foreign currency fee payment
GET    /international/docs/expiring    # expiring documents alert

# Insurance
POST   /insurance/policy               # set policy
POST   /insurance/claims               # file claim
PATCH  /insurance/claims/:id/status    # update claim status

# Accreditation
POST   /accreditation/framework        # set quality framework
GET    /accreditation/ssr              # compile SSR data
GET    /accreditation/readiness        # readiness checklist
POST   /accreditation/actions          # log improvement action
```

### ai-service (:8000) — FastAPI

```
POST   /ai/dropout-risk                # dropout probability per student
POST   /ai/attendance-anomaly          # detect anomalous patterns
POST   /ai/timetable/generate          # OR-Tools MILP timetable solver
POST   /ai/fee-defaulter-risk          # payment default prediction
POST   /ai/essay/grade                 # AI essay grading (Anthropic API)
POST   /ai/chat                        # school assistant chatbot
GET    /ai/health                      # service health
```

---

## 6. Frontend Portals & Pages

### Admin Portal (:4000) — Next.js 14

```
/                           # Dashboard (KPIs, charts)
/students                   # Student management
/students/[id]              # Student profile
/staff                      # Staff directory
/classes                    # Class & section management
/timetable                  # Timetable builder
/attendance                 # Attendance overview
/exams                      # Exam management
/exams/[id]/marks           # Mark entry
/lms                        # Content management
/fee                        # Fee structures
/fee/payments               # Payments & receipts
/fee/defaulters             # Defaulter list
/payroll                    # Payroll processing
/payroll/[month]/[year]     # Monthly payroll
/hr                         # HR management
/leave                      # Leave management
/admission                  # Admission pipeline
/transport                  # Route management
/transport/live             # GPS live tracking
/health                     # Health centre
/library                    # Library management
/events                     # Events calendar
/expense                    # Expense claims
/scholarship                # Scholarship management
/reports                    # Report builder
/certificates               # Certificate issuance
/compliance                 # Annual compliance calendar
/hostel                     # Hostel management
/iot                        # IoT sensor dashboard
/iot/thresholds             # Alert threshold config
/iot/report                 # Monthly IoT report
/gamification               # Points, badges, leaderboard
/international              # IB/Cambridge/Foreign students
/special-education          # CWSN/IEP management
/vocational                 # Vocational + NEP/FLN
/discipline                 # Discipline incident log
/insurance                  # Insurance policy & claims
/feature-flags              # Feature flag console
/feature-flags/beta         # Beta program schools
/saas                       # Tenant management (super-admin)
/settings                   # School settings
```

### Teacher Portal (:4001)

```
/                           # My Classes & today's timetable
/attendance/[classId]       # Mark attendance
/homework                   # Assignment management
/homework/[id]/submissions  # View & grade submissions
/exams/[id]/marks           # Enter marks
/lms/lessons                # Upload/manage lessons
/students/[id]              # Student profile (read-only)
/leave                      # My leave applications
/appraisal                  # Self-appraisal form
```

### Student Portal (:4002)

```
/                           # My Dashboard
/timetable                  # Class timetable
/attendance                 # My attendance record
/homework                   # Pending assignments
/homework/[id]              # Submit assignment
/exams                      # Exam schedule
/exams/[id]/result          # My result
/lms/[subjectId]            # Course content
/fee                        # Fee dues & payment
/library                    # My borrowed books
/certificates               # Request certificate
/gamification               # My points & badges
/portfolio                  # Digital portfolio
```

### Parent Portal (:4003)

```
/                           # Children overview
/[childId]/attendance       # Child attendance
/[childId]/results          # Academic results
/[childId]/homework         # Homework status
/[childId]/health           # Health records
/fee                        # Pay fees online
/transport/[childId]        # Bus live tracking
/notifications              # All notifications
/ptm                        # Book PTM appointment
```

### Management Portal (:4004)

```
/                           # Executive dashboard
/analytics                  # Business intelligence charts
/finance                    # Revenue vs expense P&L
/staff-performance          # HR analytics
/enrolment                  # Admission funnel
/compliance                 # Compliance status
/saas                       # SaaS usage & billing (super-admin)
```

---

## 7. Mobile App

**Stack:** Expo 51, expo-router, React Native, Zustand, AsyncStorage, React Query

```
app/
  (auth)/
    login.tsx               # Login screen (JWT)
    mfa.tsx                 # MFA screen
  (tabs)/
    index.tsx               # Home (role-aware)
    attendance.tsx          # Mark/view attendance
    timetable.tsx           # Weekly timetable
    homework.tsx            # Assignments
    notifications.tsx       # Push notifications
  student/
    [id].tsx                # Student profile
  exam/
    [id]/results.tsx        # Results viewer
  fee/
    index.tsx               # Dues
    pay.tsx                 # Razorpay checkout
  transport/
    live.tsx                # GPS bus tracking
  offline/
    sync.tsx                # Offline sync manager
```

**Key Features:**
- Offline-first with Zustand persist + SQLite
- Push notifications (Expo Notifications → FCM/APNs)
- Biometric login (Expo LocalAuthentication)
- Background location for bus tracking
- Deep-link support (`aischool://...`)

---

## 8. Auth, RBAC & Middleware

### JWT Flow

```
Login → auth-service issues {accessToken (15m), refreshToken (7d)}
       → accessToken stored in memory (not localStorage)
       → refreshToken in HttpOnly cookie
       → Silent refresh via /auth/refresh before expiry
```

### Roles & Permissions

| Role | Can Do |
|---|---|
| `SUPER_ADMIN` | All tenants, all services, SaaS management |
| `ADMIN` | All within tenant |
| `PRINCIPAL` | Academics, staff, reports, discipline, compliance |
| `TEACHER` | Own classes: attendance, marks, homework, lessons |
| `STUDENT` | Own data: results, homework, fee, library |
| `PARENT` | Children's data: attendance, results, health, fee |
| `ACCOUNTANT` | Fee, payroll, expense, scholarship |
| `LIBRARIAN` | Library operations |
| `DRIVER` | Transport route, GPS update |
| `NURSE` | Health records, vaccination |

### Security Middleware

- **JwtAuthGuard** — validates Bearer token on every protected route
- **RolesGuard** — `@Roles(...)` decorator enforcement
- **TenantGuard** — injects `tenantId` from JWT claims, enforces row-level isolation
- **RateLimitGuard** — Redis sliding window (100 req/min per user, 10 req/min for login)
- **AuditInterceptor** — HMAC-SHA256 chained log for all mutating operations
- **SessionAnomalyGuard** — detects impossible travel, new IP, concurrent sessions

---

## 9. AI / ML Service

**Stack:** Python 3.12, FastAPI, scikit-learn, pandas, numpy, OR-Tools, Anthropic API

### Models

| Model | Algorithm | Features | Output |
|---|---|---|---|
| Dropout Risk | Random Forest | attendance%, fee_overdue_days, exam_score_trend, parent_engagement | probability 0–1 |
| Fee Defaulter | Gradient Boosting | payment_history, family_income_band, sibling_count, overdue_days | risk_level: LOW/MED/HIGH |
| Attendance Anomaly | Isolation Forest | daily_attendance%, absent_run_length, weather_events | anomaly_score |
| Timetable | OR-Tools MILP | constraints: teacher_availability, room_capacity, subject_gaps | weekly timetable JSON |
| Essay Grader | Anthropic claude-sonnet-4-6 | student_essay, rubric | score + feedback |

### Retraining

- Models retrained weekly via BullMQ cron job
- Feature data pulled from PostgreSQL read replica
- Model artefacts stored in MinIO (`.pkl` + metadata JSON)
- Version-tagged; A/B tested via feature flags before promotion

---

## 10. Deployment — Docker / Kubernetes / Helm

### Docker Compose (local/staging)

```yaml
# Each service has its own Dockerfile (multi-stage, node:20-alpine)
# docker-compose.yml at root spins up:
#   - All 25 NestJS services
#   - postgres (5432), redis x6 (6379-6384), kafka x3, zookeeper x3
#   - influxdb (8086), mosquitto (1883), minio (9000)
#   - nginx (80/443), vault (8200)
#   - All Next.js portals + AI service + biometric-bridge
```

### Kubernetes (production)

```
infrastructure/k8s/
  namespace.yaml              # aischool namespace
  services/
    auth-service/
      deployment.yaml         # 3 replicas, resource limits, liveness/readiness
      service.yaml            # ClusterIP
      hpa.yaml                # HPA (CPU 70%, min 2, max 10)
      pdb.yaml                # PodDisruptionBudget (minAvailable: 1)
    [... same for all 25 services ...]
  ingress/
    ingress.yaml              # Nginx Ingress, TLS via cert-manager (Let's Encrypt)
  config/
    vault-agent-config.yaml   # Vault sidecar injection
    redis-cluster.yaml        # 6-node Redis Cluster StatefulSet
    kafka-statefulset.yaml    # 3-broker Kafka + Zookeeper quorum
    postgres-statefulset.yaml # PostgreSQL with Patroni HA
```

### Helm Chart

```
helm/aischool/
  Chart.yaml
  values.yaml                 # image tags, replicas, ingress host, vault config
  values-prod.yaml            # production overrides
  templates/
    _helpers.tpl
    deployment.yaml           # parameterised for all services
    service.yaml
    hpa.yaml
    ingress.yaml
    secrets.yaml              # pulls from Vault via ESO
```

### CI/CD (.github/workflows/)

```
ci.yml      # On PR: pnpm install → lint → test (Jest) → build
cd.yml      # On main push: Docker build → push to GHCR → Helm upgrade --install
```

---

## 11. Infrastructure & Integrations

### Message Topics (Kafka)

| Topic | Producer | Consumers |
|---|---|---|
| `attendance.marked` | attendance-service | notification-service, report-service |
| `fee.payment.received` | fee-service | notification-service, report-service |
| `exam.results.published` | exam-service | notification-service, student-service |
| `student.enrolled` | admission-service | student-service, notification-service, fee-service |
| `payroll.approved` | payroll-service | notification-service, report-service |
| `transport.gps.update` | biometric-bridge | transport-service |
| `biometric.punch` | biometric-bridge | attendance-service |
| `iot.sensor.reading` | MQTT bridge | ops-service (InfluxDB write) |
| `compliance.alert` | ops-service | notification-service |
| `incident.posh` | ops-service | notification-service (ICC) |
| `ai.prediction.ready` | ai-service | report-service |
| `certificate.issued` | certificate-service | notification-service, blockchain |

### Third-Party Integrations

| Integration | Service | Purpose |
|---|---|---|
| **Razorpay** | fee-service | Online fee payment |
| **Stripe** | saas-service, fee-service | SaaS billing + international payments |
| **Twilio SMS** | notification-service | OTP, attendance alerts |
| **SendGrid** | notification-service | Transactional email |
| **Meta WhatsApp API** | notification-service | Parent daily reports |
| **FCM / APNs** | notification-service | Mobile push |
| **Google Workspace** | ops-service | Edu email provisioning |
| **Microsoft 365 EDU** | ops-service | Email + OneDrive |
| **Daily.co** | lms-service | Live video classes |
| **ZKTeco SDK** | biometric-bridge | Fingerprint/face device |
| **Polygon RPC** | certificate-service | Certificate hash on-chain |
| **Anthropic API** | ai-service | Essay grading, chatbot |
| **OR-Tools** | ai-service | MILP timetable optimisation |
| **Jamf Pro** | ops-service | iOS/macOS MDM |
| **Microsoft Intune** | ops-service | Android/Windows MDM |
| **exchangerate-api** | ops-service | Live FX rates |
| **Puppeteer** | certificate-service, report-service | PDF generation |
| **MinIO** | multiple | Document / media storage |
| **HashiCorp Vault** | all services | Secrets management |

---

## 12. Security Architecture

### Authentication

- Argon2id password hashing (time: 3, mem: 64MB, parallelism: 4)
- TOTP MFA (RFC 6238, 30s window)
- JWT RS256 (asymmetric signing, 2048-bit RSA)
- HttpOnly SameSite=Strict refresh token cookie

### Session Security

- Concurrent session limit (5 per user)
- Impossible-travel detection (>500km/hr → force re-auth)
- New-IP alert with email notification
- Brute-force lockout (5 failures → 15-min lockout)

### Data Security

- PostgreSQL row-level security (tenant_id isolation)
- GDPR right-to-erasure: 30-day pseudonymisation pipeline
- POSH/POCSO anonymous complaint support
- Audit log chain: `SHA256(prev_hash + action + timestamp + actor + data)` — immutable

### Network Security

- mTLS between internal services (Istio service mesh)
- Nginx rate limiting + geo-blocking (configurable)
- HSTS, X-Content-Type-Options, X-Frame-Options, CSP headers
- CORS allowlist per portal domain

### Secrets Management

- All secrets in HashiCorp Vault (AppRole auth)
- Vault Agent sidecar injects secrets as env vars (never baked into images)
- Secrets rotation: DB passwords rotate every 30 days

---

## 13. Observability Stack

```
Metrics:  Prometheus (scrapes /metrics from all services)
Dashboards: Grafana (pre-built dashboards per service)
Tracing:  Jaeger (OpenTelemetry SDK in every NestJS service)
Logs:     ELK Stack (Elasticsearch + Logstash + Kibana)
          Structured JSON logs, correlation ID propagation
Alerts:   Alertmanager → PagerDuty / Slack
Uptime:   Healthcheck endpoint (/health) on every service
```

### Key Dashboards

| Dashboard | Metrics |
|---|---|
| API Gateway | RPS, P99 latency, error rate, 4xx/5xx |
| Auth Service | Login success/failure, MFA usage, session count |
| Fee Service | Daily collection, payment method split, defaulter count |
| AI Service | Prediction latency, model accuracy drift, API cost |
| Kafka | Consumer lag per topic, broker throughput |
| Database | Query duration P99, connection pool usage, replication lag |
| IoT | Sensor data ingestion rate, threshold breach frequency |

---

## 14. Feature Flags & A/B Testing

**Implementation:** Redis-backed with deterministic hash rollout

```typescript
// 5-step evaluation chain:
// 1. Kill switch active? → false (emergency shutdown)
// 2. Tenant override? → use tenant-specific value
// 3. Beta school? → true (if tenant in beta list)
// 4. Hash rollout: SHA256(tenantId + flagKey) % 100 < rollout% → true
// 5. Global default

// Rollout stages: 0% → 5% → 20% → 50% → 100%
// Auto-rollback: if error rate > 5%, kill switch activates automatically
```

**Managed Flags:**

| Flag | Default | Purpose |
|---|---|---|
| `ai-essay-grading` | 0% | AI essay grading (Anthropic) |
| `blockchain-cert` | 50% | Polygon certificate verification |
| `live-class-v2` | 20% | New Daily.co live class UI |
| `gamification` | 100% | Points & badges system |
| `multi-currency-fee` | 0% | Foreign currency payments |
| `mdm-lesson-mode` | 5% | Device lockdown during lessons |

---

## 15. Environment Variables

```bash
# ── Shared ──────────────────────────────────────────────────────────────────
NODE_ENV=production
TENANT_ID=auto-injected-by-vault-sidecar

# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@postgres:5432/aischool
DATABASE_REPLICA_URL=postgresql://user:pass@postgres-replica:5432/aischool

# ── Redis ────────────────────────────────────────────────────────────────────
REDIS_NODES=redis-0:6379,redis-1:6380,redis-2:6381,redis-3:6382,redis-4:6383,redis-5:6384

# ── Kafka ────────────────────────────────────────────────────────────────────
KAFKA_BROKERS=kafka-0:9092,kafka-1:9092,kafka-2:9092

# ── JWT ──────────────────────────────────────────────────────────────────────
JWT_PRIVATE_KEY=<RSA private key PEM>
JWT_PUBLIC_KEY=<RSA public key PEM>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ── Services ─────────────────────────────────────────────────────────────────
AUTH_SERVICE_URL=http://auth-service:3001
NOTIFICATION_SERVICE_URL=http://notification-service:3007
AI_SERVICE_URL=http://ai-service:8000

# ── Payments ─────────────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=<from vault>
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# ── Notifications ────────────────────────────────────────────────────────────
SENDGRID_API_KEY=SG.xxxx
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=<from vault>
TWILIO_PHONE_NUMBER=+1xxxx
FCM_SERVER_KEY=<from vault>
META_WHATSAPP_TOKEN=<from vault>
META_PHONE_NUMBER_ID=xxxx

# ── AI ───────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxxx

# ── Storage ──────────────────────────────────────────────────────────────────
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=xxxx
MINIO_SECRET_KEY=<from vault>
MINIO_BUCKET=aischool-docs

# ── Blockchain ───────────────────────────────────────────────────────────────
POLYGON_RPC_URL=https://polygon-rpc.com
CERTIFICATE_CONTRACT_ADDRESS=0xxxxx
DEPLOYER_PRIVATE_KEY=<from vault>

# ── IoT ──────────────────────────────────────────────────────────────────────
MQTT_BROKER_URL=mqtt://mosquitto:1883
INFLUXDB_URL=http://influxdb:8086
INFLUXDB_TOKEN=<from vault>
INFLUXDB_ORG=aischool
INFLUXDB_BUCKET=iot-sensors

# ── MDM ──────────────────────────────────────────────────────────────────────
JAMF_BASE_URL=https://school.jamfcloud.com
JAMF_CLIENT_ID=xxxx
JAMF_CLIENT_SECRET=<from vault>
INTUNE_TENANT_ID=xxxx
INTUNE_CLIENT_ID=xxxx
INTUNE_CLIENT_SECRET=<from vault>

# ── Vault ────────────────────────────────────────────────────────────────────
VAULT_ADDR=http://vault:8200
VAULT_ROLE_ID=xxxx
VAULT_SECRET_ID=<injected at runtime>

# ── External APIs ────────────────────────────────────────────────────────────
EXCHANGERATE_API_KEY=xxxx
DAILY_CO_API_KEY=xxxx
DAILY_CO_DOMAIN=school.daily.co
GOOGLE_WORKSPACE_ADMIN_EMAIL=admin@school.edu
GOOGLE_SERVICE_ACCOUNT_JSON=<base64-encoded>

# ── Biometric ────────────────────────────────────────────────────────────────
ZK_DEVICE_IP=192.168.1.100
ZK_DEVICE_PORT=4370

# ── Portals (Next.js) ────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://api.aischool.app
NEXT_PUBLIC_WS_URL=wss://api.aischool.app
NEXT_PUBLIC_MAPS_KEY=AIzaxxxx
```

---

## 16. How to Run Locally

### Prerequisites

```bash
node >= 20
pnpm >= 9
docker + docker compose >= 2.24
python >= 3.12 (for ai-service)
```

### Setup

```bash
# 1. Clone
git clone https://github.com/arafat233/aischool-erp.git
cd AISchool

# 2. Set pnpm path
export PNPM_HOME="/Users/$USER/Library/pnpm"
export PATH="$PNPM_HOME:$PATH"

# 3. Install all dependencies
pnpm install

# 4. Copy env files
cp .env.example .env
# Edit .env with your local values

# 5. Start infrastructure (Postgres, Redis, Kafka, InfluxDB, Mosquitto, MinIO)
docker compose up -d postgres redis-0 redis-1 redis-2 redis-3 redis-4 redis-5 \
  kafka-0 kafka-1 kafka-2 zookeeper-0 zookeeper-1 zookeeper-2 \
  influxdb mosquitto minio vault

# 6. Run Prisma migrations
pnpm --filter @aischool/prisma db:migrate

# 7. Seed development data
pnpm --filter @aischool/prisma db:seed

# 8. Start all services (Turborepo parallel)
pnpm dev

# Individual services:
pnpm --filter auth-service dev           # :3001
pnpm --filter student-service dev        # :3003
pnpm --filter admin-portal dev           # :4000

# AI Service (Python):
cd apps/ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Useful Scripts

```bash
pnpm build              # Build all packages and apps
pnpm test               # Run all Jest tests
pnpm lint               # ESLint + Prettier check
pnpm type-check         # TypeScript check all packages

# Database
pnpm db:studio          # Prisma Studio (visual DB browser)
pnpm db:reset           # Drop + recreate + seed

# Docker (full stack)
docker compose up -d    # Start everything
docker compose logs -f auth-service   # Tail service logs
docker compose down -v  # Tear down + remove volumes
```

---

## 17. Full File Structure

```
AISchool/
├── apps/
│   ├── auth-service/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── mfa.service.ts
│   │   │   │   └── session-anomaly.service.ts
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── user-service/
│   │   └── src/
│   │       ├── users/
│   │       │   ├── users.controller.ts
│   │       │   ├── users.service.ts
│   │       │   └── gdpr.service.ts
│   │       └── main.ts
│   ├── student-service/
│   │   └── src/
│   │       ├── students/
│   │       ├── special-education/
│   │       │   └── iep.service.ts
│   │       ├── gamification/
│   │       │   └── gamification.service.ts
│   │       ├── pre-primary/
│   │       └── mentoring/
│   │           └── mentoring.service.ts
│   ├── academic-service/
│   │   └── src/
│   │       ├── classes/
│   │       ├── timetable/
│   │       ├── subjects/
│   │       ├── homework/
│   │       ├── vocational/
│   │       │   └── vocational.service.ts
│   │       ├── curriculum/
│   │       └── fln/
│   ├── attendance-service/
│   ├── fee-service/
│   ├── notification-service/
│   ├── exam-service/
│   ├── lms-service/
│   ├── hr-service/
│   ├── payroll-service/
│   ├── certificate-service/
│   │   └── src/
│   │       ├── certificate/
│   │       │   └── certificate.service.ts
│   │       └── blockchain/
│   │           └── blockchain.service.ts
│   ├── admission-service/
│   ├── transport-service/
│   ├── health-service/
│   ├── library-service/
│   ├── event-service/
│   │   └── src/
│   │       ├── events/
│   │       └── magazine/
│   │           └── magazine.service.ts
│   ├── expense-service/
│   ├── scholarship-service/
│   ├── ops-service/
│   │   └── src/
│   │       ├── compliance/
│   │       │   ├── posh.service.ts
│   │       │   ├── labour-compliance.service.ts
│   │       │   └── rte.service.ts
│   │       ├── hostel/
│   │       │   └── hostel.service.ts
│   │       ├── mdm/
│   │       │   └── mdm.service.ts
│   │       ├── feature-flags/
│   │       │   └── feature-flags.service.ts
│   │       ├── international/
│   │       │   └── international.service.ts
│   │       ├── niche/
│   │       │   └── niche-modules.service.ts
│   │       ├── insurance/
│   │       └── accreditation/
│   │           └── accreditation.service.ts
│   ├── report-service/
│   ├── saas-service/
│   ├── developer-api/
│   ├── ai-service/
│   │   ├── main.py
│   │   ├── models/
│   │   │   ├── dropout_risk.py
│   │   │   ├── fee_defaulter.py
│   │   │   ├── attendance_anomaly.py
│   │   │   ├── timetable_solver.py
│   │   │   └── essay_grader.py
│   │   ├── routers/
│   │   └── requirements.txt
│   ├── biometric-bridge/
│   │   └── src/
│   │       ├── zklib/
│   │       ├── mqtt/
│   │       └── index.ts
│   ├── admin-portal/
│   │   └── src/app/
│   │       ├── (auth)/
│   │       ├── (dashboard)/
│   │       │   ├── page.tsx                  # Main dashboard
│   │       │   ├── students/
│   │       │   ├── staff/
│   │       │   ├── classes/
│   │       │   ├── timetable/
│   │       │   ├── attendance/
│   │       │   ├── exams/
│   │       │   ├── lms/
│   │       │   ├── fee/
│   │       │   ├── payroll/
│   │       │   ├── hr/
│   │       │   ├── leave/
│   │       │   ├── admission/
│   │       │   ├── transport/
│   │       │   ├── health/
│   │       │   ├── library/
│   │       │   ├── events/
│   │       │   ├── expense/
│   │       │   ├── scholarship/
│   │       │   ├── reports/
│   │       │   ├── certificates/
│   │       │   ├── compliance/
│   │       │   ├── hostel/
│   │       │   ├── iot/
│   │       │   ├── gamification/
│   │       │   ├── international/
│   │       │   ├── special-education/
│   │       │   ├── vocational/
│   │       │   ├── discipline/
│   │       │   ├── insurance/
│   │       │   ├── feature-flags/
│   │       │   └── saas/
│   │       └── layout.tsx
│   ├── teacher-portal/
│   ├── student-portal/
│   ├── parent-portal/
│   └── management-portal/
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Shared utilities
│   ├── config/             # Shared config (Prisma, Redis, Kafka clients)
│   ├── ui/                 # Shared React components (shadcn/ui based)
│   └── prisma/
│       ├── schema.prisma   # Single unified schema for all services
│       ├── migrations/
│       └── seed.ts
├── mobile/
│   └── app/
│       ├── (auth)/
│       ├── (tabs)/
│       ├── student/
│       ├── exam/
│       ├── fee/
│       ├── transport/
│       └── offline/
├── infrastructure/
│   ├── nginx/
│   │   └── nginx.conf
│   ├── postgres/
│   │   └── init.sql
│   ├── mosquitto/
│   │   └── mosquitto.conf
│   ├── vault/
│   │   └── vault.hcl
│   ├── k8s/
│   │   ├── namespace.yaml
│   │   ├── services/
│   │   ├── ingress/
│   │   └── config/
│   └── helm/
│       └── aischool/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── BLUEPRINT.md
├── README.md
├── PROGRESS.md
└── progress.json
```

---

## 18. Feature Status Table

| Module | Status | Service | Portal Page |
|---|---|---|---|
| Authentication & MFA | ✅ Complete | auth-service | All portals |
| User Management + GDPR | ✅ Complete | user-service | admin |
| Student Enrolment | ✅ Complete | student-service | admin |
| Class & Timetable | ✅ Complete | academic-service | admin, teacher |
| Attendance (Student) | ✅ Complete | attendance-service | admin, teacher |
| Staff Attendance + Biometric | ✅ Complete | attendance-service + biometric-bridge | admin |
| Fee Management + Razorpay | ✅ Complete | fee-service | admin, parent, student |
| Exam & Results | ✅ Complete | exam-service | admin, teacher, student |
| LMS + Homework + Plagiarism | ✅ Complete | lms-service | admin, teacher, student |
| Live Classes (Daily.co) | ✅ Complete | lms-service | teacher, student |
| HR Management | ✅ Complete | hr-service | admin |
| Leave Management | ✅ Complete | hr-service | admin, teacher |
| Payroll + EPF/ESI/TDS | ✅ Complete | payroll-service | admin |
| Certificates + Blockchain | ✅ Complete | certificate-service | admin, student |
| Admission Pipeline | ✅ Complete | admission-service | admin |
| Transport + GPS | ✅ Complete | transport-service | admin, parent |
| Health Centre | ✅ Complete | health-service | admin |
| Library + OPAC | ✅ Complete | library-service | admin, student |
| Events & Activities | ✅ Complete | event-service | admin |
| Expense & Budget | ✅ Complete | expense-service | admin |
| Scholarships | ✅ Complete | scholarship-service | admin |
| Reports & Analytics | ✅ Complete | report-service | admin, management |
| SaaS Multi-tenancy | ✅ Complete | saas-service | management |
| Developer API | ✅ Complete | developer-api | — |
| AI/ML Service | ✅ Complete | ai-service (Python) | admin, management |
| IoT Dashboard | ✅ Complete | ops-service + InfluxDB | admin |
| MDM (Jamf + Intune) | ✅ Complete | ops-service | admin |
| Feature Flags | ✅ Complete | ops-service | admin |
| POSH/POCSO Compliance | ✅ Complete | ops-service | admin |
| Labour Law Compliance | ✅ Complete | ops-service | admin |
| RTE 25% Compliance | ✅ Complete | ops-service | admin |
| Hostel Management | ✅ Complete | ops-service | admin |
| Pre-Primary Module | ✅ Complete | student-service | admin |
| Vocational / NEP 2020 | ✅ Complete | academic-service | admin |
| CWSN / IEP | ✅ Complete | student-service | admin |
| Gamification Engine | ✅ Complete | student-service | admin, student |
| International (IB/Cambridge/FX) | ✅ Complete | ops-service | admin |
| Discipline Management | ✅ Complete | ops-service (niche) | admin |
| Insurance Management | ✅ Complete | ops-service (niche) | admin |
| Magazine & Yearbook | ✅ Complete | event-service | admin |
| Mentoring | ✅ Complete | student-service | admin |
| Accreditation (NAAC/NBA) | ✅ Complete | ops-service | admin, management |
| Mobile App (Expo 51) | ✅ Complete | — (consumes all APIs) | — |
| Kubernetes + Helm | ✅ Complete | infrastructure/ | — |
| Blockchain (Polygon) | ✅ Complete | certificate-service | — |
| Observability (ELK+Grafana) | ✅ Complete | infrastructure/ | — |
| Security (Vault + mTLS) | ✅ Complete | infrastructure/ | — |

**Total: 657/657 tasks — 100% complete**

---

*Generated by Claude Code — AISchool ERP v1.0*
