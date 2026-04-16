# School ERP — Build Progress Tracker

> **Auto-Resume Instructions for Claude:**
> On every new session start, read this file, find the first `[ ]` item, and begin work from there.
> Code lives at: `/Users/Najeeb-CapOne/Desktop/AISchool/` (code + vault merged into one folder)
> Before token expiry: commit all work, update checkboxes below, recalculate %.

---

## Overall Progress

| Phase | Tasks | Done | % |
|---|---|---|---|
| Phase 1 — Foundation | 82 | 43 | 52% |
| Phase 2 — Core Academic | 96 | 0 | 0% |
| Phase 3 — Operations | 104 | 0 | 0% |
| Phase 4 — Intelligence & Mobile | 72 | 0 | 0% |
| Phase 5 — Platform & DevOps | 56 | 0 | 0% |
| Phase 6 — Niche & Compliance | 48 | 0 | 0% |
| **TOTAL** | **458** | **43** | **9.4%** |

**Last updated:** 2026-04-16
**Last git commit:** ebfe135 — Phase 1.1-1.4 (102 files, 5771 lines)
**Current focus:** Phase 1 → 1.5 User Management Service

---

## Phase 1 — Foundation
**Target:** Admin Portal (basic) + Teacher Portal (basic) + Auth + Attendance + Fee + Notifications

### 1.1 Project Scaffold & DevOps (12 tasks)
- [x] Monorepo init — Turborepo + pnpm workspaces
- [x] Root `package.json` with all workspace scripts
- [x] `turbo.json` pipeline (build, test, lint, dev)
- [x] `pnpm-workspace.yaml` defining all packages
- [x] `.env.example` with all environment variables documented
- [x] `docker-compose.yml` (PostgreSQL, Redis, Kafka, Zookeeper, Elasticsearch)
- [x] `docker-compose.dev.yml` with hot reload + volume mounts
- [x] Nginx reverse proxy config (`infrastructure/nginx/nginx.conf`)
- [x] GitHub Actions CI workflow (lint + test on PR)
- [x] GitHub Actions CD workflow (build + push image on merge)
- [x] Shared ESLint config (`packages/eslint-config/`)
- [x] Shared TypeScript base config (`packages/tsconfig/`)

### 1.2 Database Foundation — Prisma Schema (15 tasks)
- [x] `packages/database/` package setup (package.json, tsconfig)
- [x] Prisma schema — Auth & Tenancy (`Tenant`, `User`, `UserProfile`, `RefreshToken`, `AuditLog`)
- [x] Prisma schema — School & Academic Core (`School`, `AcademicYear`, `Term`, `GradeLevel`, `Section`, `Subject`, `ClassSubject`, `TimetableSlot`)
- [x] Prisma schema — Admission (`Enquiry`, `EnquiryFollowUp`, `AdmissionApplication`, `ApplicationDocument`)
- [x] Prisma schema — Students (`Student`, `StudentDocument`, `StudentParent`, `ClassPromotion`, `TransferCertificate`)
- [x] Prisma schema — Staff & HR (`Department`, `Designation`, `Staff`, `TeacherSubject`, `ClassTeacher`)
- [x] Prisma schema — Payroll (`SalaryStructureComponent`, `PayrollRun`, `Payslip`, `LeavePolicy`, `LeaveBalance`, `LeaveApplication`)
- [x] Prisma schema — Attendance (`AttendanceSession`, `AttendanceRecord`, `StaffAttendance`)
- [x] Prisma schema — Fee (`FeeHead`, `FeeStructure`, `FeeInvoice`, `FeeInvoiceItem`, `FeePayment`, `Concession`, `LateFeeRule`, `PostDatedCheque`)
- [x] Prisma schema — Exam & Results (`Exam`, `ExamSchedule`, `HallTicket`, `MarksEntry`, `Result`, `QuestionBank`, `OnlineTest`, `OnlineTestAttempt`)
- [x] Prisma schema — Transport (`Route`, `Stop`, `Vehicle`, `Driver`, `StudentTransport`, `Trip`)
- [x] Prisma schema — Library (`BookCatalogue`, `BookIssue`, `OverdueFine`)
- [x] Prisma schema — Health (`StudentMedicalProfile`, `NurseVisitLog`, `MedicationSchedule`, `HealthIncident`)
- [x] Prisma schema — Notifications, LMS, Finance Extended, Compliance, Events, Certificates
- [x] Initial migration + seed scripts

### 1.3 Shared Packages (8 tasks)
- [x] `@school-erp/types` — all shared TypeScript interfaces + enums
- [x] `@school-erp/config` — env config with Zod validation schema
- [x] `@school-erp/utils` — pagination, dates, slugify, currency formatting
- [x] `@school-erp/testing` — shared test factories and DB setup helpers
- [x] `@school-erp/logger` — structured logging (Winston + request context)
- [x] `@school-erp/errors` — custom exception hierarchy
- [x] `@school-erp/events` — event bus types and BullMQ queue definitions
- [x] `@school-erp/ui` — shared Next.js component library (design tokens, base components)

### 1.4 Auth Service — Complete (18 tasks)
- [x] NestJS app scaffold (`apps/auth-service/`)
- [x] Prisma service integration
- [x] Environment config module (typed, validated)
- [x] JWT strategy (access token validation)
- [x] Local strategy (email + password login)
- [ ] OTP strategy (phone number + OTP login) — deferred to 1.5
- [x] Google OAuth strategy
- [x] Microsoft OAuth strategy
- [x] 2FA-TOTP (speakeasy — generate secret, verify code)
- [x] Login endpoint (email/password) — returns access + refresh tokens
- [ ] OTP request endpoint (rate limited — 5/hr per phone) — deferred to 1.5
- [ ] OTP verify endpoint — deferred to 1.5
- [x] Refresh token endpoint (rotation on every use)
- [x] Logout endpoint (revoke refresh token)
- [x] Forgot password + reset password flow
- [x] RBAC guard + `@Roles()` decorator
- [x] Plan guard + `@RequiresPlan()` decorator
- [x] Global JWT auth guard (except public routes)
- [x] Auth Service Dockerfile + health check

### 1.5 User Management Service (8 tasks)
- [ ] NestJS app scaffold (`apps/user-service/`)
- [ ] CRUD for User profiles (all roles)
- [ ] Role assignment + revocation
- [ ] Profile photo upload (S3/R2)
- [ ] Password change (authenticated)
- [ ] Account activation / deactivation
- [ ] User search (Elasticsearch integration)
- [ ] User Service Dockerfile

### 1.6 Student Service (10 tasks)
- [ ] NestJS app scaffold (`apps/student-service/`)
- [ ] Student enrolment (create student profile + user account)
- [ ] Bulk import via CSV (parse, validate, batch create)
- [ ] Student profile CRUD (update class, section, roll number)
- [ ] Class promotion (end-of-year batch promote)
- [ ] Transfer Certificate (TC) generation (PDF)
- [ ] Student search (name, admission no, class, section)
- [ ] Student parent linking (parent user ↔ student)
- [ ] CWSN flagging + IEP record
- [ ] Student Service Dockerfile

### 1.7 Academic Config Service (6 tasks)
- [ ] NestJS app scaffold (`apps/academic-service/`)
- [ ] Academic year + term CRUD
- [ ] Grade level + section CRUD
- [ ] Subject + class-subject mapping
- [ ] Timetable builder (create slots, conflict detection)
- [ ] Academic Service Dockerfile

### 1.8 Attendance Service (8 tasks)
- [ ] NestJS app scaffold (`apps/attendance-service/`)
- [ ] Create attendance session (class + date)
- [ ] Bulk mark attendance (P/A/L/H/OL)
- [ ] Edit attendance record (with reason + audit)
- [ ] Attendance summary per student (daily/monthly/term)
- [ ] Class-wise attendance report
- [ ] Below-threshold report (configurable %, default 75%)
- [ ] Emit `student.absent` event → Notification Service
- [ ] Attendance Service Dockerfile

### 1.9 Fee Service (10 tasks)
- [ ] NestJS app scaffold (`apps/fee-service/`)
- [ ] Fee head + structure CRUD
- [ ] Bulk invoice generation (per class, per term)
- [ ] Record cash payment
- [ ] Razorpay payment gateway integration (create order, verify signature)
- [ ] Concession application
- [ ] Late fee calculation (auto-apply on overdue)
- [ ] Receipt generation (PDF via Puppeteer)
- [ ] Collection report + outstanding dues report
- [ ] PDC (Post-Dated Cheque) management
- [ ] Fee Service Dockerfile

### 1.10 Notification Service (7 tasks)
- [ ] NestJS app scaffold (`apps/notification-service/`)
- [ ] BullMQ consumer — process notification jobs
- [ ] SMS adapter (MSG91 / Twilio)
- [ ] Email adapter (SendGrid / AWS SES)
- [ ] Push adapter (Firebase FCM)
- [ ] WhatsApp adapter (WATI / Twilio)
- [ ] Template management (CRUD templates per event type + language)
- [ ] Delivery status tracking + retry (3 attempts, exponential backoff)
- [ ] Notification Service Dockerfile

### 1.11 Admin Portal — Phase 1 Screens (10 tasks)
- [ ] Next.js 14 app scaffold (`apps/admin-portal/`) with App Router
- [ ] Auth pages (login, forgot password, 2FA verify)
- [ ] Dashboard layout (sidebar, header, breadcrumb)
- [ ] Student Management (list, add, edit, bulk import, promote)
- [ ] Class & Section Management
- [ ] Timetable Builder UI (drag-and-drop slots)
- [ ] Fee Structure setup UI
- [ ] Attendance overview screen (class-wise daily summary)
- [ ] Staff list (basic)
- [ ] Announcements management

### 1.12 Teacher Portal — Phase 1 Screens (6 tasks)
- [ ] Next.js 14 app scaffold (`apps/teacher-portal/`)
- [ ] Auth + dashboard
- [ ] Attendance marking screen (class roster + status toggle, offline-capable)
- [ ] Timetable view
- [ ] My classes + subjects view
- [ ] Leave application form

### 1.13 Student Portal — Phase 1 Screens (4 tasks)
- [ ] Next.js 14 app scaffold (`apps/student-portal/`)
- [ ] Auth + dashboard (attendance %, pending fees, upcoming exams)
- [ ] Timetable view
- [ ] Fee view (invoices + payment button)

---

## Phase 2 — Core Academic
**Target:** Exam & Results + Parent Portal + LMS basics + HR + Payroll + Certificates

### 2.1 Exam & Result Service (10 tasks)
- [ ] NestJS app scaffold (`apps/exam-service/`)
- [ ] Exam CRUD (type, academic year, term)
- [ ] Exam schedule (class × subject × date × max marks)
- [ ] Hall ticket generation (PDF, QR code)
- [ ] Bulk marks entry (teacher enters per subject per student)
- [ ] Marks validation (≤ max marks, all subjects entered check)
- [ ] Grading engine (configurable scales, weightage, LOP)
- [ ] Result calculation (total, %, grade, rank, pass/fail)
- [ ] Publish results → emit `result.published` event
- [ ] Report card PDF (school-branded, bulk download)
- [ ] Exam Service Dockerfile

### 2.2 Online Exam Engine (8 tasks)
- [ ] Question bank CRUD (MCQ, True/False, Short answer, Fill-in-blank)
- [ ] Question tagging (subject, class, difficulty, topic)
- [ ] Online test builder (select questions from bank, set timer, rules)
- [ ] Test delivery (timed, anti-tab detection, auto-submit on time)
- [ ] Auto-grading for objective questions
- [ ] Subjective answer storage (for manual grading)
- [ ] Per-question performance analytics
- [ ] Anti-plagiarism for subjective answers (similarity check)

### 2.3 LMS Service (10 tasks)
- [ ] NestJS app scaffold (`apps/lms-service/`)
- [ ] Course + unit + lesson CRUD
- [ ] Lesson resource upload (video URL, PDF, image)
- [ ] Curriculum mapping (lesson → syllabus topic)
- [ ] Student lesson progress tracking (viewed, completed, % watched)
- [ ] Quiz builder (linked to question bank)
- [ ] Discussion threads per lesson
- [ ] Syllabus coverage report (% taught per subject per class)
- [ ] Video streaming (embed YouTube / Vimeo / own CDN)
- [ ] LMS Service Dockerfile

### 2.4 HR Service (10 tasks)
- [ ] NestJS app scaffold (`apps/hr-service/`)
- [ ] Staff onboarding CRUD (personal, contact, employment, bank details)
- [ ] Department + designation management
- [ ] Subject-teacher mapping
- [ ] Staff document upload (certifications, ID proof)
- [ ] Leave policy CRUD (types, annual days, carry-forward rules)
- [ ] Leave balance calculation
- [ ] Leave application + approval workflow (HOD → Principal)
- [ ] Staff appraisal CRUD (KRA/KPI entry + scoring)
- [ ] Staff search + filters
- [ ] HR Service Dockerfile

### 2.5 Payroll Service (10 tasks)
- [ ] NestJS app scaffold (`apps/payroll-service/`)
- [ ] Salary structure CRUD (earnings + deductions per designation)
- [ ] Monthly payroll run (fetch attendance → calculate gross/deductions/net)
- [ ] LOP calculation (loss of pay days)
- [ ] PF calculation (12% of Basic)
- [ ] ESI calculation (0.75% of Gross if ≤ ₹21,000)
- [ ] TDS calculation (per income tax slab, configurable)
- [ ] Professional Tax (state-wise slab)
- [ ] Payslip generation (PDF, password-protected with DOB)
- [ ] EPF ECR format data export
- [ ] Payroll Service Dockerfile

### 2.6 Certificate Service (8 tasks)
- [ ] NestJS app scaffold (`apps/certificate-service/`)
- [ ] Certificate template management (Bonafide, Character, Migration, Sports, Attendance)
- [ ] Dynamic field injection (student name, class, date, principal name)
- [ ] PDF generation with school branding
- [ ] Digital signature support (DSC integration)
- [ ] QR code verification (link to hosted verification page)
- [ ] Certificate issuance log
- [ ] Blockchain hash recording (Polygon Layer 2)
- [ ] Certificate Service Dockerfile

### 2.7 Survey & Feedback Service (6 tasks)
- [ ] Survey builder (drag-drop question types)
- [ ] Survey distribution (target: all parents / specific class / all staff)
- [ ] Response collection + anonymous mode
- [ ] 360° appraisal surveys for staff
- [ ] Results dashboard (charts, sentiment analysis)
- [ ] Post-PTM feedback forms

### 2.8 PTM Service (4 tasks)
- [ ] PTM date + slot creation (school publishes availability)
- [ ] Parent books slot with specific teacher
- [ ] Teacher appointment schedule view
- [ ] Post-PTM remarks entry

### 2.9 Parent Portal (12 tasks)
- [ ] Next.js 14 app scaffold (`apps/parent-portal/`)
- [ ] Auth + multi-child switcher
- [ ] Dashboard (attendance, fees due, recent results at a glance)
- [ ] Attendance view (daily status + monthly calendar)
- [ ] Result + report card download
- [ ] Fee payment (Razorpay integration)
- [ ] Homework + assignment status view
- [ ] Teacher messaging
- [ ] School announcements feed
- [ ] Transport live tracking (Google Maps embed + WebSocket)
- [ ] Leave application for child
- [ ] PTM booking screen

### 2.10 Admission & Enquiry Service (8 tasks)
- [ ] NestJS app scaffold (`apps/admission-service/`)
- [ ] Online enquiry form (website embed + walk-in)
- [ ] Enquiry follow-up tracking (called, visited, interested, converted)
- [ ] Admission application form + document upload
- [ ] Application approval workflow → auto-create Student record
- [ ] Waitlist management
- [ ] Source tracking (website, referral, walk-in, social media)
- [ ] Enquiry-to-admission conversion report
- [ ] Admission Service Dockerfile

---

## Phase 3 — Operations
**Target:** Transport + Health + Visitor + Cafeteria + Library + Events + Expense + Company Portal

### 3.1 Transport Service (12 tasks)
- [ ] NestJS app scaffold (`apps/transport-service/`)
- [ ] Route + stop CRUD (lat/lng, sequence, expected time)
- [ ] Vehicle + driver management
- [ ] Student-to-route/stop assignment
- [ ] Trip management (start, end, status)
- [ ] MQTT GPS location ingestion (HiveMQ integration)
- [ ] Real-time location broadcast via WebSocket
- [ ] Geofencing: near-stop alert (500m) → parent push
- [ ] Geofencing: school arrival → admin notification
- [ ] Speed alert (> 60 km/h → Transport Manager alert)
- [ ] Pre-trip safety inspection checklist
- [ ] Trip history + route deviation log
- [ ] Transport Service Dockerfile

### 3.2 Health & Medical Service (8 tasks)
- [ ] NestJS app scaffold (`apps/health-service/`)
- [ ] Student medical profile (allergies, blood group, conditions, medications)
- [ ] Nurse daily visit log (student, complaint, treatment, vitals)
- [ ] Medication administration log (chronic conditions)
- [ ] Health incident report (auto-notify parent)
- [ ] Vaccination records + reminders
- [ ] Fitness / BMI annual record
- [ ] Health Service Dockerfile

### 3.3 Visitor Management Service (6 tasks)
- [ ] Visitor registration (name, purpose, who to meet, photo ID)
- [ ] QR/OTP visitor pass generation
- [ ] Student gate pass (early exit — parent approval)
- [ ] Delivery management (package log)
- [ ] Real-time visitor list for security desk
- [ ] Visitor Service Dockerfile

### 3.4 Cafeteria Service (6 tasks)
- [ ] Daily menu management
- [ ] Pre-order system (student orders day before)
- [ ] Student wallet (top-up via parent portal + pay)
- [ ] POS billing (scan student ID → deduct wallet)
- [ ] Dietary preferences + allergen filtering
- [ ] Monthly canteen usage report

### 3.5 Library Service (10 tasks)
- [ ] NestJS app scaffold (`apps/library-service/`)
- [ ] Book catalogue CRUD (ISBN, author, publisher, category, copies)
- [ ] RFID/barcode issue and return (scan → auto-update status)
- [ ] Member management (borrowing limits per role)
- [ ] Reservation/hold request for checked-out books
- [ ] Overdue fine calculation (daily rate, configurable)
- [ ] E-book catalogue + reading tracking
- [ ] Periodicals (newspaper/magazine subscriptions)
- [ ] Annual stock audit (system count vs physical count)
- [ ] Book purchase recommendation → PO via Expense module
- [ ] Library Service Dockerfile

### 3.6 Event & Activity Service (8 tasks)
- [ ] Event CRUD (Sports Day, Annual Day, Field Trip, PTM, Competition)
- [ ] Participant registration (students + staff + parents)
- [ ] Parent consent form (online, for trips)
- [ ] Sports Day management (events, heats, results, house points, medal tally)
- [ ] Club management (enrollment, activity log)
- [ ] Competition bracket management (prelim → semifinal → final)
- [ ] Achievement logging (inter-school, state, national)
- [ ] Post-event photo gallery publishing

### 3.7 Expense & Budget Service (8 tasks)
- [ ] Annual budget setup (department-wise)
- [ ] Expense entry (petty cash, vendor payments, utilities, salaries)
- [ ] Purchase order workflow (request → approval → order → receipt)
- [ ] Vendor management + payment tracking
- [ ] Budget vs actual spend report
- [ ] GST input tracking (GSTR-1/3B export format)
- [ ] Bank reconciliation (import statement → auto-match → flag gaps)
- [ ] TDS on vendor payments (Form 16A generation)

### 3.8 Scholarship Service (6 tasks)
- [ ] Scholarship scheme CRUD (merit, need-based, government)
- [ ] Eligibility criteria definition
- [ ] Student application + document submission
- [ ] Review + approval workflow
- [ ] Auto-apply discount to fee invoice
- [ ] Government scholarship tracking (PM e-VIDYA, state schemes)

### 3.9 Alumni Service (4 tasks)
- [ ] Alumni registration (graduating students auto-enrolled)
- [ ] Alumni directory (searchable, opt-in)
- [ ] Job board + placement tracking
- [ ] Mentor-mentee linking (alumnus → current student)

### 3.10 Report & Analytics Service (8 tasks)
- [ ] NestJS app scaffold (`apps/report-service/`)
- [ ] PDF report generation engine (Puppeteer)
- [ ] Excel report generation (ExcelJS)
- [ ] Attendance consolidated report
- [ ] Fee collection consolidated report
- [ ] Academic performance report (class-wise + school-wide)
- [ ] Custom report builder (Admin selects fields, filters, groups)
- [ ] Report Service Dockerfile

### 3.11 Company / Management Portal (8 tasks)
- [ ] Next.js 14 app scaffold (`apps/company-portal/`)
- [ ] Auth + multi-school switcher
- [ ] Master dashboard (all schools — enrolment, fee, staff, compliance)
- [ ] School-wise performance comparison
- [ ] Consolidated financial reports
- [ ] Subscription + license management
- [ ] Audit logs across all schools
- [ ] KPI + analytics (MRR, ARR, churn, NRR) — for SaaS business

### 3.12 SaaS Management Service (8 tasks)
- [ ] NestJS app scaffold (`apps/saas-service/`)
- [ ] Tenant lifecycle (create, trial, activate, suspend, reactivate)
- [ ] Subscription plan CRUD + feature flags per plan
- [ ] Billing engine (per-student pricing, GST invoicing to schools)
- [ ] NACH / UPI payment collection from schools
- [ ] Customer health score calculation
- [ ] Support ticket system (Tier 1 AI → Tier 2 agent → Tier 3 engineering)
- [ ] Developer API key issuance + rate limiting
- [ ] SaaS Service Dockerfile

---

## Phase 4 — Intelligence & Mobile
**Target:** Mobile apps + AI features + Biometric + Multi-language

### 4.1 Mobile Apps — React Native (16 tasks)
- [ ] Expo monorepo setup (`apps/mobile/`)
- [ ] Auth flow (login, OTP, biometric — TouchID/FaceID)
- [ ] Student app — Dashboard
- [ ] Student app — Timetable
- [ ] Student app — Attendance view
- [ ] Student app — Assignments + online quizzes
- [ ] Student app — Fee payment (Razorpay SDK)
- [ ] Student app — LMS (video lessons, progress)
- [ ] Student app — Digital ID Card (QR code)
- [ ] Parent app — Dashboard + multi-child switcher
- [ ] Parent app — Attendance + result view
- [ ] Parent app — Fee payment
- [ ] Parent app — Transport live tracking (Google Maps)
- [ ] Parent app — Push notifications (FCM)
- [ ] Offline data sync (IndexedDB → background sync)
- [ ] App Store + Play Store build configs

### 4.2 AI / ML Service (12 tasks)
- [ ] Python FastAPI scaffold (`apps/ai-service/`)
- [ ] Dropout prediction model (attendance + marks + fee + engagement)
- [ ] Fee defaulter prediction model
- [ ] Grade forecasting model (mid-term → predicted final)
- [ ] Teacher effectiveness scoring
- [ ] Bus route optimisation (Google OR-Tools)
- [ ] Plagiarism detection (TF-IDF cosine similarity + external API)
- [ ] AI-assisted grading (LLM-based rubric scoring)
- [ ] Enrolment prediction model
- [ ] Financial forecasting (cash flow model)
- [ ] Parent engagement score calculation
- [ ] AI service REST API + model endpoints
- [ ] AI Service Dockerfile (Python + ML dependencies)

### 4.3 Biometric Integration (6 tasks)
- [ ] On-premise biometric bridge service (Node.js)
- [ ] ZKTeco SDK integration (punch data fetch)
- [ ] Local MQTT publish of punch events
- [ ] Cloud subscription → Attendance Service sync
- [ ] Conflict resolution (biometric vs manual — flag for admin)
- [ ] Device health monitoring + offline alert

### 4.4 Multi-language Support (8 tasks)
- [ ] i18n setup across all portals (next-intl)
- [ ] Language switcher UI component
- [ ] English translations (base)
- [ ] Hindi translations
- [ ] Telugu translations
- [ ] Tamil translations
- [ ] Notification templates in all 4 languages
- [ ] Date/number formatting per locale

### 4.5 Advanced Analytics (6 tasks)
- [ ] Data warehouse schema design (Snowflake / BigQuery)
- [ ] Nightly ETL pipeline (operational DB → data warehouse)
- [ ] Metabase / Grafana BI dashboards
- [ ] Teacher workload analytics dashboard
- [ ] Financial forecasting dashboard
- [ ] Student learning analytics (LMS time-on-task, quiz attempts)

### 4.6 Real-Time Operations Dashboard (4 tasks)
- [ ] WebSocket hub for live school operations
- [ ] Live attendance % per class (updates as teachers mark)
- [ ] Live transport map (all buses current position)
- [ ] Today's fee collections running total

---

## Phase 5 — Platform & DevOps
**Target:** Developer API + Blockchain + Infrastructure hardening

### 5.1 Developer API Platform (8 tasks)
- [ ] Public REST API gateway with API key auth
- [ ] Webhook dispatcher (student_enrolled, fee_paid, result_published, etc.)
- [ ] Webhook delivery log + retry logic
- [ ] API rate limiting per key (configurable per plan)
- [ ] API usage dashboard (requests, errors, latency)
- [ ] OpenAPI / Swagger docs portal (auto-generated)
- [ ] Sandbox environment (isolated test tenant)
- [ ] 6-month deprecation notice process for breaking changes

### 5.2 Blockchain Certificate Verification (4 tasks)
- [ ] Smart contract deployment (Polygon Mumbai testnet → mainnet)
- [ ] Certificate hash recording on-chain (on issuance)
- [ ] Public verification page (enter hash → blockchain confirms)
- [ ] Batch recording (gas optimisation — batch multiple certs per tx)

### 5.3 Infrastructure Hardening (12 tasks)
- [ ] Kubernetes manifests for all services (Deployment, Service, HPA, PDB)
- [ ] Helm charts for each service
- [ ] Cert-manager for TLS certificates
- [ ] Ingress-nginx configuration
- [ ] Horizontal Pod Autoscaler rules (CPU 70% → scale up)
- [ ] PostgreSQL HA (Patroni / CloudNativePG) + read replicas
- [ ] Redis Cluster setup
- [ ] Kafka cluster (3 brokers + ZooKeeper quorum)
- [ ] HashiCorp Vault for secrets management
- [ ] VAPT schedule automation (weekly DAST scans)
- [ ] Prometheus + Grafana monitoring stack
- [ ] ELK stack for log aggregation (Elasticsearch + Logstash + Kibana)

### 5.4 IoT Sensor Integration (6 tasks)
- [ ] Air quality sensor data ingestion (CO2, PM2.5 per classroom)
- [ ] Smart meter data ingestion (electricity per block)
- [ ] Smart water meter data
- [ ] Sensor data pipeline → InfluxDB
- [ ] Building health live dashboard
- [ ] Alert thresholds (CO2 > 1000ppm → classroom alert)

### 5.5 Advanced Security (6 tasks)
- [ ] Penetration test CI integration (OWASP ZAP)
- [ ] Dependency vulnerability scanning (Snyk / Trivy)
- [ ] Data masking for non-production environments
- [ ] GDPR right-to-erasure automated workflow
- [ ] Audit log immutability (append-only, signed)
- [ ] Session anomaly detection (unusual IP/device → force re-auth)

---

## Phase 6 — Niche & Compliance
**Target:** IB/Cambridge, Pre-primary, Vocational/NEP, Compliance modules

### 6.1 Compliance Modules (12 tasks)
- [ ] POSH module (ICC management, complaint portal, 90-day resolution tracking, annual report)
- [ ] POCSO mandatory reporting workflow
- [ ] RTE compliance (25% reservation, lottery selection, government reimbursement claim)
- [ ] UDISE+ data compilation + export
- [ ] APAAR ID integration (Academic Bank of Credits API)
- [ ] Fire safety tracking (drill records, extinguisher inventory, evacuation plan)
- [ ] Annual compliance calendar with auto-reminders
- [ ] RTI management (application receipt, 30-day deadline, response workflow)
- [ ] Labour law compliance (PT, LWF, ESI, EPF returns export)
- [ ] Building safety audit log
- [ ] FSSAI compliance for canteen
- [ ] Child safeguarding policy digital acknowledgement system

### 6.2 International School Modules (6 tasks)
- [ ] IB curriculum framework (PYP/MYP/DP — course, CAS hours, TOK, EE tracking)
- [ ] Cambridge IGCSE/A-Level subject + grade management
- [ ] Foreign/NRI student management (passport, visa, renewal reminders)
- [ ] Multi-currency fee collection (USD, GBP, AED) with FX rate tracking
- [ ] International staff management (work permit, DTAA, foreign salary component)
- [ ] Apostille + document legalisation workflow

### 6.3 Niche School Types (6 tasks)
- [ ] Hostel module (room/bed allocation, warden roster, hostel attendance, mess billing, outing management)
- [ ] Pre-primary features (daily activity log, milestone tracking, daily parent photo diary, pickup authorisation)
- [ ] Vocational education / NEP 2020 (NSQF subjects, industry partner, on-job training, NSQF certificate)
- [ ] Multi-shift school (morning/afternoon/evening separate timetables, shared facilities)
- [ ] Mid-day meal tracking (meal attendance, menu, stock, government compliance report)
- [ ] Special education / IEP (CWSN profile, IEP goals, accommodations, progress tracking)

### 6.4 Advanced Community (8 tasks)
- [ ] PTA / SMC management (committee members, meetings, minutes, resolutions, fund management)
- [ ] Parent volunteer management (registration, opportunity posting, hours tracking)
- [ ] Community service tracking (student hours, NGO partner list, service certificates)
- [ ] School magazine / newsletter digital publishing
- [ ] Social media auto-publishing (admin posts achievement → Facebook/Instagram)
- [ ] Parent community (school-specific moderated community, class groups)
- [ ] School store (uniform shop, online ordering, inventory, POS billing, tailor orders)
- [ ] Digital yearbook (photo submissions, editorial workflow, online + print ordering)

### 6.5 Operational Modules (8 tasks)
- [ ] Facility maintenance requests (submit, assign, track, SLA alerts, preventive schedule)
- [ ] Room + resource booking (conference room, lab, projector — conflict-free calendar)
- [ ] Asset & fixed asset management (register, QR tags, depreciation, maintenance log, insurance)
- [ ] Vehicle maintenance log (service history, fuel log, tyre records, insurance/PUC expiry)
- [ ] Drinking water quality log (TDS, bacteria, RO service records)
- [ ] Pest control + housekeeping management
- [ ] Utility & energy management (electricity, water, solar — per block tracking)
- [ ] Lost and found management

### 6.6 Gamification & Engagement (8 tasks)
- [ ] Points system (attendance, assignments, quizzes, reading, community service)
- [ ] Badges (tiered: Bronze/Silver/Gold per category)
- [ ] Leaderboards (class-level, school-level, opt-in)
- [ ] Streaks (consecutive attendance, LMS engagement)
- [ ] Rewards (canteen credit, library priority — configurable)
- [ ] Student digital portfolio (upload best work, teacher endorsement, export PDF)
- [ ] Digital ID card (QR code, scannable for attendance/library)
- [ ] Student council + house system (election, house points, leaderboard)

---

## Session Log

| Date | Session | Work Done | Files Changed | Commit Hash |
|---|---|---|---|---|
| 2026-04-16 | 1 | Initial checklist creation | PROGRESS.md, CLAUDE.md | pending |

---

*Auto-generated by Claude Code. Updated at end of each build session.*
