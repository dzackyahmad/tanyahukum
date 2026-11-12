const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    // Ensure packages with conditional exports (e.g. jose) resolve to Node builds.
    customExportConditions: ['node', 'node-addons'],
  },
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.(js|jsx|ts|tsx)',
    '<rootDir>/tests/integration/**/*.test.(js|jsx|ts|tsx)',
    '<rootDir>/tests/error-handling/**/*.test.(js|jsx|ts|tsx)',
    '<rootDir>/tests/security/**/*.test.(js|jsx|ts|tsx)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    '/node_modules/(?!(jose)/)',
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/reports',
        outputName: 'jest-junit.xml',
      },
    ],
  ],
};

// next/jest hanya mengizinkan *menambah* transformIgnorePatterns, sehingga polanya sendiri
// (abaikan semua node_modules) tetap mengabaikan jose. jose versi 6 berformat ESM murni dan
// harus ditranspilasi agar bisa di-require Jest; tanpa ini test hanya lulus bila cache Jest
// kebetulan masih menyimpan hasil transform lama.
module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  config.transformIgnorePatterns = config.transformIgnorePatterns.map((pattern) =>
    pattern.replace('(?!(', '(?!(jose|'),
  );
  return config;
};

