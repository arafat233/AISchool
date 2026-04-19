# School ERP — Build Progress Tracker

> **Auto-Resume Instructions for Claude:**
> On every new session start, read this file, find the first `[ ]` item, and begin work from there.
> Code lives at: `/Users/Najeeb-CapOne/Desktop/AISchool/` (code + vault merged into one folder)
> Before token expiry: commit all work, update checkboxes below, recalculate %.
>
> **Blueprint Reference:** All tasks derived from School ERP Master Blueprint v3.0 (Definitive Final Edition)
> 26 sections · 170+ functional areas · All 5 passes of gap analysis included.

---

## Overall Progress

| Phase | Tasks | Done | % |
|---|---|---|---|
| Phase 1 — Foundation | 82 | 82 | 100% |
| Phase 2 — Core Academic | 130 | 130 | 100% |
| Phase 3 — Operations | 172 | 113 | 66% |
| Phase 4 — Intelligence & Mobile | 88 | 0 | 0% |
| Phase 5 — Platform & DevOps | 72 | 0 | 0% |
| Phase 6 — Niche, Compliance & Community | 113 | 0 | 0% |
| **TOTAL** | **657** | **325** | **49.5%** |

**Last updated:** 2026-04-18
**Last git commit:** Phase 3.8 — Scholarship Service complete (297/657 tasks)
**Current focus:** Phase 3 → 3.9 Alumni Service

---

## Phase 1 — Foundation ✅ COMPLETE
**Target:** Admin Portal (basic) + Teacher Portal (basic) + Auth + Attendance + Fee + Notifications

### 1.1 Project Scaffold & DevOps (12 tasks) ✅
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

### 1.2 Database Foundation — Prisma Schema (15 tasks) ✅
- [x] `packages/database/` package setup (package.json, tsconfig)
- [x] Prisma schema — Auth & Tenancy (`Tenant`, `User`, `UserProfile`, `RefreshToken`, `AuditLog`, `IpWhitelist`, `TwoFaBackupCode`)
- [x] Prisma schema — School & Academic Core (`School`, `AcademicYear`, `Term`, `Class`, `Section`, `Subject`, `ClassSubject`, `TimetableSlot`, `House`, `SyllabicTopic`, `SyllabusProgress`)
- [x] Prisma schema — Admission (`Enquiry`, `EnquiryFollowUp`, `AdmissionApplication`, `StudentDocument`)
- [x] Prisma schema — Students (`Student`, `StudentParent`, `StudentPortfolio`, `CommunityServiceLog`, `StudentAchievement`)
- [x] Prisma schema — Staff & HR (`Department`, `Designation`, `Staff`, `TeacherSubject`, `LeaveBalance`, `LeaveApplication`, `SalaryStructure`, `StaffTraining`, `StaffGrievance`, `StaffAppraisal`, `SalaryAdvance`)
- [x] Prisma schema — Payroll (`PayrollRun`, `Payslip`)
- [x] Prisma schema — Attendance (`AttendanceSession`, `AttendanceRecord`, `StaffAttendance`)
- [x] Prisma schema — Fee (`FeeHead`, `FeeStructure`, `FeeInvoice`, `FeeInvoiceItem`, `FeePayment`, `Concession`, `PdcRegister`, `Scholarship`, `ScholarshipApplication`)
- [x] Prisma schema — Finance Extended (`Budget`, `Vendor`, `PurchaseOrder`, `Expense`)
- [x] Prisma schema — Exam & Results (`Exam`, `ExamSchedule`, `MarksEntry`, `Result`, `QuestionBank`, `OnlineTest`, `OnlineTestAttempt`, `OnlineTestAnswer`)
- [x] Prisma schema — LMS (`LmsCourse`, `LmsUnit`, `LmsLesson`, `LmsProgress`, `LiveClass`, `LmsDiscussion`)
- [x] Prisma schema — Transport (`Route`, `Stop`, `Vehicle`, `StudentTransport`, `Trip`, `LocationLog`, `PreTripChecklist`, `VehicleMaintenance`)
- [x] Prisma schema — Health, Visitor, Events, Compliance, Certs, PTM, Surveys, Notifications, Library, Cafeteria, Assets, Alumni
- [x] Initial migration + seed scripts (academic year, admin user, sample school)

### 1.3 Shared Packages (8 tasks) ✅
- [x] `@school-erp/types` — all shared TypeScript interfaces + enums
- [x] `@school-erp/config` — env config with Zod validation schema
- [x] `@school-erp/utils` — pagination, dates, slugify, currency formatting
- [x] `@school-erp/testing` — shared test factories and DB setup helpers
- [x] `@school-erp/logger` — structured logging (Winston + request context)
- [x] `@school-erp/errors` — custom exception hierarchy
- [x] `@school-erp/events` — event bus types and BullMQ queue definitions
- [x] `@school-erp/ui` — shared Next.js component library (design tokens, base components)

### 1.4 Auth Service — Complete (18 tasks) ✅
- [x] NestJS app scaffold (`apps/auth-service/`)
- [x] Prisma service integration
- [x] Environment config module (typed, validated)
- [x] JWT strategy (access token validation)
- [x] Local strategy (email + password login)
- [x] OTP strategy (phone number + OTP login) — rate limited 5/hr per phone
- [x] Google OAuth strategy
- [x] Microsoft OAuth strategy
- [x] 2FA-TOTP (speakeasy — generate secret, verify code, backup codes)
- [x] Login endpoint (email/password) — returns access + refresh tokens
- [x] OTP request endpoint
- [x] OTP verify endpoint
- [x] Refresh token endpoint (rotation on every use)
- [x] Logout endpoint (revoke refresh token)
- [x] Forgot password + reset password flow
- [x] RBAC guard + `@Roles()` decorator
- [x] Plan guard + `@RequiresPlan()` decorator
- [x] Global JWT auth guard (except public routes)
- [x] Auth Service Dockerfile + health check

### 1.5 User Management Service (8 tasks) ✅
- [x] NestJS app scaffold (`apps/user-service/`)
- [x] CRUD for User profiles (all roles)
- [x] Role assignment + revocation
- [x] Profile photo upload (S3/R2)
- [x] Password change (authenticated)
- [x] Account activation / deactivation
- [x] User search (paginated + search filter)
- [x] User Service Dockerfile

### 1.6 Student Service (10 tasks) ✅
- [x] NestJS app scaffold (`apps/student-service/`)
- [x] Student enrolment (create student profile)
- [x] Bulk import via CSV (csv-parse, per-row error handling)
- [x] Student profile CRUD (update class, section)
- [x] Class promotion (end-of-year batch promote, ClassPromotion record)
- [x] Transfer Certificate (TC) issuance (student status → LEFT)
- [x] Student search (name, admission no, section filter)
- [x] Student parent linking (StudentParent upsert)
- [x] Student sibling linking (fee discount eligibility)
- [x] Student Service Dockerfile

### 1.7 Academic Config Service (6 tasks) ✅
- [x] NestJS app scaffold (`apps/academic-service/`)
- [x] Academic year + term CRUD
- [x] Grade level + section CRUD
- [x] Subject + class-subject mapping
- [x] Timetable builder (conflict detection: period + teacher double-booking)
- [x] Academic Service Dockerfile

### 1.8 Attendance Service (8 tasks) ✅
- [x] NestJS app scaffold (`apps/attendance-service/`)
- [x] Create attendance session (idempotent per section+date)
- [x] Bulk mark attendance (P/A/L/H/OL, upsert)
- [x] Session finalisation + lock
- [x] Attendance summary per student (present/absent/%, date range)
- [x] Class-wise attendance report
- [x] Below-threshold report (configurable %, default 75%)
- [x] Emit absent alert → BullMQ → Notification Service
- [x] Attendance Service Dockerfile

### 1.9 Fee Service (10 tasks) ✅
- [x] NestJS app scaffold (`apps/fee-service/`)
- [x] Fee head + structure CRUD (amounts in paise)
- [x] Bulk invoice generation (per section, idempotent)
- [x] Record cash payment (overpayment guard)
- [x] Razorpay: createOrder + verifySignature (HMAC)
- [x] Concession application
- [x] Outstanding dues report
- [x] Collection report (date range, class filter)
- [x] Consolidated report (company portal — all schools)
- [x] Fee Service Dockerfile

### 1.10 Notification Service (7 tasks) ✅
- [x] NestJS app scaffold (`apps/notification-service/`)
- [x] BullMQ workers (Email, SMS, Push, WhatsApp, Voice, AttendanceAlert)
- [x] SMS adapter (MSG91 / Twilio)
- [x] Email adapter (SendGrid via nodemailer)
- [x] Push adapter (Firebase FCM)
- [x] WhatsApp adapter (WATI / AiSensy)
- [x] Template management CRUD (per event type, per channel, per language)
- [x] In-app notification list + mark-read + preferences
- [x] Notification Service Dockerfile

### 1.11 Admin Portal — Phase 1 Screens (10 tasks) ✅
- [x] Next.js 14 app scaffold (`apps/admin-portal/`) with App Router
- [x] Auth pages (login, forgot password, 2FA verify)
- [x] Dashboard layout (sidebar, header, breadcrumb)
- [x] Student Management (list, add, edit, bulk import, promote)
- [x] Class & Section Management
- [x] Timetable Builder UI (drag-and-drop slots, conflict highlighting)
- [x] Fee Structure setup UI
- [x] Attendance overview screen (class-wise daily summary)
- [x] Staff list (basic)
- [x] Announcements management

### 1.12 Teacher Portal — Phase 1 Screens (6 tasks) ✅
- [x] Next.js 14 app scaffold (`apps/teacher-portal/`)
- [x] Auth + dashboard (my classes, pending tasks, leave status)
- [x] Attendance marking screen (class roster + status toggle, offline-capable PWA)
- [x] Timetable view (weekly + substitute duty alerts)
- [x] My classes + subjects view
- [x] Leave application form

### 1.13 Student Portal — Phase 1 Screens (4 tasks) ✅
- [x] Next.js 14 app scaffold (`apps/student-portal/`)
- [x] Auth + dashboard (attendance %, pending fees, upcoming exams, today's homework)
- [x] Timetable view
- [x] Fee view (invoices + Razorpay payment button)

---

## Phase 2 — Core Academic
**Target:** Exam + Results + Online Exam + LMS + HR + Payroll + Certificates + PTM + Survey + Parent Portal + Admission + Emergency Alert

### 2.1 Exam & Result Service (12 tasks) ✅
- [x] NestJS app scaffold (`apps/exam-service/`)
- [x] Exam CRUD (type, academic year, term, status lifecycle)
- [x] Exam schedule (class × subject × date × max marks × venue × online flag)
- [x] Hall ticket generation (PDF with QR code, bulk zip download)
- [x] Bulk marks entry — theory + practical + internal marks separately
- [x] Marks validation (≤ max marks, all subjects check before publish)
- [x] Grading engine (configurable scales: A1/A2/B1… or Distinction/Pass; weightage support)
- [x] Grace marks policy (configurable per school, logged)
- [x] Result calculation (total, %, overall grade, class rank, section rank, pass/fail)
- [x] Publish results → emit `result.published` → Notification Service
- [x] Report card PDF (school-branded, student photo, all subjects, rank — Puppeteer)
- [x] Board exam registration — compile student data in board format (CBSE XML / Excel)
- [x] Exam Service Dockerfile

### 2.2 Online Exam Engine (10 tasks) ✅
- [x] Question bank CRUD (MCQ single/multi, True/False, Fill-in-blank, Match, Short, Long, Image-MCQ)
- [x] Question tagging (subject, class, difficulty Easy/Medium/Hard, topic, Bloom's taxonomy level)
- [x] Bulk question import via Excel template
- [x] Online test builder (select questions manually or auto-pick by difficulty ratio)
- [x] Test delivery — timer, randomise question order, randomise option order per student
- [x] Anti-cheating: anti-tab-switch detection (warn on 1st, auto-submit on 2nd), fullscreen enforcement
- [x] Auto-grading for all objective question types on submission
- [x] Subjective answer storage + teacher manual review queue with AI grading suggestion
- [x] Per-question performance analytics (pass rate, common wrong answers, difficulty calibration)
- [x] Bloom's taxonomy distribution report per test

### 2.3 LMS Service (12 tasks) ✅
- [x] NestJS app scaffold (`apps/lms-service/`)
- [x] Course + unit + lesson CRUD (video URL, PDF, article, audio, live class, AR content)
- [x] Video lesson progress tracking (watched > 80% = complete; PDF scrolled to end = complete)
- [x] Quiz builder (linked to question bank, configurable attempts + pass score)
- [x] Student progress tracking (% complete per subject, learning streak, time-on-task)
- [x] Live class scheduling — Zoom / Google Meet / BBB link auto-generated; FCM reminder
- [x] Recording saved to lesson after live class ends
- [x] Auto-attendance for students who join live class (threshold: joined within first 10 min)
- [x] Discussion threads per lesson (threaded replies, teacher moderation)
- [x] Syllabus coverage tracker — teacher marks topic status; % coverage vs pace alert
- [x] Course completion heatmap for teacher dashboard (class-level, lesson-level drop-off)
- [x] eTextbook / NCERT digital content embed (iframe + chapter link)
- [x] LMS Service Dockerfile

### 2.4 Homework Tracker (4 tasks) ✅
- [x] Daily homework post endpoint (teacher → class + subject + description + date, quick entry)
- [x] Student/parent view (today's homework checklist per subject)
- [x] Parent acknowledgement (optional per school config)
- [x] Homework load analytics (avg homework per class per day — flag overloaded classes)

### 2.5 HR Service (14 tasks) ✅
- [x] NestJS app scaffold (`apps/hr-service/`)
- [x] Staff onboarding CRUD (personal, contact, employment, bank details — PAN/Aadhaar encrypted)
- [x] Department + designation management
- [x] Subject-teacher + class-teacher mapping
- [x] Staff document upload (certificates, ID proof, police verification status)
- [x] Probation tracking (end date alert + confirmation letter auto-generation)
- [x] **Staff Recruitment Pipeline** — job vacancy CRUD, application collection, shortlisting, interview scheduling, panel feedback, offer letter generation
- [x] **Staff Training & CPD** — training calendar, attendance records, CPD hours tracking, effectiveness report
- [x] **Staff Exit Management** — resignation, notice period, handover checklist, no-dues clearance, F&F settlement, experience letter, relieving letter, exit interview trigger
- [x] **Staff Grievance** — submission (anonymous option), category, assignment, resolution timeline, escalation
- [x] Leave policy CRUD (types: CL/SL/EL/Maternity/Paternity/Comp-off; annual days, carry-forward, encashment rules)
- [x] Leave balance calculation + leave application + approval workflow (HOD → Principal, multi-level)
- [x] **Teacher Substitute Marketplace** — internal pool (teacher marks free periods), auto-suggest on leave, external substitute pool (qualified retired teachers), external daily rate → payroll
- [x] Staff appraisal CRUD (KRA/KPI definitions, self-assessment, HOD review, Principal sign-off, final score → increment eligibility)
- [x] HR Service Dockerfile

### 2.6 Payroll Service (14 tasks) ✅
- [x] NestJS app scaffold (`apps/payroll-service/`)
- [x] Salary structure CRUD (earnings: Basic, HRA, DA, Special, Transport; deductions: PF, ESI, TDS, PT, LOP)
- [x] Monthly payroll run (fetch attendance → calculate working days → LOP → gross → deductions → net)
- [x] PF calculation (employee 12% + employer 12% of Basic)
- [x] ESI calculation (employee 0.75% + employer 3.25% — applicable if gross ≤ ₹21,000)
- [x] TDS calculation (per income tax slab — annual computation / 12, configurable slabs)
- [x] Professional Tax (state-wise slab, monthly deduction + remittance challan)
- [x] Labour Welfare Fund (state-wise, bi-annual remittance)
- [x] LOP calculation (LOP days / working days × gross)
- [x] **Gratuity provision** — monthly provision accrual: (Basic+DA) × years × 15/26; disbursement on exit ≥ 5 years
- [x] **Salary advance & loan** — request, approval, EMI auto-deduction from payslip, outstanding balance tracking
- [x] Payslip generation (PDF, password-protected with DOB)
- [x] EPF ECR format data export (for EPFO portal upload)
- [x] **Form 16** — annual TDS certificate per staff, auto-generated from payroll data
- [x] Payroll Service Dockerfile

### 2.7 Certificate Service (10 tasks) ✅
- [x] NestJS app scaffold (`apps/certificate-service/`)
- [x] Certificate template management (Bonafide, Character, Migration, Sports, Attendance, Participation, Conduct, Experience, Relieving)
- [x] Certificate request workflow — student/parent requests → admin reviews → SLA 2 working days → approved
- [x] Dynamic field injection (student name, class, DOB, dates, purpose, principal name)
- [x] PDF generation with school letterhead + branding (Puppeteer)
- [x] Digital signature (DSC upload by Principal; applied to every issued certificate — IT Act 2000 valid)
- [x] QR code per certificate (unique, links to public verification page)
- [x] Public verification endpoint (`/verify/:qr` — shows name, cert type, date, school; no sensitive PII)
- [x] Certificate revocation (admin revokes → QR invalidated instantly)
- [x] DigiLocker push (India — push issued certificate to student's DigiLocker account)
- [x] Certificate Service Dockerfile

### 2.8 Survey & Feedback Service (8 tasks) ✅
- [x] Survey builder — drag-drop question types: Rating (1–5 / 1–10), MCQ, Checkbox, Text, NPS
- [x] Conditional logic (show question B only if answer to A = X)
- [x] Survey types: Student satisfaction, Parent feedback (anonymous), Teacher 360° appraisal, Staff self-assessment, Post-event, Course rating, Canteen, PTM experience, Exit interview, Teacher pulse (monthly)
- [x] Survey distribution — target: specific class/section/role/all; schedule open/close dates
- [x] Anonymous mode (respondent ID not stored)
- [x] Results dashboard — response rate, per-question breakdown, NPS score, promoter/passive/detractor split
- [x] Sentiment analysis on open text (AI keyword extraction — positive/neutral/negative tagging)
- [x] Trend comparison (same survey across terms — improvement/decline tracking)

### 2.9 PTM Service (6 tasks) ✅
- [x] PTM event creation (date, slot duration configurable, virtual mode flag)
- [x] Teacher slot availability setup (start time, end time → auto-divide into slots)
- [x] Parent slot booking (select teacher → pick available slot → confirmation + calendar invite)
- [x] Teacher appointment schedule view (full day calendar)
- [x] Visitor pre-registration auto-generated from PTM booking (parent shows QR at school gate)
- [x] Post-PTM remarks entry by teacher (private — visible only to admin and that parent)

### 2.10 Parent Portal (12 tasks) ✅
- [x] Next.js 14 app scaffold (`apps/parent-portal/`)
- [x] Auth + multi-child switcher (one account → multiple children, independent dashboards)
- [x] Dashboard (attendance %, fee dues, today's homework, upcoming exams, recent results, transport status)
- [x] Attendance view (daily status + monthly calendar + subject-wise % + absence history)
- [x] Result + report card download
- [x] Fee payment (Razorpay integration + receipt download + payment history + PDC submission status)
- [x] Homework + assignment status view + LMS course progress %
- [x] Teacher messaging + PTM slot booking
- [x] School announcements + events calendar + circular downloads
- [x] Transport live tracking (Google Maps embed + WebSocket live position + stop ETA)
- [x] Leave application for child + gate pass request (pickup authorisation)
- [x] Survey participation + certificate request/download

### 2.11 Admission & Enquiry Service (10 tasks) ✅
- [x] NestJS app scaffold (`apps/admission-service/`)
- [x] Online enquiry form (website embed + walk-in + WhatsApp capture)
- [x] Enquiry source tracking (Google Ads, referral, banner, website, walk-in, social media, WhatsApp)
- [x] Enquiry follow-up log (call / email / visit / WhatsApp — outcome, next action, next date)
- [x] Admission application form + document upload checklist
- [x] OCR auto-fill from uploaded documents (AWS Textract — extract DOB, name from birth cert)
- [x] Application approval workflow (document review → interview scheduling → offer → rejection → waitlist)
- [x] RTE quota seat management (25% EWS — income verification, lottery draw if oversubscribed, government reimbursement claim tracking)
- [x] Application → Student record auto-creation on seat confirmation + fee payment
- [x] Enquiry-to-admission conversion funnel report + source-wise analytics
- [x] Admission Service Dockerfile

### 2.12 Academic Calendar Service (4 tasks) ✅
- [x] Master academic calendar CRUD (holidays, exams, events, PTMs, results day — all in one)
- [x] Calendar visible across all portals (students, teachers, parents, admin — single source of truth)
- [x] iCal / Google Calendar export (parents and teachers can subscribe)
- [x] Working day calculator (used by Attendance threshold and Payroll LOP calculation)

### 2.13 Emergency Alert System (4 tasks) ✅
- [x] One-click emergency broadcast endpoint (simultaneously: SMS + WhatsApp + Push + Voice to ALL parents/staff/students)
- [x] Alert types config (school closure, natural disaster, medical emergency, security lockdown, early dismissal)
- [x] Acknowledgement tracking (which parents confirmed receipt; re-alert unacknowledged after 10 min)
- [x] All-clear broadcast + alert archive log

### 2.14 Internal Staff Communication (4 tasks) ✅
- [x] Staff notice board (admin publishes internal circulars — staff-only, mandatory read receipt)
- [x] Department / grade-level group announcements (HOD → department staff)
- [x] Direct messaging (staff ↔ staff, with admin oversight option)
- [x] Circular digital acknowledgement tracking (who read, who pending — admin dashboard)

---

## Phase 3 — Operations
**Target:** Transport + Health + Visitor + Cafeteria + Library + Events + Expense + Company Portal + SaaS Service + Reporting + More

### 3.1 Transport Service (14 tasks) ✅
- [x] NestJS app scaffold (`apps/transport-service/`)
- [x] Route + stop CRUD (lat/lng, sequence, expected arrival time)
- [x] Vehicle + driver management (registration, capacity, GPS device ID)
- [x] Student-to-route/stop assignment (per academic year, direction: both/pickup/drop)
- [x] Trip management (start, end, status, incident notes)
- [x] MQTT GPS location ingestion (HiveMQ / AWS IoT — ping every 30 sec)
- [x] Real-time location broadcast via WebSocket (parent portal live map)
- [x] Geofencing: 500m from stop → parent push "bus approaching"
- [x] Geofencing: school boundary → admin notification "bus arrived"
- [x] Speed alert (> 60 km/h → Transport Manager push)
- [x] Route deviation alert (> 200m off route → admin push)
- [x] **Pre-trip safety checklist** (driver completes: tyres, brakes, lights, horn, first aid, extinguisher — if any critical item fails, trip blocked)
- [x] **Vehicle maintenance log** (service history, tyre records, fuel log, insurance/fitness/PUC expiry reminders)
- [x] Trip history + location log replay (stored in InfluxDB; viewable by admin)
- [x] Transport Service Dockerfile

### 3.2 Health & Medical Service (12 tasks) ✅
- [x] NestJS app scaffold (`apps/health-service/`)
- [x] Student medical profile (blood group, allergies JSON, conditions, medications, emergency contact, insurance)
- [x] Nurse daily visit log (student, complaint, vitals: temp/BP/pulse, treatment, medication, disposition, parent notified)
- [x] **Medication administration log** (chronic conditions — scheduled dose, administered time, missed dose alert, parent consent stored)
- [x] Health incident report (injury type, severity, first aid, referral — auto-notify parent on any incident)
- [x] Vaccination records + reminders (due date → parent push 30 days + 7 days before)
- [x] Annual fitness / BMI health record (height, weight, BMI, vision, hearing — per year)
- [x] **AED inventory** (location, pad expiry, battery level, trained staff list, nearest AED per area)
- [x] **Mental Health First Aid** — staff MHFA certification tracking, renewal alerts, DSL designation
- [x] Student counselling sessions (confidential — counsellor + principal access only; referral source, case type, notes encrypted, follow-up scheduling)
- [x] Student discipline module (incident log, escalation: warning → detention → suspension → expulsion, parent notification, counsellor referral)
- [x] Student mental health wellness tracker (anonymous weekly mood check; if distressed → counsellor notified without name)
- [x] Health Service Dockerfile

### 3.3 Visitor Management Service (8 tasks) ✅
- [x] Visitor registration (name, purpose, host, government ID scan, webcam photo)
- [x] Blacklist check on ID number before approving entry
- [x] Host notification (push to staff being visited — approve or deny within 5 min)
- [x] QR visitor pass generation (valid for visit duration; printer or screen display)
- [x] Check-in + check-out tracking (time on campus recorded; badge colour-coded by type)
- [x] **Student gate pass** (parent requests via portal with reason + pickup time → class teacher approves → security gets notification → parent shows QR → exit recorded + digital signature)
- [x] Delivery management (courier log: description, recipient, collected-at timestamp)
- [x] Pre-registration (parent registers via portal for PTM / events — QR generated in advance; linked to PTM booking)
- [x] Visitor Service Dockerfile

### 3.4 Cafeteria Service (8 tasks) ✅
- [x] Daily/weekly menu management (Canteen Manager uploads items + nutritional info per meal type)
- [x] Pre-order system (students/parents order by 8 PM previous day; kitchen gets summary by 8 AM)
- [x] Allergen filtering at POS (student's allergen profile checked — warning if incompatible meal scanned)
- [x] Student wallet (balance, low-balance threshold alert to parent, top-up via Parent Portal payment gateway)
- [x] POS billing (scan student QR/ID → wallet deducted; receipt generated)
- [x] Daily order summary for kitchen (total quantities per item)
- [x] Monthly nutritional analysis per student (excess sugar/sodium flagged)
- [x] **FSSAI compliance tracking** (license number + expiry, canteen staff health certificates, monthly food safety checklist, water testing records, food sample retention log)

### 3.5 Library Service (12 tasks) ✅
- [x] NestJS app scaffold (`apps/library-service/`)
- [x] Book catalogue CRUD (ISBN, title, author, publisher, category, total copies, shelf location, RFID/barcode)
- [x] RFID/barcode issue and return (scan → auto-update available copies; student ID scan)
- [x] Member management (borrowing limits per role: student max 2 books, staff max 5)
- [x] Reservation/hold request for checked-out books (notified when returned, 48-hr hold)
- [x] Overdue fine calculation (daily rate, configurable per school; fine added to fee invoice)
- [x] Digital library catalogue (eBook links, reading tracking; NCERT digital content links)
- [x] Periodicals register (newspaper/magazine subscription log; daily issue record)
- [x] Annual stock audit (physical count entry → discrepancy report vs system)
- [x] Book purchase recommendation workflow (student/teacher suggests → admin approves → PO auto-raised via Expense module)
- [x] Inter-library loan request (borrow from partner school; loan tracking)
- [x] **Reading program** (school sets annual reading target; student logs books read; teacher validates; reading leaderboard opt-in; certificate on target completion; auto-linked to library issue/return)
- [x] Library Service Dockerfile

### 3.6 Event & Activity Service (10 tasks) ✅
- [x] Event CRUD (Sports Day, Annual Day, Field Trip, PTM, Workshop, Competition — with budget)
- [x] Participant registration (students + staff + parents; consent form for trips with document upload)
- [x] **Sports Day management** — track & field events master, heat/semifinal/final brackets, House points table, medal tally, timing/distance entry, champion house declaration
- [x] **Drama / Production management** — audition scheduling, casting decisions, rehearsal schedule, costume/prop inventory, ticket sales (online booking from Parent Portal), show-night QR check-in, cast/crew certificates
- [x] **Debate, Quiz & Academic Competition** — competition types, participant registration (individual/team), round bracket management (prelim → semi → final), judges panel + scoring rubric, result declaration
- [x] Club management (enrollment + admin approval, faculty advisor, meeting schedule, club session attendance, achievement tracking)
- [x] **NCC / NSS / Scouts & Guides** — unit registration, member enrollment, rank progression, camp participation, hours/activities tracking, certificate exam eligibility (NCC A/B/C; NSS 240hrs; Scout badge progression)
- [x] **Student Council / School Parliament** — online election (nomination, voting, results), council roles (President, VP, House Captains), meeting minutes, council budget, proposal approval workflow
- [x] **House / Team system** — house master (custom names/colours/motto), student house assignment, points award (sports/academics/discipline/culture), real-time leaderboard, inter-house competition linkage
- [x] Post-event photo gallery publishing + achievement auto-linked to student portfolio

### 3.7 Expense & Budget Service (12 tasks) ✅
- [x] Annual budget setup (department-wise, line items, Company Portal approval, version control)
- [x] Expense entry (petty cash, vendor payments, utilities, salaries — linked to budget line item)
- [x] Purchase order workflow (request → HOD approval → Admin approval for large amounts → PO generated → goods receipt → 3-way invoice match → payment)
- [x] Vendor management (GSTIN, bank details, categories, performance rating, blacklist)
- [x] Budget vs actual spend report (monthly + YTD, per department, chart)
- [x] GST input tax credit tracking (ITC on vendor invoices; reconcile with GSTN)
- [x] GSTR-1 + GSTR-3B data export format
- [x] **TDS on vendor payments** — Section 194C/194J: deduct TDS, generate challan, Form 16A quarterly
- [x] **Bank reconciliation** — import bank statement (CSV/OFX), auto-match transactions with fee payments + expenses (amount + date ± 2 days + narration keyword), flag unmatched, reconciliation sign-off PDF
- [x] **Cash denomination register** — opening balance, denomination-wise cash received/paid, closing balance, bank deposit with slip upload, cashier shift handover
- [x] **Revenue recognition** — accrual accounting, deferred revenue (advance fees), month-end close sign-off, year-end P&L export for auditors, auditor read-only role
- [x] **Vendor self-service portal** — vendor views own POs, invoices submitted, payment status, raises dispute, uploads compliance docs

### 3.8 Scholarship Service (8 tasks) ✅
- [x] Scholarship scheme CRUD (merit, need-based, sports, government, donor — eligibility criteria, seats, award amount/%)
- [x] Student application + document submission via portal
- [x] Eligibility auto-check (system filters ineligible before review)
- [x] Review committee workflow (assigned reviewers, rubric scoring, final approval by School Admin / Company Portal)
- [x] Auto-apply scholarship discount to student fee invoice on approval
- [x] Government scholarship tracking (PM e-VIDYA, state schemes — external portal status, disbursement received)
- [x] Donor-funded scholarship (link to Corporate Partnership module, fund utilisation report to donor)
- [x] Scholarship analytics (who received, amount, fund source, utilisation by academic year)

### 3.9 Alumni Service (6 tasks) ✅
- [x] Alumni registration (graduating students auto-invited on TC issuance)
- [x] Alumni directory (searchable: batch year, city, employer, industry — opt-in visibility)
- [x] Job board (alumni posts job; school-moderated; current students / alumni apply)
- [x] Placement tracking (employer, industry, salary range anonymous — for school analytics)
- [x] Mentor-mentee linking (alumnus volunteers as mentor; student requests mentoring session)
- [x] Donation / fundraising management (campaign, donation recording, receipt generation, impact report to donor)

### 3.10 Community & Engagement (8 tasks) ✅
- [x] **Parent-Teacher Association (PTA) / SMC management** — committee member register (elected/nominated, tenure), meeting agenda + minutes + action items, PTA fund ledger (separate from school fees), resolution publishing to Parent Portal, online voting for PTA decisions, SMC composition compliance report (government schools)
- [x] **Parent volunteer management** — registration of interest (skills: teaching, driving, events), opportunity posting, application + approval, volunteer hours tracking, certificate for top volunteers, background check status
- [x] **Community service tracking** (student hours, NGO partner list, organisation contact, service certificate on target completion, hours on portfolio)
- [x] **Corporate Partnership & CSR management** — partner master (company, contact, CSR budget, focus areas), MOU tracking, activity-CSR linkage, fund utilisation report auto-generation, impact metrics from ERP data, thank-you letter + impact report
- [x] **Lost and found management** (found item log, photo, school-wide push announcement, claimant record, unclaimed disposal after 30 days)
- [x] **School store / bookshop** — product catalogue (uniforms by size, stationery, textbooks, school merchandise), inventory + reorder alerts, online purchase from Parent Portal, POS with student QR scan, tailor integration (custom uniform orders + measurements), seasonal stock planning
- [x] **Bulk voice call / robo-call system** (pre-recorded or TTS outbound calls; delivery status: answered/not; retry if unanswered; multi-language audio templates)
- [x] **Digital signage / school TV** (content management: announcements, timetable changes, birthday wishes, event countdowns; schedule per screen; emergency override to all screens)

### 3.11 Facility Management (8 tasks) ✅
- [x] Maintenance request submission (location, issue type, photo; auto-assign by category)
- [x] SLA tracking per category (electrical 4hr, plumbing 2hr, general 24hr; breach alert)
- [x] Preventive maintenance schedule (AC quarterly, generator annual, lift 6-monthly — auto-task creation)
- [x] **Pest control & housekeeping** — contractor schedule, compliance certificates, housekeeping duty roster, daily area inspection scorecard, below-threshold escalation
- [x] **Utility & energy management** — monthly electricity/water/internet bill entry, consumption trend, energy efficiency KPI (per student), solar panel tracking, utility budget vs actual
- [x] **Waste management** — segregation log (dry/wet/hazardous/e-waste), disposal contractor records, recycling tracking, sustainability KPIs
- [x] **Water quality management** — RO/purifier maintenance schedule, filter replacement, monthly lab testing results upload, compliance status
- [x] **Swimming pool management** (daily water quality log: pH, chlorine, turbidity; chemical dosing; lifeguard roster; student swimming levels; safety equipment inventory; accident log)

### 3.12 Asset Management (6 tasks) ✅
- [x] Fixed asset register (capital items: furniture, equipment, computers, vehicles, buildings — QR tag, purchase date, cost, location, condition)
- [x] Asset depreciation calculation (SLM or WDV method, current value tracking)
- [x] Asset allocation (which room/department holds each asset)
- [x] Asset maintenance log (service date, service provider, cost, next service due)
- [x] **School property insurance** (policy details, sum insured, premium, renewal alert 60 days before, claim management: incident → assessment → filing → settlement)
- [x] Annual asset verification report (system count vs physical count, discrepancy flag)

### 3.13 Report & Analytics Service (10 tasks)
- [x] NestJS app scaffold (`apps/report-service/`)
- [x] PDF report engine (Puppeteer — all reports, report cards, payslips, receipts, certificates)
- [x] Excel report engine (ExcelJS — all list exports)
- [x] Attendance consolidated report (school-wide, class-wise, staff)
- [x] Fee collection consolidated report (daily, monthly, term, YTD, by payment mode)
- [x] Academic performance report (class-wise, school-wide, subject-wise, rank lists)
- [x] HR & payroll reports (staff count, salary cost, leave utilisation, CPD hours, appraisal distribution)
- [x] Custom report builder (admin selects: data source, dimensions, measures, filters, date range → tabular or chart; save as template; schedule email delivery)
- [x] **Real-time operations dashboard** (live attendance % per class, all buses on map, visitors on campus count, today's fee collection running total, pending approvals count, today's clinic visits, canteen order queue, compliance overdue items)
- [x] Report Service Dockerfile

### 3.14 Company / Management Portal (10 tasks)
- [x] Next.js 14 app scaffold (`apps/management-portal/`)
- [x] Auth + multi-school switcher
- [x] Master dashboard (all schools — enrolment, fee collection vs target, staff, compliance alert flags, real-time ops view)
- [x] School-wise performance comparison (academic, financial, HR, compliance)
- [x] Consolidated financial reports (fee, expense, payroll cost, outstanding, GST, forecast)
- [x] Admission funnel across all schools (enquiry → application → admitted conversion %)
- [x] AI insights dashboard (dropout risk, fee defaulter prediction, enrolment forecast, teacher effectiveness)
- [x] Subscription + license management per school (plan, student count, MRR, renewal date)
- [x] Audit logs across all schools (filter by school, date, user, action type)
- [x] **Your own SaaS analytics** — MRR, ARR, churn rate, NRR, LTV:CAC ratio, active schools, revenue per student

### 3.15 SaaS Management Service (10 tasks)
- [x] NestJS app scaffold (`apps/saas-service/`)
- [x] Tenant lifecycle (create → trial → activate → suspend → reactivate → churn)
- [x] Subscription plan CRUD + feature flags per plan (Basic/Standard/Premium/Enterprise)
- [x] Billing engine (per-student pricing, tiered slabs, GST invoicing to schools, annual discount)
- [x] NACH / UPI / bank transfer payment collection from schools
- [x] Customer health score calculation (login frequency, feature adoption %, support tickets, NPS, payment timeliness)
- [x] **Support ticket system** (in-app submission; AI chatbot tier 1; agent tier 2 with SLA per plan; engineering tier 3 linked to Sentry; status page: status.yourproduct.com)
- [x] **Onboarding wizard** (new school: school profile → academic structure → grading scale → fee structure → staff import → student import → training → go-live checklist)
- [x] Developer API key issuance + rate limiting per key + usage dashboard
- [x] SaaS Service Dockerfile

---

## Phase 4 — Intelligence & Mobile
**Target:** Mobile apps + AI features + Biometric + Multi-language + Advanced Analytics

### 4.1 Mobile Apps — React Native / Expo (16 tasks)
- [ ] Expo monorepo setup (`apps/mobile/`) with shared packages
- [ ] Auth flow (login, OTP, biometric: TouchID / FaceID)
- [ ] Student app — Dashboard (attendance %, pending fees, upcoming exams, engagement score)
- [ ] Student app — Timetable + homework checklist
- [ ] Student app — Attendance view + leave application
- [ ] Student app — Assignments submission + online quiz delivery
- [ ] Student app — Fee payment (Razorpay React Native SDK)
- [ ] Student app — LMS video lessons + progress tracking (offline download support)
- [ ] Student app — Digital ID Card (QR code; scannable for gate, library, canteen)
- [ ] Parent app — Dashboard + multi-child switcher
- [ ] Parent app — Attendance + result + homework view
- [ ] Parent app — Fee payment + wallet top-up
- [ ] Parent app — Transport live tracking (Google Maps SDK + WebSocket)
- [ ] Parent app — Push notifications (FCM) + notification preference management
- [ ] **Offline data sync** — IndexedDB cache for timetable/roster/student list; background sync on reconnect; conflict resolution UI (show diff → user decides)
- [ ] App Store (iOS) + Play Store (Android) build configs + OTA update setup

### 4.2 AI / ML Service (14 tasks)
- [ ] Python FastAPI scaffold (`apps/ai-service/`)
- [ ] Dropout prediction model (attendance trend + marks + fee payment + LMS engagement → classification)
- [ ] Fee defaulter prediction model (payment history + fee amount + parent income proxy → classification)
- [ ] Grade forecasting model (mid-term marks + attendance % + assignment submission rate → regression)
- [ ] Teacher effectiveness scoring (teacher-class mapping → attendance trend → exam performance correlation)
- [ ] **Bus route optimisation** (Google OR-Tools VRP — input: all student addresses; constraints: capacity, max ride time; output: optimal routes with cost savings projection)
- [ ] **Plagiarism detection** (TF-IDF cosine similarity against internet + same-class submissions + previous years; similarity score + highlighted matches + sources identified)
- [ ] **AI-assisted grading** (LLM rubric scoring for long-form answers — suggests content score, language score, key points covered/missed; teacher accepts/modifies/overrides)
- [ ] Enrolment prediction model (enquiry volume + historical conversion + area demographics → regression)
- [ ] Financial forecasting (fee income forecast, payroll cost forecast, cash flow month-by-month, scenario analysis: best/base/worst case)
- [ ] **Parent engagement score** (portal logins, fee payment timeliness, PTM attendance, survey completion, volunteer participation → composite score; class-level heatmap)
- [ ] **Teacher workload analytics** (periods/week, students, assignments to grade, duties → composite score; flag overloaded teachers before adding more)
- [ ] Anomaly detection (sudden attendance drop, unexpected fee spike, high nurse visit frequency → alert admin)
- [ ] Cohort analysis (track batch from Grade 1 → Grade 12; progression rate, dropout, average performance, fee consistency)
- [ ] AI Service Dockerfile (Python + ML dependencies)

### 4.3 Biometric Integration (6 tasks)
- [ ] On-premise biometric bridge service (Node.js, runs on school server)
- [ ] ZKTeco / eSSL SDK integration (punch data fetch at configurable interval)
- [ ] Local MQTT publish of punch events (to local broker)
- [ ] Cloud MQTT subscribe → Attendance Service sync
- [ ] Conflict resolution (biometric vs manual — flag for admin review in Admin Portal)
- [ ] Device health monitoring + offline alert (if device not seen in > 30 min → alert Transport Manager)

### 4.4 Plagiarism Detection Standalone (4 tasks)
- [ ] Assignment submission auto-scan on upload (runs asynchronously via BullMQ)
- [ ] Similarity score sent to teacher review queue
- [ ] Student sees own score before final submission (deterrent)
- [ ] Plagiarism trend report per class per term

### 4.5 Multi-language Support (10 tasks)
- [ ] i18n setup across all portals (next-intl for Next.js portals)
- [ ] Language switcher UI component (header dropdown; preference saved to user profile)
- [ ] English translations (base — all portal strings)
- [ ] Hindi translations (all portal strings + notification templates)
- [ ] Telugu translations (all portal strings + notification templates)
- [ ] Tamil translations (all portal strings + notification templates)
- [ ] Kannada translations (portal strings)
- [ ] Malayalam translations (portal strings)
- [ ] Notification templates in all languages (SMS, WhatsApp, Email — event type × language)
- [ ] Date / number / currency formatting per locale (Intl API)

### 4.6 Advanced Analytics & BI (8 tasks)
- [ ] Data warehouse schema design (Snowflake / BigQuery — star schema for all fact tables)
- [ ] Nightly ETL pipeline (operational DB → data warehouse; incremental loads)
- [ ] Metabase / Grafana BI connector (read-only credentials for advanced schools)
- [ ] Teacher workload analytics dashboard (portal UI)
- [ ] Financial forecasting dashboard (portal UI with scenario sliders)
- [ ] Student learning analytics dashboard (LMS time-on-task, quiz attempts, completion heatmap)
- [ ] School public website CMS (simple page builder in Admin Portal: Home, About, Admissions, Events, Gallery, Contact; enquiry form → Admission Service; custom domain + SSL)
- [ ] **Social media auto-publishing** (admin posts achievement from ERP → auto-post to school Facebook/Instagram; parental consent check; post scheduling; engagement analytics)

### 4.7 Developer API Platform (8 tasks)
- [ ] Public REST API gateway with API key authentication
- [ ] Webhook dispatcher (student_enrolled, fee_paid, result_published, attendance_marked, etc.)
- [ ] Webhook delivery log + retry logic (3 attempts, exponential backoff; delivery status in dashboard)
- [ ] API rate limiting per key (configurable per plan: Basic 100/min, Enterprise 1000/min)
- [ ] API usage dashboard (requests today/month, error rate, latency P50/P95)
- [ ] OpenAPI / Swagger documentation portal (auto-generated, always in sync, with sandbox)
- [ ] Sandbox environment (isolated test tenant with sample data, API key auto-provisioned on sign-up)
- [ ] 6-month deprecation notice process (in-app + email when breaking change planned)

---

## Phase 5 — Platform & DevOps
**Target:** Blockchain + Infrastructure hardening + Security + IoT + School Email + Error Tracking

### 5.1 Blockchain Certificate Verification (4 tasks)
- [ ] Smart contract deployment (Polygon Mumbai testnet → Polygon mainnet)
- [ ] Certificate hash recording on-chain on every issuance
- [ ] Public verification page (enter certificate hash or scan QR → blockchain confirms: valid / invalid / revoked)
- [ ] Batch hash recording (gas optimisation — batch multiple certs per transaction)

### 5.2 Infrastructure Hardening (14 tasks)
- [ ] Kubernetes manifests for all services (Deployment, Service, HPA, PDB, ConfigMap, Secret)
- [ ] Helm charts for each service (values.yaml per environment)
- [ ] Cert-manager for TLS (Let's Encrypt auto-renew)
- [ ] Ingress-nginx configuration (routing, rate limiting, SSL termination)
- [ ] Horizontal Pod Autoscaler rules (CPU 70% → scale up; scale down after 5 min cooldown)
- [ ] PostgreSQL HA (CloudNativePG operator) + read replicas for analytics queries
- [ ] Redis Cluster setup (3 masters + 3 replicas)
- [ ] Kafka cluster (3 brokers + ZooKeeper quorum; topic replication factor 3)
- [ ] HashiCorp Vault for secrets management (all API keys, DB passwords, JWT secrets injected via Vault agent)
- [ ] Prometheus + Grafana monitoring stack (dashboards per service: RPS, latency, error rate, saturation)
- [ ] ELK stack (Elasticsearch + Logstash + Kibana — centralised log aggregation, retention 2 years)
- [ ] Jaeger / AWS X-Ray distributed tracing (trace every request across all microservices)
- [ ] **Sentry error tracking** (real-time JS + API errors; stack trace + user context; alert engineering on spike)
- [ ] Disaster recovery testing (automated DR runbook: hourly DB backup to S3; cross-region replica; RTO < 4hr, RPO < 1hr — test quarterly)

### 5.3 Advanced Security (10 tasks)
- [ ] OWASP ZAP DAST in CI pipeline (weekly automated scan against staging; blocks deploy on critical findings)
- [ ] Snyk / Trivy dependency vulnerability scanning (every PR; critical vulnerabilities block merge)
- [ ] SonarQube SAST (static analysis on every PR; code quality gate)
- [ ] Data masking for non-production environments (PII: phone → last 4 digits, email → x***@***.com, Aadhaar → ****)
- [ ] GDPR right-to-erasure automated workflow (parent/student submits → PII pseudonymised within 30 days → aggregates retained)
- [ ] **Data Governance & Privacy Console** (user-facing: view stored data, consent management, data download request, right to rectification, right to erasure, privacy notice re-consent on update)
- [ ] Audit log immutability (append-only, HMAC-signed — any tampering detectable)
- [ ] Session anomaly detection (unusual IP/device → force re-auth + admin alert)
- [ ] IP whitelisting for Admin + Company Portal (CIDR range per school; bypass via 2FA challenge)
- [ ] Quarterly manual penetration test (third-party security firm; scope: all portals, all APIs, mobile apps)

### 5.4 School Email System Integration (4 tasks)
- [ ] Google Workspace for Education integration (auto-provision school-domain email on student enrolment)
- [ ] Microsoft 365 EDU integration (alternative; admin chooses provider per school)
- [ ] Auto-deprovision email on TC issuance or graduation
- [ ] Email archiving for compliance (7-year retention per school policy)

### 5.5 IoT Sensor Integration (8 tasks)
- [ ] Air quality sensor data ingestion (CO2, PM2.5 per classroom → alert if CO2 > 1000 ppm)
- [ ] Smart electricity meter data (real-time consumption per floor/block)
- [ ] Smart water meter data (daily usage per block, leak detection on anomaly)
- [ ] Automated lights/AC control hook (occupancy sensor data → signal to BMS)
- [ ] Sensor data pipeline → InfluxDB (time-series, 90-day retention)
- [ ] Building health live dashboard (facility manager view: all sensors, all alerts)
- [ ] Alert thresholds configuration UI (admin sets CO2, PM2.5, temperature limits per room type)
- [ ] Monthly IoT sensor report (average air quality, energy consumption trend per classroom)

### 5.6 MDM & Device Management (4 tasks)
- [ ] School-issued device inventory (device ID, model, assigned student)
- [ ] MDM integration (Jamf / Microsoft Intune: push apps, lock, wipe on theft)
- [ ] Screen time scheduling (device locks during class if teacher activates lesson mode)
- [ ] App whitelist/blacklist + software license management

### 5.7 Feature Management (4 tasks)
- [ ] Feature flag system (enable/disable features per tenant without redeployment — Redis-backed)
- [ ] Gradual rollout (5% → 20% → 50% → 100% of tenants; auto-rollback on error spike)
- [ ] A/B testing framework (show different UX to different tenant groups; measure engagement)
- [ ] Beta school program (willing schools receive new features first; opt-in from Company Portal)

---

## Phase 6 — Niche, Compliance & Community
**Target:** International + Hostel + Pre-Primary + Vocational + Compliance + Gamification + Governance

### 6.1 POSH & Child Safety Compliance (8 tasks)
- [ ] **POSH module** — ICC member register (designation, tenure), complaint portal (confidential, anonymous option), investigation timeline tracking (mandatory 90 days), annual report auto-generation (filed with District Officer — mandatory by 31 Jan), policy digital acknowledgement (all staff annually), third-party complaint coverage
- [ ] **POCSO mandatory reporting workflow** — abuse incident logged → system generates POCSO report draft → DSL notified → mandatory filing reminder with 24-hour deadline
- [ ] **Child Safeguarding Policy** — DSL role designation, all staff digital acknowledgement annually, all incidents routed to DSL, visitor vetting integration
- [ ] Staff background check tracking (police verification status per staff member — blocks certain permissions until verified)
- [ ] Annual POSH training completion tracking (certification upload, compliance alert if any staff not completed)
- [ ] Safeguarding incident log (confidential — access restricted to DSL + Principal only; encrypted)
- [ ] **Building safety & infrastructure compliance** — structural audit log, certificate of occupancy, electrical audit, generator compliance (pollution cert, fuel storage licence), ramp/accessibility audit (RPwD Act), annual building compliance calendar
- [ ] **Fire safety module** — drill records (quarterly mandatory), fire extinguisher inventory (location, type, inspection date, expiry), evacuation plan upload (assembly points per class), first aid kit inventory, emergency exit inspection log, fire NOC tracking

### 6.2 Labour Law & Statutory Compliance (8 tasks)
- [ ] **Annual compliance calendar** — all items with deadlines, responsible person, 60/30/15/7-day reminders, document upload on completion, overdue flagged red in Admin + Company Portal
- [ ] Minimum wage compliance check (support staff wages vs state minimum wage — auto-flag breach)
- [ ] Labour Welfare Fund (state-wise monthly deduction + bi-annual remittance, challan generation)
- [ ] Professional Tax annual return data export (state-wise format)
- [ ] ESI monthly challan generation + annual return data export
- [ ] EPF ECR monthly file generation + annual PF statement per employee
- [ ] **RTI Management** — application receipt + RTI number, 30-day response deadline tracking, department-wise information compilation, response document formatting, first/second appeal timeline, RTI register (mandatory), Section 4 proactive disclosure published on school website CMS
- [ ] UDISE+ data compilation + export (annual school data submission to government portal)

### 6.3 RTE & Government Compliance (6 tasks)
- [ ] **RTE 25% reservation** — seat allocation per class per year, income certificate verification workflow, lottery draw (randomised, transparent — log stored), student tagged as RTE in system
- [ ] Government reimbursement claim per RTE student (fee structure × RTE student count × term → claim document generation)
- [ ] Reimbursement tracking (claim filed → pending → received; shortfall tracked separately)
- [ ] RTE student progress monitoring (government requires attendance + performance tracking — auto-report)
- [ ] RTE compliance report for District Education Officer (monthly: seats, applicants, admitted, attending)
- [ ] **APAAR ID / ABC integration** (Academic Bank of Credits API — generate or import APAAR ID per student; push academic credits; DigiLocker linkage; credit transfer on school change)

### 6.4 International School Modules (8 tasks)
- [ ] **IB PYP (Grades 1–5)** — UOI planning, transdisciplinary theme mapping, learner profile assessment, portfolio of student work
- [ ] **IB MYP (Grades 6–10)** — subject group management, ATL skills assessment, Community Project / Personal Project tracking, eAssessment registration
- [ ] **IB DP (Grades 11–12)** — CAS hours (150hrs: Creativity + Activity + Service) tracking, TOK essay + exhibition tracking, Extended Essay supervisor log, predicted grades, DP exam registration management
- [ ] **Cambridge IGCSE / A-Level** — subject/component management, coursework tracking, Cambridge Centre number + candidate number per student, results day import from Cambridge portal
- [ ] **Foreign / NRI student management** — passport + visa details, renewal reminders (60 days before), foreign student register (immigration compliance), multi-currency fee collection (FX rate from RBI/XE API, FX gain/loss accounting), time zone per parent profile (notifications at appropriate local time)
- [ ] **Apostille & document legalisation** — request workflow, MEA submission tracking, courier tracking, document returned + sticker verified
- [ ] **International staff management** — work permit, visa type/expiry, DTAA benefit tracking, foreign salary component, relocation allowance tracking
- [ ] Multi-currency consolidated report (Company Portal — all currencies converted to base INR for reporting; FX rate used on conversion date recorded)

### 6.5 Hostel / Boarding School Module (10 tasks)
- [ ] Room management (blocks, floors, rooms, beds; room type; capacity)
- [ ] Student bed allotment (per academic year; allotment letter generation)
- [ ] Warden management (assigned per block; duty roster; emergency contact)
- [ ] **Hostel attendance** (daily night count: in hostel / weekend leave / holiday leave; roll call report to Principal)
- [ ] Mess / dining management (meal plan per student; dietary preferences; monthly mess bill; food wastage log)
- [ ] Hostel fee (room rent + mess + laundry + utilities — separate fee head; auto-added to student invoice)
- [ ] **Leave & outing management** (student applies; warden → parent approval chain; gate pass issued; return time tracked)
- [ ] Hostel visitor log (separate from school gate; visiting hours enforced)
- [ ] Hostel incident register (fights, property damage, health issues — warden logs, parent notified)
- [ ] **Staff quarters / housing management** — housing unit master (type, block, floor), staff allotment (waiting list if no vacancy), monthly rent + utility deduction from salary, vacating checklist on exit, guest house booking system

### 6.6 Pre-Primary / Play School Module (8 tasks)
- [ ] Daily activity log per child (nap time, meals eaten, mood, activities participated)
- [ ] **Parent daily report** — auto-generated at end of day: what child did, ate, mood, incidents → pushed to Parent Portal + WhatsApp
- [ ] Developmental milestone tracking (gross motor, fine motor, language, cognitive, social-emotional — age-appropriate milestones per month)
- [ ] Allergen-specific meal tracking (per-child allergen profile; kitchen flagged; POS blocks incompatible meal)
- [ ] **Photo / video diary** (teacher uploads 2–3 photos per child per day → parent sees in app — parental consent required; GDPR-compliant; photos not shared with other parents)
- [ ] Pickup authorisation (parent specifies authorised pickup persons with photos; security app checks at gate; child cannot be released to unauthorised person)
- [ ] Potty training log (2–3 year olds — sensitive, access restricted to key carer + parent)
- [ ] Nap schedule management per child (individual schedule; nurse log for sleep issues)

### 6.7 Vocational Education & NEP 2020 (6 tasks)
- [ ] Vocational subject master (IT, Beauty & Wellness, Retail, Agriculture, Plumbing, Healthcare, Media — mapped to NSQF levels 1–8)
- [ ] Industry partner linkage (company provides on-the-job training; contact, OJT schedule, supervision)
- [ ] On-the-job training placement (student assigned to industry partner; OJT attendance tracked separately)
- [ ] NSQF competency assessment (skills mapped to NSQF levels; internal + external assessor; sector skill council assessor visit scheduling)
- [ ] NSQF certificate eligibility (auto-calculated on competency completion; certificate issuance tracking; NAPS apprenticeship portal integration link)
- [ ] **NEP 2020 competency-based assessment** — competency framework (NCERT Learning Outcomes per grade per subject), lessons mapped to outcomes, assessment tagged to competencies (Achieved/Partial/Not Yet), holistic progress card (cognitive + physical + social + emotional), FLN dashboard for Grades 1–3

### 6.8 Special Education & IEP (6 tasks)
- [ ] **CWSN student profile** — disability type, government benefits (free books, transport subsidy, scholarship, rehabilitation), flagged on admission
- [ ] IEP creation (goals, accommodations, support required, assistive tech needs; co-created by teacher + counsellor + parent; parent sign-off)
- [ ] IEP review cycle (termly — progress against goals updated; parent sign-off on review)
- [ ] Exam accommodations (extra time, separate room, scribe — auto-linked to Exam module for that student)
- [ ] Special educator assignment (session logs maintained; progress notes)
- [ ] CWSN government compliance report (count, disability category, benefits provided — mandatory for government-aided schools)

### 6.9 Niche School Type Modules (6 tasks)
- [ ] **Multi-shift school** (morning/afternoon/evening — separate timetables, separate attendance sessions, shared facility booking with conflict detection across shifts, combined academic reporting)
- [ ] **Mid-day meal tracking (PM POSHAN)** — daily beneficiary count per class, menu tracking vs government weekly menu, grain/ingredient stock log, cook register + wages, monthly government compliance report, annual inspection readiness
- [ ] **Student discipline complete** — misconduct types, escalation workflow (warning → detention → suspension → expulsion; Principal approval required for suspension+), parent notification on each level, appeal workflow, serial offender flag (3+ incidents/term), POCSO protocol trigger on abuse
- [ ] **Remedial teaching program** — teacher identifies struggling students (marks below threshold), remedial batch creation, separate attendance for remedial sessions, pre/post assessment to measure improvement, program effectiveness report
- [ ] **Practical / lab exam management** — separate practical exam schedule, lab group assignment (students in batches), separate marks entry (internal examiner + external board examiner), equipment checklist, external examiner visit scheduling
- [ ] **Career guidance & college counselling** — aptitude test / interest inventory, career pathway suggestions, college database (cut-offs by stream/year), application tracker (applied/shortlisted/admitted/rejected), competitive exam tracker (JEE/NEET/CLAT), alumni mentor connect integration

### 6.10 Board Affiliation Compliance (4 tasks)
- [ ] Teacher qualification tracking (B.Ed / D.Ed compliance per board requirements per designation)
- [ ] Staff-to-student ratio monitoring (board mandates specific ratios — alert when out of range)
- [ ] Infrastructure compliance checklist (library size, lab equipment, playground — self-assessment)
- [ ] Annual affiliation renewal document checklist + board inspection readiness report

### 6.11 Student Insurance Management (4 tasks)
- [ ] Group student accident insurance policy management (insurer, sum assured, coverage period, premium per student)
- [ ] Premium collection (added to student fee invoice as separate head)
- [ ] Claim filing workflow (accident → generate claim documents → track claim status → settlement amount)
- [ ] Policy renewal alerts (60 days before expiry); claim rejection tracking + appeal management

### 6.12 Gamification & Engagement Engine (10 tasks)
- [ ] Points system (configurable per school: attendance, assignments, quizzes, reading, community service, LMS completion — anti-gaming: no repeat points for same action in 24hr)
- [ ] Badges — tiered (Bronze/Silver/Gold) per category (Academic, Sports, Cultural, Service, Attendance)
- [ ] Streaks (consecutive days: attendance, LMS engagement, homework submission; streak bonus at 7/30/100 days)
- [ ] Leaderboards (class-level + school-level, opt-in only, seasonal resets, top-3 highlighted)
- [ ] Rewards (configurable: canteen wallet credit, library priority borrow, merit certificate — point redemption via Student Portal)
- [ ] **Student digital portfolio** (upload best work per term; teacher endorsement + comment; portfolio grows Grade 1 → Grade 12; export as PDF for college applications; achievement + certificate auto-linked)
- [ ] **Digital ID card** (QR code, scannable: security gate, librarian for book issue, canteen POS; auto-updated on class promotion; downloadable PDF)
- [ ] Student council integration (council achievement auto-linked to portfolio and report card)
- [ ] House points leaderboard (real-time update across Student + Admin portals; inter-house competition linkage)
- [ ] Gamification analytics (most engaged students, activity-wise points distribution, engagement trend)

### 6.13 School Magazine & Digital Yearbook (4 tasks)
- [ ] Digital school magazine builder (rich text + photo layout; student article submissions; teacher editorial review; published to Parent Portal + school website + alumni email)
- [ ] **Digital yearbook** — photo submission portal, editorial review + arrangement, student superlatives voting, senior farewell section, interactive PDF + web version, print version order management (bulk print via vendor)
- [ ] Photo gallery per event (post-event upload by staff; published with parent consent filter)
- [ ] Magazine / yearbook archive (all past issues accessible from Student + Parent portals)

### 6.14 Student Mentoring Program (4 tasks)
- [ ] Senior-junior mentor matching (Grade 10–12 mentor → junior student; teacher supervisor oversight)
- [ ] Mentor-mentee meeting log (date, focus area: academic/social/career, notes)
- [ ] Mentoring effectiveness tracking (did mentee's performance improve? — linked to exam results)
- [ ] Mentor recognition (CPD-equivalent points + portfolio achievement; certificate for top mentors)

### 6.15 Accreditation & Quality Management (4 tasks)
- [ ] Quality framework selection (ISO 21001:2018, NAAC-equivalent, school board QA)
- [ ] Self-Study Report data compilation (auto-pull from ERP: enrolment, staff, infrastructure, results, compliance)
- [ ] Peer review / inspection scheduling + readiness checklist
- [ ] Quality improvement action plan (post-inspection findings → action items → tracking → closed)

---

## Session Log

| Date | Session | Work Done | Files Changed | Commit Hash |
|---|---|---|---|---|
| 2026-04-16 | 1 | Initial checklist creation | PROGRESS.md, CLAUDE.md | pending |
| 2026-04-17 | 2 | Updated PROGRESS.md — added all Blueprint v3 gap tasks (99 new tasks across all phases) | PROGRESS.md | pending |

---

## Quick Reference — Service Port Map

| Service | Port | Status |
|---|---|---|
| API Gateway | 4000 | ✅ Built |
| Auth Service | 4001 | ✅ Built |
| User Service | 4002 | ✅ Built |
| Student Service | 4003 | ✅ Built |
| Academic Service | 4004 | ✅ Built |
| Attendance Service | 4005 | ✅ Built |
| Fee Service | 4006 | ✅ Built |
| Notification Service | 4007 | ✅ Built |
| Exam Service | 4008 | 🔲 Phase 2 |
| LMS Service | 4009 | 🔲 Phase 2 |
| HR Service | 4010 | 🔲 Phase 2 |
| Payroll Service | 4011 | 🔲 Phase 2 |
| Certificate Service | 4012 | 🔲 Phase 2 |
| Admission Service | 4013 | 🔲 Phase 2 |
| Transport Service | 4014 | 🔲 Phase 3 |
| Health Service | 4015 | 🔲 Phase 3 |
| Visitor Service | 4016 | 🔲 Phase 3 |
| Library Service | 4017 | 🔲 Phase 3 |
| Report Service | 4018 | 🔲 Phase 3 |
| SaaS Service | 4019 | 🔲 Phase 3 |
| Scholarship Service | 4020 | 🔲 Phase 3 |
| Alumni Service | 4021 | 🔲 Phase 3 |
| AI Service | 4022 | 🔲 Phase 4 |
| Developer API GW | 4023 | 🔲 Phase 4 |

## Quick Reference — Portal URL Map

| Portal | Dev URL | Status |
|---|---|---|
| Admin Portal | localhost:3000 | ✅ Phase 1 (basic) |
| Teacher Portal | localhost:3001 | 🔲 Phase 1 in progress |
| Student Portal | localhost:3002 | 🔲 Phase 1 next |
| Parent Portal | localhost:3003 | 🔲 Phase 2 |
| Company Portal | localhost:3004 | 🔲 Phase 3 |

---

*Auto-generated by Claude. Updated at end of each build session. Blueprint Reference: School ERP Master Blueprint v3.0 — Definitive Final Edition — 26 Sections — 170+ Functional Areas.*
