# Unit Test Checklist — AISchool ERP

> Track unit test coverage across all 25 microservices.
> Each test file uses Jest + `@nestjs/testing` with fully mocked Prisma and external deps.
> Update `[x]` when a spec file is written and passing.

---

## Progress Summary

| Group | Done | Total | % |
|---|---|---|---|
| Auth Service | 0 | 3 | 0% |
| User Service | 0 | 3 | 0% |
| Student Service | 0 | 4 | 0% |
| Academic Service | 0 | 8 | 0% |
| Attendance Service | 0 | 1 | 0% |
| Fee Service | 0 | 2 | 0% |
| Exam Service | 0 | 4 | 0% |
| LMS Service | 0 | 4 | 0% |
| HR Service | 0 | 7 | 0% |
| Payroll Service | 0 | 6 | 0% |
| Certificate Service | 0 | 2 | 0% |
| Admission Service | 0 | 1 | 0% |
| Transport Service | 0 | 1 | 0% |
| Health Service | 0 | 1 | 0% |
| Library Service | 0 | 1 | 0% |
| Event Service | 0 | 2 | 0% |
| Expense Service | 0 | 1 | 0% |
| Scholarship Service | 0 | 1 | 0% |
| Ops Service | 0 | 11 | 0% |
| Report Service | 0 | 1 | 0% |
| SaaS Service | 0 | 4 | 0% |
| Developer API | 0 | 1 | 0% |
| Notification Service | 0 | 1 | 0% |
| **TOTAL** | **0** | **70** | **0%** |

---

## 1. Auth Service (`apps/auth-service/src/auth/`)

- [ ] `auth.service.spec.ts` — login (valid, invalid password, disabled account, 2FA required, wrong TOTP), register (new user, duplicate email), forgotPassword, resetPassword (valid/expired token), setupTotp, verifyAndEnableTotp, handleOAuthLogin, refreshTokens, logout
- [ ] `token.service.spec.ts` — generateTokenPair (creates refresh token in DB), refreshAccessToken (valid, revoked, expired), revokeRefreshToken, revokeAllUserTokens, verifyAccessToken
- [ ] `totp.service.spec.ts` — generateSecret (returns base32 + otpauthUrl), verify (valid code, invalid code, window boundary), generateCurrentToken

## 2. User Service (`apps/user-service/src/`)

- [ ] `user/user.service.spec.ts` — createUser, getUserById (found, not found), updateUser, softDeleteUser, assignRole, changePassword, uploadPhoto, listUsers (pagination, role filter)
- [ ] `gdpr/gdpr.service.spec.ts` — requestErasure (schedules pseudonymisation), executeErasure (replaces PII fields, audit log), getErasureRequests
- [ ] `email-provisioning/email-provision.service.spec.ts` — provisionGoogleWorkspaceEmail, provisionMicrosoftEmail, deprovisionEmail, syncOrgUnit

## 3. Student Service (`apps/student-service/src/`)

- [ ] `student/student.service.spec.ts` — enrollStudent, getStudentById, updateProfile, withdrawStudent, bulkImportStudents, listStudents (section/class filter), getDigitalId
- [ ] `gamification/gamification.service.spec.ts` — awardPoints (first award, duplicate 24h window skipped), getTotalPoints, checkAndAwardBadges (rules evaluation), getBadges, updateStreak (increment, reset, milestone bonus), getClassLeaderboard (opt-out respected), getHouseLeaderboard, redeemReward (sufficient/insufficient points), addPortfolioItem, getPortfolio
- [ ] `special-education/iep.service.spec.ts` — setCwsnProfile, createIep, recordParentSignOff, conductTermReview, setExamAccommodations, getStudentExamAccommodations, logSession, getCwsnComplianceReport
- [ ] `mentoring/mentoring.service.spec.ts` — assignMentor (conflict if already assigned), logMeeting, getMentoringEffectivenessReport (exam delta calculation), recogniseMentor (awards points + portfolio)

## 4. Academic Service (`apps/academic-service/src/`)

- [ ] `academic/academic.service.spec.ts` — createClass, updateTimetableSlot (conflict detection), getClassTimetable, createSubject, mapLessonToOutcome, getCompetencyProgress
- [ ] `homework/homework.service.spec.ts` — createAssignment, submitAssignment (on-time, late), gradeSubmission, getPlagiarismReport, listSubmissions, getAssignmentsByClass
- [ ] `vocational/vocational.service.spec.ts` — createVocationalSubject, addIndustryPartner, assignOJT, recordOJTAttendance, recordCompetencyAssessment, checkNsqfCertificateEligibility, getHolisticProgressCard, updateFlnLevel, getFlnDashboard
- [ ] `pre-primary/pre-primary.service.spec.ts` — recordDailyActivity, getMilestones (age-in-months correct), updateMilestone, uploadPhoto (consent check), getPhotoGallery (parent-scoped), addAuthorisedPickup, verifyPickup, setAllergenProfile, checkMealCompatibility
- [ ] `survey/survey.service.spec.ts` — createSurvey, addQuestion, publishSurvey, submitResponse, getResults (aggregate)
- [ ] `ptm/ptm.service.spec.ts` — createPtmSession, bookSlot (double booking blocked), cancelSlot, getPtmReport
- [ ] `calendar/calendar.service.spec.ts` — createHoliday, createEvent, getCalendarForMonth, checkDateIsHoliday
- [ ] `alert/alert.service.spec.ts` — createAttendanceAlert, createFeeAlert, dismissAlert, getActiveAlerts

## 5. Attendance Service (`apps/attendance-service/src/attendance/`)

- [ ] `attendance.service.spec.ts` — bulkMarkAttendance (creates records, publishes Kafka event), getAttendanceByDate, getStudentMonthlyReport (present/absent/late counts), markStaffAttendance, processbiometricPunch (matched/unmatched device), getAbsenteesAlert (>3 consecutive), getAnalytics

## 6. Fee Service (`apps/fee-service/src/`)

- [ ] `fee/fee.service.spec.ts` — createFeeHead, createFeeStructure (upsert per grade), generateInvoicesForSection (skips existing), recordCashPayment (valid, overpayment blocked), initiateOnlinePayment, handleRazorpayWebhook, getDefaulters (overdue calculation), applyLateFee, applyDiscount, getFeeCollectionSummary
- [ ] `payment/razorpay.service.spec.ts` — createOrder (builds Razorpay payload), verifySignature (valid/tampered), refundPayment

## 7. Exam Service (`apps/exam-service/src/`)

- [ ] `exam/exam.service.spec.ts` — createExam, scheduleExam, bulkEnterMarks, publishResults (status transition), getExamById, listExams, deleteExam (only DRAFT)
- [ ] `exam/grading.service.spec.ts` — computeGrade (marks→grade mapping), computeRank (tie handling), computeClassAverage, computeSubjectPassRate
- [ ] `exam/report-card.service.spec.ts` — generateReportCard (PDF data assembly, rank included), getHallTicket (student data + exam schedule)
- [ ] `online-exam/question-bank.service.spec.ts` — addQuestion (MCQ/short/essay), getRandomQuestions (count, difficulty filter), bulkImport, archiveQuestion

## 8. LMS Service (`apps/lms-service/src/lms/`)

- [ ] `course.service.spec.ts` — createCourse, addLesson (order auto-increment), publishCourse (validates has lessons), enrolStudent, getEnrolledStudents, unenrolStudent
- [ ] `progress.service.spec.ts` — updateLessonProgress (percent, completion flag), getCourseProgress (aggregate across lessons), getCompletionCertificateEligibility (100% required)
- [ ] `syllabus.service.spec.ts` — createSyllabus, addTopic, markTopicCovered, getCompletionPercent, getSyllabusByClass
- [ ] `live-class.service.spec.ts` — createLiveClass (Daily.co room creation called), startClass, endClass (records duration), getRecordings, getLiveClassById

## 9. HR Service (`apps/hr-service/src/hr/`)

- [ ] `staff.service.spec.ts` — createStaff (generates employee code), updateStaff, getStaffById, getStaffBySchool, deactivateStaff, uploadDocument, getDocuments
- [ ] `leave.service.spec.ts` — applyLeave (balance check), approveLeave, rejectLeave (reason required), cancelLeave (only PENDING), getLeaveBalance, getLeaveCalendar, carryForwardBalance
- [ ] `appraisal.service.spec.ts` — createAppraisalCycle, submitSelfRating, submitManagerRating, finalise (status transition), getAppraisalByStaff, getAppraisalReport (averages)
- [ ] `recruitment.service.spec.ts` — postJobOpening, submitApplication, shortlistApplication, scheduleInterview, makeOffer, closeOpening
- [ ] `training.service.spec.ts` — createTrainingProgram, enrollStaff, markAttendance, completionCertificate, getTrainingReport
- [ ] `grievance.service.spec.ts` — raiseGrievance, assignGrievance, resolveGrievance (resolution text required), escalateGrievance, getGrievanceById
- [ ] `exit.service.spec.ts` — initiateResignation, approveResignation, conductExitInterview, releaseRelieving, getFNF (full and final calculation)

## 10. Payroll Service (`apps/payroll-service/src/payroll/`)

- [ ] `payroll.service.spec.ts` — createRun (conflict if exists), processRun (status DRAFT→PROCESSING→PROCESSED, payslips created per staff member), approveRun, lockRun, getPayslip, bulkGeneratePayslips
- [ ] `statutory.service.spec.ts` — computePF (basic ≤15k, above ceiling), computeESI (applicable, not applicable), computeProfessionalTax (MH, KA, WB, DEFAULT), computeLWF, computeAnnualTax (slab boundary cases), computeMonthlyTDS, computeLOPDeduction (zero lopDays, zero workingDays guard)
- [ ] `salary-structure.service.spec.ts` — createComponent (EARNING/DEDUCTION), computeSalary (formula evaluation, HRA = 40% basic), getSalaryStructure, assignStructureToDesignation
- [ ] `advance.service.spec.ts` — applyAdvance, approveAdvance (limit check), createEmiSchedule, deductEmi, getActiveAdvances, closeAdvance
- [ ] `export.service.spec.ts` — generateBankNeftFile (CSV format), generateEpfEcr (ECR 2.0 rows), generateEsiChallan, generatePayslipPdf (Puppeteer mock)
- [ ] `gratuity.service.spec.ts` — computeGratuity (formula: 15/26 × last basic × years; min 5 years), getGratuityEligibility, processGratuityPayout

## 11. Certificate Service (`apps/certificate-service/src/`)

- [ ] `certificate/certificate.service.spec.ts` — generateTC (student data assembled), generateBC, generateCC, generateMigration, getById, verifyCertificate (hash lookup)
- [ ] `blockchain/blockchain.service.spec.ts` — publishHash (ethers contract mock called), verifyHash (contract read returns true/false), getTransactionStatus

## 12. Admission Service (`apps/admission-service/src/admission/`)

- [ ] `admission.service.spec.ts` — submitApplication, uploadDocument, shortlistApplication, scheduleInterview, recordInterviewResult, generateOfferLetter, collectAdmissionFee, convertToStudent (creates student record), getAdmissionStats (funnel counts)

## 13. Transport Service (`apps/transport-service/src/transport/`)

- [ ] `transport.service.spec.ts` — createRoute, addStop, assignDriver, assignStudentToRoute, updateGpsLocation (MQTT publish mock), getActiveRoutes, getStudentsByRoute, recordTripCompletion, getMonthlyReport

## 14. Health Service (`apps/health-service/src/health/`)

- [ ] `health.service.spec.ts` — recordVisit, updateDiagnosis, referStudent, addVaccination, getVaccinationSchedule (upcoming alerts), recordBmi, getBmiTrend, getHealthReport, addAllergy, checkAllergyConflict (with cafeteria), logMedicineStock, dispenseMedicine (stock decrement)

## 15. Library Service (`apps/library-service/src/library/`)

- [ ] `library.service.spec.ts` — addBook, updateBook, searchBooks (title/author/isbn), issueBook (copy decrement, due date set), returnBook (copy increment, fine calc), payFine, getOverdueList, getMemberHistory, reserveBook, getReservationQueue

## 16. Event Service (`apps/event-service/src/`)

- [ ] `event/event.service.spec.ts` — createEvent, updateEvent, registerParticipant (max cap check), cancelRegistration, markEventAttendance, publishEvent, getEventById, getEventsForMonth, generateReport
- [ ] `magazine/magazine.service.spec.ts` — createMagazineIssue, submitArticle, reviewArticle (APPROVE/REJECT), publishMagazine, getMagazineArchive, createYearbook, submitYearbookPhoto, recordSuperlativeVote, getSuperlativeResults (RANK window), addPrintOrder

## 17. Expense Service (`apps/expense-service/src/expense/`)

- [ ] `expense.service.spec.ts` — createExpense (maps to budget head), submitForApproval, approveExpense, rejectExpense (reason required), uploadBill, getBudgetUtilisation (allocated vs spent), getExpensesByCategory, generatePL (P&L summary for period)

## 18. Scholarship Service (`apps/scholarship-service/src/scholarship/`)

- [ ] `scholarship.service.spec.ts` — createScheme, checkEligibility (income + marks criteria), applyForScholarship, approveApplication, disburseFunds (creates payment record), renewApplication, getSchemeReport (disbursement summary)

## 19. Ops Service (`apps/ops-service/src/`)

- [ ] `compliance/posh.service.spec.ts` — addIccMember, fileComplaint (anonymous flag, 90-day deadline set), updateComplaintStatus, generateAnnualReport, recordAcknowledgement, getPendingAcknowledgements, reportPocsOIncident (24h deadline), logFireDrill, getComplianceCalendar
- [ ] `compliance/labour-compliance.service.spec.ts` — getCalendar (overdue flags), generateEpfEcr (ECR 2.0 format), generateEsiChallan, checkMinimumWageCompliance (breach detection), registerRtiApplication (30-day deadline), getRtiRegister, generateUdiseData
- [ ] `compliance/rte.service.spec.ts` — submitApplication, conductLottery (seeded Fisher-Yates, deterministic output), generateReimbursementClaim, linkApaarId, getMonthlyComplianceReport
- [ ] `hostel/hostel.service.spec.ts` — getRooms (occupancy aggregation), allotBed (vacancy check, rejects if full), generateAllotmentLetter, recordNightRollCall, recordMessBill, applyLeave, approveLeave (dual-approval: warden + parent → gate pass), logHostelVisitor, logIncident
- [ ] `mdm/mdm.service.spec.ts` — registerDevice (Jamf/Intune branch), remoteLock (provider API called), remoteWipe (provider API called), updateAppPolicy, activateLessonMode (all enrolled devices restricted), trackLicense
- [ ] `feature-flags/feature-flags.service.spec.ts` — createFlag, getAllFlags, isEnabled (kill switch → override → beta → hash rollout → global), hashTenantToPercent (deterministic 1–100), setTenantOverride, enrollBetaTenant, toggleKillSwitch, handleErrorSpike (auto-rollback at >5%), getVariant (A/B)
- [ ] `international/international.service.spec.ts` — saveUoiPlan, recordLearnerProfileAssessment, trackPersonalProject, recordCasHours, getCasProgress (CREATIVITY/ACTIVITY/SERVICE), setPredictedGrades, setCambridgeDetails, setForeignStudentDetails, getExpiringDocuments (daysAhead filter), collectFeeInForeignCurrency (FX rate mock), createApostilleRequest
- [ ] `niche/niche-modules.service.spec.ts` — logDisciplineIncident (serial offender flag at ≥3), getDisciplineHistory, identifyRemedialStudents, createRemedialBatch, recordRemedialAssessment, getRemedialEffectivenessReport, recordAptitudeTest, trackCollegeApplication, setInsurancePolicy, fileInsuranceClaim, updateClaimStatus
- [ ] `magazine/magazine.service.spec.ts` — (see event-service; ops-service re-exports)
- [ ] `accreditation/accreditation.service.spec.ts` — setQualityFramework, compileSsrData (5 parallel queries), scheduleInspection, getReadinessChecklist, createImprovementAction, closeImprovementAction (requires resolution), getImprovementActionReport
- [ ] `iot/iot.service.spec.ts` — ingestReading (InfluxDB write mock), getLatestReadings, getBreaches (threshold comparison), acknowledgeAlert, updateThreshold, getMonthlyReport (aggregation per room)

## 20. Report Service (`apps/report-service/src/report/`)

- [ ] `report.service.spec.ts` — generateAttendanceReport (calls attendance-service), generateFeeReport, generateExamReport, generateHrReport, scheduleReport (cron expression valid), getReportById, exportToPdf (Puppeteer mock), exportToExcel

## 21. SaaS Service (`apps/saas-service/src/`)

- [ ] `tenant/tenant.service.spec.ts` — createTenant (provisions DB schema + default data), getTenantById, updateTenant, suspendTenant, unsuspendTenant, getUsageMetrics (student count, staff count, storage)
- [ ] `billing/billing.service.spec.ts` — createSubscription (Stripe mock), upgradeplan, cancelSubscription, handleStripeWebhook (invoice.paid, invoice.payment_failed), getBillingHistory
- [ ] `apikey/apikey.service.spec.ts` — issueApiKey (hashed stored), validateApiKey (valid/revoked/expired), revokeApiKey, listApiKeys (no secret exposed)
- [ ] `onboarding/onboarding.service.spec.ts` — startOnboarding, completeStep, getProgress (percent), generateWelcomeEmail, sendSetupGuide

## 22. Developer API (`apps/developer-api/src/webhooks/`)

- [ ] `webhook.service.spec.ts` — registerWebhook (URL validation), triggerWebhook (HTTP POST mock), retryFailedWebhook (exponential backoff), deactivateWebhook, getWebhookLogs, verifyWebhookSignature (HMAC)

## 23. Notification Service (`apps/notification-service/src/notification/`)

- [ ] `notification.service.spec.ts` — sendPush (FCM mock), sendSms (Twilio mock), sendEmail (SendGrid mock), sendWhatsApp (Meta API mock), sendBulk (batch processing), createTemplate, renderTemplate (variable substitution), getDeliveryStatus, markAsRead

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

*Last updated: 2026-04-20 — 0/70 complete*
