import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // CSS / image stubs
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|svg|webp)$": "<rootDir>/__mocks__/fileMock.ts",
  },
  testMatch: ["**/__tests__/**/*.{ts,tsx}", "**/*.{spec,test}.{ts,tsx}"],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  moduleDirectories: ["node_modules", "<rootDir>/src"],
};

export default config;
