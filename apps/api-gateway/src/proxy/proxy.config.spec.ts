// Clear all service URL env vars before each test so we test fallback defaults
const SERVICE_ENV_VARS = [
  'AUTH_SERVICE_URL',
  'USER_SERVICE_URL',
  'STUDENT_SERVICE_URL',
  'ACADEMIC_SERVICE_URL',
  'ATTENDANCE_SERVICE_URL',
  'FEE_SERVICE_URL',
  'NOTIFICATION_SERVICE_URL',
  'EXAM_SERVICE_URL',
  'LMS_SERVICE_URL',
  'HR_SERVICE_URL',
  'PAYROLL_SERVICE_URL',
  'CERTIFICATE_SERVICE_URL',
  'ADMISSION_SERVICE_URL',
  'TRANSPORT_SERVICE_URL',
  'HEALTH_SERVICE_URL',
  'LIBRARY_SERVICE_URL',
  'EVENT_SERVICE_URL',
  'EXPENSE_SERVICE_URL',
  'SCHOLARSHIP_SERVICE_URL',
  'OPS_SERVICE_URL',
  'REPORT_SERVICE_URL',
  'SAAS_SERVICE_URL',
  'AI_SERVICE_URL',
  'BIOMETRIC_SERVICE_URL',
  'DEVELOPER_API_SERVICE_URL',
];

// We need to reload the module with env vars cleared to get fallback values
let PROXY_ROUTES: import('./proxy.config').ProxyRoute[];

beforeAll(() => {
  // Save existing values
  const saved: Record<string, string | undefined> = {};
  for (const key of SERVICE_ENV_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }

  // Reload the module fresh (Jest caches modules, so clear cache first)
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  PROXY_ROUTES = require('./proxy.config').PROXY_ROUTES;

  // Restore
  for (const key of SERVICE_ENV_VARS) {
    if (saved[key] !== undefined) {
      process.env[key] = saved[key];
    }
  }
});

describe('PROXY_ROUTES structure', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(PROXY_ROUTES)).toBe(true);
    expect(PROXY_ROUTES.length).toBeGreaterThan(0);
  });

  it('has 25 or more routes', () => {
    expect(PROXY_ROUTES.length).toBeGreaterThanOrEqual(25);
  });

  it('every route has a prefix string', () => {
    for (const route of PROXY_ROUTES) {
      expect(typeof route.prefix).toBe('string');
      expect(route.prefix.length).toBeGreaterThan(0);
    }
  });

  it('every route prefix starts with /', () => {
    for (const route of PROXY_ROUTES) {
      expect(route.prefix.startsWith('/')).toBe(true);
    }
  });

  it('every route has a target string', () => {
    for (const route of PROXY_ROUTES) {
      expect(typeof route.target).toBe('string');
      expect(route.target.length).toBeGreaterThan(0);
    }
  });

  it('route prefixes are unique (no duplicates)', () => {
    const prefixes = PROXY_ROUTES.map((r) => r.prefix);
    const unique = new Set(prefixes);
    expect(unique.size).toBe(prefixes.length);
  });

  it('pathRewrite, when present, is a record of string to string', () => {
    const routesWithRewrite = PROXY_ROUTES.filter((r) => r.pathRewrite);
    for (const route of routesWithRewrite) {
      expect(typeof route.pathRewrite).toBe('object');
      for (const [key, value] of Object.entries(route.pathRewrite!)) {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
      }
    }
  });
});

describe('key routes exist', () => {
  it('has /auth route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/auth');
    expect(route).toBeDefined();
  });

  it('has /students route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/students');
    expect(route).toBeDefined();
  });

  it('has /fees route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/fees');
    expect(route).toBeDefined();
  });

  it('has /attendance route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/attendance');
    expect(route).toBeDefined();
  });

  it('has /webhooks route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/webhooks');
    expect(route).toBeDefined();
  });

  it('has /sandbox route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/sandbox');
    expect(route).toBeDefined();
  });

  it('has /v1 route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/v1');
    expect(route).toBeDefined();
  });

  it('has /ai route', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/ai');
    expect(route).toBeDefined();
  });
});

describe('routes with pathRewrite', () => {
  it('/admissions has pathRewrite stripping the prefix', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/admissions');
    expect(route).toBeDefined();
    expect(route!.pathRewrite).toEqual({ '^/admissions': '' });
  });

  it('/reports has pathRewrite stripping the prefix', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/reports');
    expect(route).toBeDefined();
    expect(route!.pathRewrite).toEqual({ '^/reports': '' });
  });

  it('/ai has pathRewrite stripping the prefix', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/ai');
    expect(route).toBeDefined();
    expect(route!.pathRewrite).toEqual({ '^/ai': '' });
  });

  it('/biometric has pathRewrite stripping the prefix', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/biometric');
    expect(route).toBeDefined();
    expect(route!.pathRewrite).toEqual({ '^/biometric': '' });
  });
});

describe('fallback targets (no env vars set)', () => {
  it('/auth falls back to http://auth-service:3001', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/auth');
    expect(route!.target).toBe('http://auth-service:3001');
  });

  it('/students falls back to http://student-service:3003', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/students');
    expect(route!.target).toBe('http://student-service:3003');
  });

  it('/fees falls back to http://fee-service:3006', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/fees');
    expect(route!.target).toBe('http://fee-service:3006');
  });

  it('/attendance falls back to http://attendance-service:3005', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/attendance');
    expect(route!.target).toBe('http://attendance-service:3005');
  });

  it('/ai falls back to http://ai-service:8000', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/ai');
    expect(route!.target).toBe('http://ai-service:8000');
  });

  it('/biometric falls back to http://biometric-bridge:8080', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/biometric');
    expect(route!.target).toBe('http://biometric-bridge:8080');
  });

  it('/webhooks falls back to http://developer-api:3023', () => {
    const route = PROXY_ROUTES.find((r) => r.prefix === '/webhooks');
    expect(route!.target).toBe('http://developer-api:3023');
  });
});
