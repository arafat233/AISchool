// Stub required env vars so config.ts doesn't call process.exit(1) during test import
process.env.SCHOOL_ID = 'test-school';
process.env.DEVICES = 'TestGate:192.168.1.201:4370';
