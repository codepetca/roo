# Firebase Local Emulator Suite Setup

This guide covers how to use Firebase Local Emulator Suite for local development of the Roo auto-grading system.

## Prerequisites

- Node.js 16+ (for Firebase CLI)
- Java 11+ (for Firestore emulator)
- Firebase CLI installed globally: `npm install -g firebase-tools`

## Quick Start

1. **Start development environment with emulators:**
   ```bash
   npm run dev
   ```
   This starts both the frontend dev server and Firebase emulators.

2. **Access the services:**
   - Frontend: http://localhost:5173
   - Emulator UI: http://localhost:4000
   - Auth Emulator: http://localhost:9099
   - Firestore: http://localhost:8080
   - Functions: http://localhost:5001

## Configuration

### Backend (Functions)

The backend automatically detects the emulator environment via the `FUNCTIONS_EMULATOR` environment variable set by Firebase.

- Emulator detection: `functions/src/utils/emulator.ts`
- Firebase config: `functions/src/config/firebase.ts`
- Local env vars: Create `functions/.env.local` (gitignored)

### Frontend

The frontend uses environment variables to configure emulator connections:

```env
# frontend/.env.development
PUBLIC_USE_EMULATORS=true
PUBLIC_FUNCTIONS_EMULATOR_URL=http://localhost:5001
```

- Firebase config: `frontend/src/lib/firebase.ts`
- API client: `frontend/src/lib/api.ts`
- Emulator status component: `frontend/src/lib/components/EmulatorStatus.svelte`

## Data Persistence

Emulator data is automatically saved to `./emulator-data/` when you stop the emulators. This data persists between sessions.

### Managing Data

```bash
# Export current data manually
npm run emulators:export

# Start fresh (delete all data)
rm -rf emulator-data

# Run with specific data set
firebase emulators:start --import=./test-data
```

## Testing

### Running Tests with Emulators

```bash
# Run all tests against emulators
npm run emulators:exec -- npm test

# Run specific test file
npm run emulators:exec -- npm run test:backend
```

### Creating Test Data

1. Start emulators: `npm run emulators`
2. Use the Emulator UI to create test data
3. Export the data: `npm run emulators:export`
4. Commit test data separately if needed

## Debugging

### Common Issues

1. **Port conflicts:** If ports are in use, modify `firebase.json`:
   ```json
   "emulators": {
     "functions": { "port": 5002 },
     "firestore": { "port": 8081 }
   }
   ```

2. **Java not found:** Install Java 11+:
   ```bash
   # macOS
   brew install openjdk@11
   ```

3. **Emulator connection errors:** Check that:
   - Emulators are running (`npm run emulators`)
   - Frontend env vars are set correctly
   - No firewall blocking local ports

### Viewing Logs

- Functions logs: Emulator UI → Functions → Logs
- Firestore operations: Emulator UI → Firestore → Usage
- Network requests: Browser DevTools → Network tab

## Production vs Emulator Differences

| Feature | Emulator | Production |
|---------|----------|------------|
| Auth providers | Mock only | Real providers |
| Email/SMS | Printed to console | Actually sent |
| Security Rules | Enforced | Enforced |
| Rate limits | Not enforced | Enforced |
| Data persistence | Local file | Cloud database |
| Functions cold start | Instant | ~1-2s delay |

## Best Practices

1. **Always use emulators for development** - Never test against production
2. **Export important test data** - Save data sets for different test scenarios
3. **Test Security Rules** - Use Emulator UI's Rules Playground
4. **Monitor performance** - Emulators may be slower than production
5. **Clear data regularly** - Prevent test data accumulation

## Additional Resources

- [Firebase Emulator Suite Docs](https://firebase.google.com/docs/emulator-suite)
- [Connect your app to the Emulators](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)
- [Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)