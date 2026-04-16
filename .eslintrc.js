module.exports = {
  root: true,
  extends: ["@school-erp/eslint-config"],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    "@typescript-eslint/no-floating-promises": "off", // too noisy at root level
  },
};
