export interface ProxyRoute {
  prefix: string;
  target: string;
  pathRewrite?: Record<string, string>;
}

export const PROXY_ROUTES: ProxyRoute[] = [
  // Auth service
  { prefix: '/auth', target: process.env['AUTH_SERVICE_URL'] ?? 'http://auth-service:3001' },

  // User service
  { prefix: '/users', target: process.env['USER_SERVICE_URL'] ?? 'http://user-service:3002' },

  // Student service
  { prefix: '/students', target: process.env['STUDENT_SERVICE_URL'] ?? 'http://student-service:3003' },

  // Academic service (many prefixes)
  { prefix: '/academic', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/alerts', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/cafeteria', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/calendar', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/homework', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/ptm', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/staff-comms', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/surveys', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },
  { prefix: '/visitors', target: process.env['ACADEMIC_SERVICE_URL'] ?? 'http://academic-service:3004' },

  // Attendance service
  { prefix: '/attendance', target: process.env['ATTENDANCE_SERVICE_URL'] ?? 'http://attendance-service:3005' },

  // Fee service
  { prefix: '/fees', target: process.env['FEE_SERVICE_URL'] ?? 'http://fee-service:3006' },

  // Notification service
  { prefix: '/notifications', target: process.env['NOTIFICATION_SERVICE_URL'] ?? 'http://notification-service:3007' },

  // Exam service
  { prefix: '/exam', target: process.env['EXAM_SERVICE_URL'] ?? 'http://exam-service:3008' },
  { prefix: '/online-exam', target: process.env['EXAM_SERVICE_URL'] ?? 'http://exam-service:3008' },
  { prefix: '/plagiarism', target: process.env['EXAM_SERVICE_URL'] ?? 'http://exam-service:3008' },

  // LMS service
  { prefix: '/lms', target: process.env['LMS_SERVICE_URL'] ?? 'http://lms-service:3009' },

  // HR service
  { prefix: '/hr', target: process.env['HR_SERVICE_URL'] ?? 'http://hr-service:3010' },

  // Payroll service
  { prefix: '/payroll', target: process.env['PAYROLL_SERVICE_URL'] ?? 'http://payroll-service:3011' },

  // Certificate service
  { prefix: '/certificates', target: process.env['CERTIFICATE_SERVICE_URL'] ?? 'http://certificate-service:3012' },
  { prefix: '/verify', target: process.env['CERTIFICATE_SERVICE_URL'] ?? 'http://certificate-service:3012' },

  // Admission service (strip prefix for /admissions)
  {
    prefix: '/admissions',
    target: process.env['ADMISSION_SERVICE_URL'] ?? 'http://admission-service:3013',
    pathRewrite: { '^/admissions': '' },
  },
  { prefix: '/enquiries', target: process.env['ADMISSION_SERVICE_URL'] ?? 'http://admission-service:3013' },
  { prefix: '/applications', target: process.env['ADMISSION_SERVICE_URL'] ?? 'http://admission-service:3013' },

  // Transport service
  { prefix: '/transport', target: process.env['TRANSPORT_SERVICE_URL'] ?? 'http://transport-service:3014' },

  // Health service
  { prefix: '/medical-profiles', target: process.env['HEALTH_SERVICE_URL'] ?? 'http://health-service:3015' },
  { prefix: '/nurse-visits', target: process.env['HEALTH_SERVICE_URL'] ?? 'http://health-service:3015' },
  { prefix: '/medication-logs', target: process.env['HEALTH_SERVICE_URL'] ?? 'http://health-service:3015' },
  { prefix: '/incidents', target: process.env['HEALTH_SERVICE_URL'] ?? 'http://health-service:3015' },
  { prefix: '/vaccinations', target: process.env['HEALTH_SERVICE_URL'] ?? 'http://health-service:3015' },

  // Library service
  { prefix: '/library', target: process.env['LIBRARY_SERVICE_URL'] ?? 'http://library-service:3016' },

  // Event service
  { prefix: '/events', target: process.env['EVENT_SERVICE_URL'] ?? 'http://event-service:3017' },

  // Expense service
  { prefix: '/expense', target: process.env['EXPENSE_SERVICE_URL'] ?? 'http://expense-service:3018' },

  // Scholarship service
  { prefix: '/scholarships', target: process.env['SCHOLARSHIP_SERVICE_URL'] ?? 'http://scholarship-service:3019' },

  // Ops service
  { prefix: '/alumni', target: process.env['OPS_SERVICE_URL'] ?? 'http://ops-service:3020' },
  { prefix: '/assets', target: process.env['OPS_SERVICE_URL'] ?? 'http://ops-service:3020' },
  { prefix: '/community', target: process.env['OPS_SERVICE_URL'] ?? 'http://ops-service:3020' },
  { prefix: '/facility', target: process.env['OPS_SERVICE_URL'] ?? 'http://ops-service:3020' },

  // Report service (strip prefix)
  {
    prefix: '/reports',
    target: process.env['REPORT_SERVICE_URL'] ?? 'http://report-service:3021',
    pathRewrite: { '^/reports': '' },
  },

  // SaaS service
  { prefix: '/apikeys', target: process.env['SAAS_SERVICE_URL'] ?? 'http://saas-service:3022' },
  { prefix: '/audit', target: process.env['SAAS_SERVICE_URL'] ?? 'http://saas-service:3022' },
  { prefix: '/billing', target: process.env['SAAS_SERVICE_URL'] ?? 'http://saas-service:3022' },
  { prefix: '/onboarding', target: process.env['SAAS_SERVICE_URL'] ?? 'http://saas-service:3022' },

  // AI service (strip prefix)
  {
    prefix: '/ai',
    target: process.env['AI_SERVICE_URL'] ?? 'http://ai-service:8000',
    pathRewrite: { '^/ai': '' },
  },

  // Biometric bridge (strip prefix)
  {
    prefix: '/biometric',
    target: process.env['BIOMETRIC_SERVICE_URL'] ?? 'http://biometric-bridge:8080',
    pathRewrite: { '^/biometric': '' },
  },

  // Developer API (external partners — webhooks, sandbox, versioned v1 routes)
  { prefix: '/webhooks', target: process.env['DEVELOPER_API_SERVICE_URL'] ?? 'http://developer-api:3023' },
  { prefix: '/sandbox', target: process.env['DEVELOPER_API_SERVICE_URL'] ?? 'http://developer-api:3023' },
  { prefix: '/v1', target: process.env['DEVELOPER_API_SERVICE_URL'] ?? 'http://developer-api:3023' },
];
