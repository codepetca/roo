# Complete User Data Flow Integration Test

## Overview

The `complete-user-data-flow.test.ts` is the **definitive integration test** that validates the entire Roo system end-to-end. This test answers the critical question:

> **"After a complete reset and data import, can all users (teachers and students) see their correct data in their dashboards?"**

## What This Test Does

This test performs the exact workflow you described:

1. **🗑️ Reset emulator data** - Complete clean slate (users + Firestore data)
2. **👥 Create all test users** - 3 teachers + 8 students with proper Firebase Auth accounts
3. **📚 Import classroom snapshots** - teacher1-snapshot.json, teacher2-snapshot.json, teacher3-snapshot.json
4. **👩‍🏫 Verify teacher dashboards** - Each teacher sees only their isolated data
5. **🎓 Verify student dashboards** - Students see correct cross-enrolled courses from multiple teachers

## Running the Test

### Prerequisites
```bash
# Start Firebase emulators first
npm run emulators:start

# In separate terminal, run the test
npm run test:complete-flow        # With browser UI (for debugging)
npm run test:complete-flow:ci     # Headless (for CI/CD)
```

### Alternative Direct Commands
```bash
cd frontend
npx playwright test complete-user-data-flow.test.ts --headed    # Debug mode
npx playwright test complete-user-data-flow.test.ts             # CI mode
```

## Test Structure

### Main Integration Test
**Duration**: ~5 minutes (complete workflow)

The primary test performs the full cycle:
- Resets all emulator data using Firebase REST APIs
- Creates 11 test users (3 teachers + 8 students) 
- Imports classroom data for all teachers sequentially
- Validates all teacher dashboards show correct isolated data
- Validates representative student dashboards show correct cross-enrolled data
- Performs cross-validation checks (API health, concurrent access)

### Individual Verification Tests

**Teacher Dashboard Test**: Tests each teacher individually
- teacher1@test.com → CS 101 + CS 102 (4 students, 5 assignments)
- teacher2@test.com → CS 201 + CS 202 (4 students, 5 assignments)  
- teacher3@test.com → CS 301 (3 students, 4 assignments)

**Student Dashboard Test**: Tests representative students
- student1 → Cross-teacher (CS 101 + CS 201)
- student2 → Same teacher multiple classes (CS 101 + CS 102)
- student3 → Intro + Advanced (CS 101 + CS 301)
- student5 → Web dev + Advanced (CS 201 + CS 301)
- student6 → Single enrollment (CS 202 only)

**Data Isolation Test**: Concurrent multi-user access verification

## Key Validation Points

### ✅ Teacher Isolation
- Each teacher sees only their classrooms
- Student counts match expected enrollments  
- Assignment counts match imported data
- No cross-contamination between teachers

### ✅ Student Cross-Enrollment
- Students see all enrolled courses across teachers
- Course counts match enrollment matrix
- No access to non-enrolled courses
- Proper cross-teacher data visibility

### ✅ Data Integrity
- Clean slate reset works properly
- User creation is consistent
- Snapshot imports are successful
- API endpoints remain healthy

## Test Data Configuration

The test uses the comprehensive test user configuration from `frontend/e2e/scripts/test-users-config.ts`:

**Teachers**: 
- teacher1@test.com (Alice Anderson) → CS 101, CS 102
- teacher2@test.com (Bob Brown) → CS 201, CS 202
- teacher3@test.com (Carol Chen) → CS 301

**Students** with cross-enrollment patterns:
- student1 → teacher1:CS 101 + teacher2:CS 201
- student2 → teacher1:CS 101 + teacher1:CS 102  
- student3 → teacher1:CS 101 + teacher3:CS 301
- ... (8 students total with various enrollment patterns)

## Expected Results

### ✅ Success Indicators
```
🎉 COMPLETE USER DATA FLOW TEST PASSED
   ✓ Emulator data reset successful
   ✓ All users created successfully  
   ✓ All classroom data imported successfully
   ✓ All teacher dashboards show correct isolated data
   ✓ All student dashboards show correct cross-enrolled data
   ✓ Cross-validation tests passed
```

### ❌ Failure Scenarios
- **Emulator Connection**: Firebase emulators not running
- **Data Reset Issues**: Unable to clear existing data
- **User Creation Failures**: Firebase Auth or Firestore issues
- **Import Failures**: Snapshot files missing or malformed
- **Dashboard Validation**: Data not appearing correctly
- **Isolation Violations**: Teachers seeing other teachers' data

## Debugging

### Screenshots on Failure
Test automatically captures screenshots in `test-results/complete-flow-failure-{timestamp}.png`

### Verbose Output
The test provides detailed console logging for each phase:
```bash
📦 Phase 1: Reset and Seed Complete Environment
👩‍🏫 Phase 2: Verify All Teacher Dashboards  
🎓 Phase 3: Verify All Student Dashboards
🔄 Phase 4: Cross-Validation Tests
```

### Manual Verification
After test completion, you can manually verify:
- Emulator UI: http://localhost:4000
- Frontend: http://localhost:5173
- Login with any test account (password: `test123` or passcode: `12345`)

## Integration with Development Workflow

### Pre-Deployment Validation
```bash
# Complete integration validation before deploy
npm run test:complete-flow:ci
npm run quality:check
npm run deploy:staging
```

### CI/CD Pipeline
Add to your CI configuration:
```yaml
- name: Run Complete User Data Flow Test
  run: |
    npm run emulators:start &
    npm run test:complete-flow:ci
```

## Architecture Insights

This test validates the entire **"API-Only Frontend + Schema-Driven Backend"** architecture:

- **Frontend**: Direct API consumption with Svelte 5 stores
- **Backend**: Core entity system with Firebase repository layer
- **Authentication**: Dual flows (teacher email/password + student passcode)
- **Data Import**: Google Classroom snapshot → Core entities transformation
- **Multi-tenancy**: Teacher isolation + student cross-enrollment

**Success of this test = Confidence in the entire system architecture.**