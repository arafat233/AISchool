# Unit Test Checklist — AISchool ERP

> Track unit test coverage across all 25 microservices.
> Each test file uses Jest + `@nestjs/testing` with fully mocked Prisma and external deps.
> Update `[x]` when a spec file is written and passing.

---

## Progress Summary

| Group | Done | Total | % |
|---|---|---|---|
| Auth Service | 3 | 3 | 100% |
| User Service | 3 | 3 | 100% |
| Student Service | 4 | 4 | 100% |
| Academic Service | 8 | 8 | 100% |
| Attendance Service | 1 | 1 | 100% |
| Fee Service | 2 | 2 | 100% |
| Exam Service | 4 | 4 | 100% |
| LMS Service | 4 | 4 | 100% |
| HR Service | 7 | 7 | 100% |
| Payroll Service | 6 | 6 | 100% |
| Certificate Service | 2 | 2 | 100% |
| Admission Service | 1 | 1 | 100% |
| Transport Service | 1 | 1 | 100% |
| Health Service | 1 | 1 | 100% |
| Library Service | 1 | 1 | 100% |
| Event Service | 2 | 2 | 100% |
| Expense Service | 1 | 1 | 100% |
| Scholarship Service | 1 | 1 | 100% |
| Ops Service | 11 | 11 | 100% |
| Report Service | 1 | 1 | 100% |
| SaaS Service | 4 | 4 | 100% |
| Developer API | 1 | 1 | 100% |
| Notification Service | 1 | 1 | 100% |
| **TOTAL** | **70** | **70** | **100%** |

---

## 1. Auth Service (`apps/auth-service/src/auth/`)

- [x] `auth.service.spec.ts` — login (valid, invalid password, disabled account, 2FA required, wrong TOTP), register (new user, duplicate email), forgotPassword, resetPassword (valid/expired token), setupTotp, verifyAndEnableTotp, handleOAuthLogin, refreshTokens, logout
- [x] `token.service.spec.ts` — generateTokenPair (creates refresh token in DB), refreshAccessToken (valid, revoked, expired), revokeRefreshToken, revokeAllUserTokens, verifyAccessToken
- [x] `totp.service.spec.ts` — generateSecret (returns base32 + otpauthUrl), verify (valid code, invalid code, window boundary), generateCurrentToken

## 2. User Service (`apps/user-service/src/`)

- [x] `user/user.service.spec.ts` — createUser, getUserById (found, not found), updateUser, softDeleteUser, assignRole, changePassword, uploadPhoto, listUsers (pagination, role filter)
- [x] `gdpr/gdpr.service.spec.ts` — requestErasure (schedules pseudonymisation), executeErasure (replaces PII fields, audit log), getErasureRequests
- [x] `email-provisioning/email-provision.service.spec.ts` — provisionGoogleWorkspaceEmail, provisionMicrosoftEmail, deprovisionEmail, syncOrgUnit

## 3. Student Service (`apps/student-service/src/`)

- [x] `student/student.service.spec.ts` — enrollStudent, getStudentById, updateProfile, withdrawStudent, bulkImportStudents, listStudents (section/class filter), getDigitalId
- [x] `gamification/gamification.service.spec.ts` — awardPoints (first award, duplicate 24h window skipped), getTotalPoints, checkAndAwardBadges (rules evaluation), getBadges, updateStreak (increment, reset, milestone bonus), getClassLeaderboard (opt-out respected), getHouseLeaderboard, redeemReward (sufficient/insufficient points), addPortfolioItem, getPortfolio
- [x] `special-education/iep.service.spec.ts` — setCwsnProfile, createIep, recordParentSignOff, conductTermReview, setExamAccommodations, getStudentExamAccommodations, logSession, getCwsnComplianceReport
- [x] `mentoring/mentoring.service.spec.ts` — assignMentor (conflict if already assigned), logMeeting, getMentoringEffectivenessReport (exam delta calculation), recogniseMentor (awards points + portfolio)

## 4. Academic Service (`apps/academic-service/src/`)

- [x] `academic/academic.service.spec.ts` — createClass, updateTimetableSlot (conflict detection), getClassTimetable, createSubject, mapLessonToOutcome, getCompetencyProgress
- [x] `homework/homework.service.spec.ts` — createAssignment, submitAssignment (on-time, late), gradeSubmission, getPlagiarismReport, listSubmissions, getAssignmentsByClass
- [x] `vocational/vocational.service.spec.ts` — createVocationalSubject, addIndustryPartner, assignOJT, recordOJTAttendance, recordCompetencyAssessment, checkNsqfCertificateEligibility, getHolisticProgressCard, updateFlnLevel, getFlnDashboard
- [x] `pre-primary/pre-primary.service.spec.ts` — recordDailyActivity, getMilestones (age-in-months correct), updateMilestone, uploadPhoto (consent check), getPhotoGallery (parent-scoped), addAuthorisedPickup, verifyPickup, setAllergenProfile, checkMealCompatibility
- [x] `survey/survey.service.spec.ts` — createSurvey, addQuestion, publishSurvey, submitResponse, getResults (aggregate)
- [x] `ptm/ptm.service.spec.ts` — createPtmSession, bookSlot (double booking blocked), cancelSlot, getPtmReport
- [x] `calendar/calendar.service.spec.ts` — createHoliday, createEvent, getCalendarForMonth, checkDateIsHoliday
- [x] `alert/alert.service.spec.ts` — createAttendanceAlert, createFeeAlert, dismissAlert, getActiveAlerts

## 5. Attendance Service (`apps/attendance-service/src/attendance/`)

- [x] `attendance.service.spec.ts` — bulkMarkAttendance (creates records, publishes Kafka event), getAttendanceByDate, getStudentMonthlyReport (present/absent/late counts), markStaffAttendance, processbiometricPunch (matched/unmatched device), getAbsenteesAlert (>3 consecutive), getAnalytics

## 6. Fee Service (`apps/fee-service/src/`)

- [x] `fee/fee.service.spec.ts` — createFeeHead, createFeeStructure (upsert per grade), generateInvoicesForSection (skips existing), recordCashPayment (valid, overpayment blocked), initiateOnlinePayment, handleRazorpayWebhook, getDefaulters (overdue calculation), applyLateFee, applyDiscount, getFeeCollectionSummary
- [x] `payment/razorpay.service.spec.ts` — createOrder (builds Razorpay payload), verifySignature (valid/tampered), refundPayment

## 7. Exam Service (`apps/exam-service/src/`)

- [x] `exam/exam.service.spec.ts` — createExam, scheduleExam, bulkEnterMarks, publishResults (status transition), getExamById, listExams, deleteExam (only DRAFT)
- [x] `exam/grading.service.spec.ts` — computeGrade (marks→grade mapping), computeRank (tie handling), computeClassAverage, computeSubjectPassRate
- [x] `exam/report-card.service.spec.ts` — generateReportCard (PDF data assembly, rank included), getHallTicket (student data + exam schedule)
- [x] `online-exam/question-bank.service.spec.ts` — addQuestion (MCQ/short/essay), getRandomQuestions (count, difficulty filter), bulkImport, archiveQuestion

## 8. LMS Service (`apps/lms-service/src/lms/`)

- [x] `course.service.spec.ts` — createCourse, addLesson (order auto-increment), publishCourse (validates has lessons), enrolStudent, getEnrolledStudents, unenrolStudent
- [x] `progress.service.spec.ts` — updateLessonProgress (percent, completion flag), getCourseProgress (aggregate across lessons), getCompletionCertificateEligibility (100% required)
- [x] `syllabus.service.spec.ts` — createSyllabus, addTopic, markTopicCovered, getCompletionPercent, getSyllabusByClass
- [x] `live-class.service.spec.ts` — createLiveClass (Daily.co room creation called), startClass, endClass (records duration), getRecordings, getLiveClassById

## 9. HR Service (`apps/hr-service/src/hr/`)

- [x] `staff.service.spec.ts` — createStaff (generates employee code), updateStaff, getStaffById, getStaffBySchool, deactivateStaff, uploadDocument, getDocuments
- [x] `leave.service.spec.ts` — applyLeave (balance check), approveLeave, rejectLeave (reason required), cancelLeave (only PENDING), getLeaveBalance, getLeaveCalendar, carryForwardBalance
- [x] `appraisal.service.spec.ts` — createAppraisalCycle, submitSelfRating, submitManagerRating, finalise (status transition), getAppraisalByStaff, getAppraisalReport (averages)
- [x] `recruitment.service.spec.ts` — postJobOpening, submitApplication, shortlistApplication, scheduleInterview, makeOffer, closeOpening
- [x] `training.service.spec.ts` — createTrainingProgram, enrollStaff, markAttendance, completionCertificate, getTrainingReport
- [x] `grievance.service.spec.ts` — raiseGrievance, assignGrievance, resolveGrievance (resolution text required), escalateGrievance, getGrievanceById
- [x] `exit.service.spec.ts` — initiateResignation, approveResignation, conductExitInterview, releaseRelieving, getFNF (full and final calculation)

## 10. Payroll Service (`apps/payroll-service/src/payroll/`)

- [x] `payroll.service.spec.ts` — createRun (conflict if exists), processRun (status DRAFT→PROCESSING→PROCESSED, payslips created per staff member), approveRun, lockRun, getPayslip, bulkGeneratePayslips
- [x] `statutory.service.spec.ts` — computePF (basic ≤15k, above ceiling), computeESI (applicable, not applicable), computeProfessionalTax (MH, KA, WB, DEFAULT), computeLWF, computeAnnualTax (slab boundary cases), computeMonthlyTDS, computeLOPDeduction (zero lopDays, zero workingDays guard)
- [x] `salary-structure.service.spec.ts` — createComponent (EARNING/DEDUCTION), computeSalary (formula evaluation, HRA = 40% basic), getSalaryStructure, assignStructureToDesignation
- [x] `advance.service.spec.ts` — applyAdvance, approveAdvance (limit check), createEmiSchedule, deductEmi, getActiveAdvances, closeAdvance
- [x] `export.service.spec.ts` — generateBankNeftFile (CSV format), generateEpfEcr (ECR 2.0 rows), generateEsiChallan, generatePayslipPdf (Puppeteer mock)
- [x] `gratuity.service.spec.ts` — computeGratuity (formula: 15/26 × last basic × years; min 5 years), getGratuityEligibility, processGratuityPayout

## 11. Certificate Service (`apps/certificate-service/src/`)

- [x] `certificate/certificate.service.spec.ts` — generateTC (student data assembled), generateBC, generateCC, generateMigration, getById, verifyCertificate (hash lookup)
- [x] `blockchain/blockchain.service.spec.ts` — publishHash (ethers contract mock called), verifyHash (contract read returns true/false), getTransactionStatus

## 12. Admission Service (`apps/admission-service/src/admission/`)

- [x] `admission.service.spec.ts` — submitApplication, uploadDocument, shortlistApplication, scheduleInterview, recordInterviewResult, generateOfferLetter, collectAdmissionFee, convertToStudent (creates student record), getAdmissionStats (funnel counts)

## 13. Transport Service (`apps/transport-service/src/transport/`)

- [x] `transport.service.spec.ts` — createRoute, addStop, assignDriver, assignStudentToRoute, updateGpsLocation (MQTT publish mock), getActiveRoutes, getStudentsByRoute, recordTripCompletion, getMonthlyReport

## 14. Health Service (`apps/health-service/src/health/`)

- [x] `health.service.spec.ts` — recordVisit, updateDiagnosis, referStudent, addVaccination, getVaccinationSchedule (upcoming alerts), recordBmi, getBmiTrend, getHealthReport, addAllergy, checkAllergyConflict (with cafeteria), logMedicineStock, dispenseMedicine (stock decrement)

## 15. Library Service (`apps/library-service/src/library/`)

- [x] `library.service.spec.ts` — addBook, updateBook, searchBooks (title/author/isbn), issueBook (copy decrement, due date set), returnBook (copy increment, fine calc), payFine, getOverdueList, getMemberHistory, reserveBook, getReservationQueue

## 16. Event Service (`apps/event-service/src/`)

- [x] `event/event.service.spec.ts` — createEvent, updateEvent, registerParticipant (consent required for field trips), checkInParticipant, applyForClub, nominate (NOMINATION status gate), getHouseLeaderboard (sorted by total points), assignStudentToHouse
- [x] `ops-service/magazine/magazine.service.spec.ts` — createMagazineIssue (structured ID), submitArticle, reviewArticle (APPROVE/REJECT)

## 17. Expense Service (`apps/expense-service/src/expense/`)

- [x] `expense.service.spec.ts` — createBudget (version increment, starts at 1), addBudgetLineItem (recalculates total, ConflictError when non-DRAFT, NotFoundError), submitBudgetForApproval (PENDING_APPROVAL)

## 18. Scholarship Service (`apps/scholarship-service/src/scholarship/`)

- [x] `scholarship.service.spec.ts` — createScheme (PERCENTAGE default, empty feeHeadIds), applyForScholarship (NotFoundError, inactive scheme, seats full, eligible → PENDING), finalApprove (APPROVED/NotFoundError), getApplications (status filter), submitReview (totalScore aggregation)

## 19. Ops Service (`apps/ops-service/src/`)

- [x] `compliance/posh.service.spec.ts` — fileComplaint (complaintNo prefix, 90-day deadline), reportPocsOIncident (24h deadline), generateAnnualReport, getComplaints
- [x] `compliance/labour-compliance.service.spec.ts` — getCalendar (year default), markCompleted
- [x] `compliance/rte.service.spec.ts` — allocateRteSeats (25% calculation, default strength), submitApplication (RTE- prefix)
- [x] `hostel/hostel.service.spec.ts` — allotBed (occupied → throws, vacant → inserts), applyLeave (leaveId prefix), approveLeave (dual approval → gate pass), recordNightRollCall (one $executeRaw per student), allotStaffQuarters (occupied/vacant)
- [x] `mdm/mdm.service.spec.ts` — registerDevice (maps to Device interface), assignDevice, remoteLock (NONE provider skips, no settings skips), getAppPolicy (null/configured)
- [x] `feature-flags/feature-flags.service.spec.ts` — isEnabled (cached, disabled, kill switch, 100% rollout), handleErrorSpike (>5% activates kill switch, ≤5% skips), isBetaSchool
- [x] `international/international.service.spec.ts` — saveUoiPlan, recordLearnerProfileAssessment, recordAtlSkillsAssessment (one call per skill)
- [x] `niche/niche-modules.service.spec.ts` — checkFacilityConflict (true/false), recordMdmCount (one call per class), getShifts
- [x] `magazine/magazine.service.spec.ts` — createMagazineIssue (structured ID, DRAFT status), submitArticle, reviewArticle
- [x] `accreditation/accreditation.service.spec.ts` — setQualityFramework, compileSsrData (6 parallel queries), scheduleInspection, createImprovementAction, getImprovementActionReport
- [x] `iot/iot.service.spec.ts` — ingestReading (InfluxDB write, CO2 alert on breach, no BMS for non-occupancy), getMonthlyReport

## 20. Report Service (`apps/report-service/src/report/`)

- [x] `report.service.spec.ts` — getAttendanceSummary (JSON aggregation: present/absent/pct, pdf Buffer, excel Buffer)

## 21. SaaS Service (`apps/saas-service/src/`)

- [x] `tenant/tenant.service.spec.ts` — createTenant (TRIAL status, 30-day trial, BASIC features), getTenant (found/NotFoundException), changePlan (featureFlags updated), listTenants (status filter)
- [x] `billing/billing.service.spec.ts` — generateMonthlyInvoice (tiered BASIC 200 students = Rs 11000, NotFoundException, multi-school aggregate), recordPayment (PAID + tenant ACTIVE, NotFoundException), listInvoices (filter)
- [x] `apikey/apikey.service.spec.ts` — issueKey (sk_live_ prefix, rate limit per plan, NotFoundException), revokeKey (isActive=false, ForbiddenException, NotFoundException), recordUsage (increment counter)
- [x] `onboarding/onboarding.service.spec.ts` — getChecklist (create when missing, 25% for 2/8, null nextStep when complete), completeStep (NotFoundException, advances currentStep)

## 22. Developer API (`apps/developer-api/src/webhooks/`)

- [x] `webhook.service.spec.ts` — registerEndpoint (secret hashed), listEndpoints, deactivateEndpoint, dispatch (queries active endpoints, fires deliverWithRetry)

## 23. Notification Service (`apps/notification-service/src/notification/`)

- [x] `notification.service.spec.ts` — sendEmail (enqueues email job), sendSms (enqueues SMS job), sendPush (enqueues push job with data), createTemplate, markRead (isRead=true)

---

## Running Tests

```bash
# Single service
pnpm --filter auth-service test

# All services
pnpm test

# With coverage
pnpm --filter auth-service test:cov

# Watch mode (during development)
pnpm --filter auth-service test:watch
```

---

*Last updated: 2026-04-20 — 70/70 complete ✅*
