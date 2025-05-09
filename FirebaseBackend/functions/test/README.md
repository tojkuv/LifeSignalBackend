# LifeSignal Firebase Functions Tests

This directory contains test utilities and setup for the LifeSignal Firebase Cloud Functions.

## Test Structure

The tests are organized using a vertical slice architecture, with test files placed alongside the functions they test:

```
src/
├── functions/
│   ├── data_management/
│   │   ├── addContactRelation.ts
│   │   ├── addContactRelation.test.ts
│   │   ├── updateContactRoles.ts
│   │   ├── updateContactRoles.test.ts
│   │   ├── deleteContactRelation.ts
│   │   ├── deleteContactRelation.test.ts
│   │   ├── respondToPing.ts
│   │   ├── respondToPing.test.ts
│   │   ├── respondToAllPings.ts
│   │   ├── respondToAllPings.test.ts
│   │   ├── pingDependent.ts
│   │   ├── pingDependent.test.ts
│   │   ├── clearPing.ts
│   │   └── clearPing.test.ts
│   └── notifications/
│       ├── sendCheckInReminders.ts
│       └── sendCheckInReminders.test.ts
├── utils/
│   ├── handleNotifications.ts
│   └── handleNotifications.test.ts
└── index.ts

test/
├── utils/
│   ├── test-helpers.ts
│   └── mock-data.ts
├── setup.ts
└── README.md
```

Each function has its own test file that follows a consistent pattern:

1. Import the necessary dependencies and utilities
2. Set up test data and Firestore documents
3. Test the function with various inputs and scenarios
4. Clean up after tests

## Running Tests

To run the tests, use the following commands:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

You can also use the provided script to run tests with the Firebase emulators:

```bash
# From the FirebaseBackend directory
./scripts/run-tests.sh

# Run with coverage report
./scripts/run-tests.sh --coverage
```

## Test Utilities

The test utilities are located in the `utils` directory:

- `test-helpers.ts`: Contains helper functions for setting up tests, mocking authentication, and interacting with Firestore
- `mock-data.ts`: Contains functions for creating mock user profiles, contacts, and other test data

## Test Setup

The `setup.ts` file initializes the Firebase Functions Test SDK and provides utility functions for testing Firebase Cloud Functions.

## Coverage

The test coverage report is generated in the `coverage` directory when running tests with the `--coverage` flag.

## Adding New Tests

When adding a new function, create a corresponding test file in the appropriate directory. Follow the existing test patterns for consistency.

## Best Practices

1. Each test should be independent and not rely on the state from other tests
2. Clean up Firestore documents after each test
3. Test both success and error cases
4. Mock external dependencies when appropriate
5. Use descriptive test names that explain what is being tested
