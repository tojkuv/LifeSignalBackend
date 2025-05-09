/**
 * Jest configuration for Firebase Functions tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
    '!**/node_modules/**',
    '!**/lib/**'
  ],
  coverageDirectory: 'coverage',
  testTimeout: 10000, // 10 seconds
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};
