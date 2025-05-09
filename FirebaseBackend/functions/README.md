# LifeSignal Firebase Functions

This directory contains the Firebase Cloud Functions for the LifeSignal application.

## Project Structure

The project follows a vertical slice architecture, with test files placed alongside the functions they test:

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
├── models/
│   └── interfaces.ts
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

## Functions

The LifeSignal Firebase Functions are organized into the following categories:

### Data Management

- **addContactRelation**: Creates a bidirectional contact relationship between two users using a QR code
- **updateContactRoles**: Updates the roles of an existing contact relationship
- **deleteContactRelation**: Removes a bidirectional contact relationship between two users
- **respondToPing**: Responds to a ping from a contact
- **respondToAllPings**: Responds to all pending pings from contacts
- **pingDependent**: Sends a ping to a dependent contact
- **clearPing**: Clears a ping sent to a dependent contact

### Notifications

- **sendCheckInReminders**: Scheduled function that runs every 15 minutes to send check-in reminders and notifications to users and their responders

## Development

### Prerequisites

- Node.js 22 or later
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with Firestore enabled

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the functions:
   ```bash
   npm run build
   ```

3. Serve the functions locally:
   ```bash
   npm run serve
   ```

### Testing

The project uses Jest for testing. Tests are placed alongside the functions they test, following the vertical slice architecture.

To run the tests:

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

### Deployment

To deploy the functions to Firebase:

```bash
# Deploy all functions
npm run deploy

# Deploy a specific function
firebase deploy --only functions:functionName
```

You can also use the provided scripts in the `scripts` directory to deploy specific functions or all functions at once.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
