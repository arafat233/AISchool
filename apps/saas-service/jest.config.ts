import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { diagnostics: false, tsconfig: { strict: false } }] },
  moduleNameMapper: {
    '^@school-erp/database$': '<rootDir>/__mocks__/@school-erp/database.ts',
    '^@school-erp/errors$': '<rootDir>/__mocks__/@school-erp/database.ts',
    '^@school-erp/logger$': '<rootDir>/__mocks__/@school-erp/database.ts',
    '^@school-erp/types$': '<rootDir>/__mocks__/@school-erp/database.ts',
    '^@school-erp/utils$': '<rootDir>/__mocks__/@school-erp/database.ts',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.dto.ts',
    '!**/index.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;
