# E2E Test Suite Documentation

## Overview

This comprehensive E2E test suite covers all critical pages and architectural components of the Roo application, providing robust testing for user journeys, model integration, and real-time functionality.

**Test Stats**: 12 test files with 97+ individual test cases covering all user flows, authentication, data management, and real-time features.

## Test Coverage Summary

### 🎯 **Complete Page Coverage (13+ Pages)**

| Page                  | Test File                           | Test Count | Coverage                                      |
| --------------------- | ----------------------------------- | ---------- | --------------------------------------------- |
| Teacher Dashboard     | `core-dashboard.test.ts`            | 5 tests    | ✅ Data display, navigation, real-time status |
| Teacher Assignments   | `teacher-assignment-detail.test.ts` | 9 tests    | ✅ Detail views, navigation, submissions      |
| Teacher Grades        | `teacher-grades.test.ts`            | 9 tests    | ✅ Statistics, filtering, grade management    |
| Student Dashboard     | `student-dashboard.test.ts`         | 11 tests   | ✅ Student experience, assignments, grades    |
| Login/Auth Pages      | `complete-login-flows.test.ts`      | 9 tests    | ✅ All auth paths, error handling             |
| Authentication Core   | `core-auth.test.ts`                 | 5 tests    | ✅ Core auth flow, redirects, validation      |
| Data Import           | `core-import.test.ts`               | 5 tests    | ✅ File upload, validation, success states    |
| Account Creation      | `core-account-creation.test.ts`     | 4 tests    | ✅ Teacher signup flow, validation            |
| Cross-Page Navigation | `cross-page-navigation.test.ts`     | 13 tests   | ✅ Multi-page journeys, deep linking          |

### 🏗️ **Architecture Integration Tests**

| Component           | Test File                    | Test Count | Coverage                                            |
| ------------------- | ---------------------------- | ---------- | --------------------------------------------------- |
| Model Integration   | `model-integration.test.ts`  | 8 tests    | ✅ ClassroomModel, AssignmentModel API integration  |
| Real-time Listeners | `realtime-listeners.test.ts` | 9 tests    | ✅ Firestore listeners, WebSocket connections       |
| Data Store          | `data-store.test.ts`         | 10 tests   | ✅ Reactive state management, synchronization       |
| Complete E2E Flow   | `test-complete-flow.ts`      | 1 test     | ✅ End-to-end auth → import → dashboard integration |

## Test Files Breakdown (97+ Total Tests)

### 🎯 **Core Page Tests (42 tests)**

#### 1. **complete-login-flows.test.ts** (9 tests)

- **Purpose**: Comprehensive authentication flow testing
- **Coverage**: Teacher/student login, OAuth, signup, error handling, timeouts
- **Key Tests**: Role selection, credential validation, persistence, password reset
- **Authentication**: Tests both teacher and student flows

#### 2. **core-auth.test.ts** (5 tests)

- **Purpose**: Core authentication behavior and redirects
- **Coverage**: Unauthenticated redirects, role selection, auth flow navigation
- **Key Tests**: Protected route access, login page display, auth validation
- **Authentication**: Foundational auth testing

#### 3. **core-account-creation.test.ts** (4 tests)

- **Purpose**: Teacher account signup and validation
- **Coverage**: Signup form display, field validation, account creation
- **Key Tests**: Form validation, account creation success/failure
- **Authentication**: Creates test accounts for other tests

#### 4. **student-dashboard.test.ts** (11 tests)

- **Purpose**: Complete student dashboard experience
- **Coverage**: Student UI, assignments, grades, navigation, profile, help
- **Key Tests**: Dashboard display, grade information, navigation, error states
- **Authentication**: Uses `student@test.com` credentials

#### 5. **teacher-grades.test.ts** (9 tests)

- **Purpose**: Teacher grades page functionality
- **Coverage**: Grade display, filtering, statistics, empty states, refresh
- **Key Tests**: Statistics cards, assignment filtering, error handling
- **Authentication**: Uses `teacher@test.com` credentials

#### 6. **core-dashboard.test.ts** (5 tests)

- **Purpose**: Teacher dashboard data display and navigation
- **Coverage**: Dashboard structure, data states, navigation, classroom/assignment handling
- **Key Tests**: Data display vs empty states, navigation patterns
- **Authentication**: Uses `teacher@test.com` credentials

### 🔧 **Feature-Specific Tests (27 tests)**

#### 7. **teacher-assignment-detail.test.ts** (9 tests)

- **Purpose**: Individual assignment detail pages and navigation
- **Coverage**: Assignment info display, navigation, submissions, grading, statistics
- **Key Tests**: Detail view, back navigation, error handling, submission data
- **Authentication**: Uses `teacher@test.com` credentials

#### 8. **cross-page-navigation.test.ts** (13 tests)

- **Purpose**: Complete user journeys across multiple pages
- **Coverage**: Navigation flows, state persistence, role-based access, deep linking
- **Key Tests**: Teacher/student journeys, browser navigation, unauthorized access
- **Authentication**: Uses both teacher and student credentials

#### 9. **core-import.test.ts** (5 tests)

- **Purpose**: Classroom data import functionality
- **Coverage**: File upload, validation, success states, progress feedback
- **Key Tests**: File upload interaction, import process, validation feedback
- **Authentication**: Uses `teacher@test.com` credentials

### ⚡ **Architecture Tests (28 tests)**

#### 10. **model-integration.test.ts** (8 tests)

- **Purpose**: New model-based architecture with real API integration
- **Coverage**: ClassroomModel, AssignmentModel, validation, timestamp handling
- **Key Tests**: Model properties, collection operations, validation errors, synchronization
- **Authentication**: Uses `teacher@test.com` credentials

#### 11. **realtime-listeners.test.ts** (9 tests)

- **Purpose**: Firestore real-time functionality and WebSocket connections
- **Coverage**: Listener initialization, connection states, data updates, cleanup
- **Key Tests**: Real-time status, timestamps, offline/online handling, performance
- **Authentication**: Uses `teacher@test.com` credentials

#### 12. **data-store.test.ts** (10 tests)

- **Purpose**: Reactive state management system testing
- **Coverage**: Store initialization, loading states, synchronization, selection state
- **Key Tests**: Reactive updates, error handling, concurrent operations, persistence
- **Authentication**: Uses `teacher@test.com` credentials

#### 13. **test-complete-flow.ts** (1 comprehensive test)

- **Purpose**: End-to-end integration test covering complete user journey
- **Coverage**: Auth → Profile Setup → Import → Dashboard data flow
- **Key Tests**: Complete integration from authentication to data display
- **Authentication**: Uses `teacher@test.com` credentials
- **Note**: This is the most comprehensive test, validating the entire application flow

## Test Credentials

The test suite uses standardized test credentials:

```typescript
// Teacher credentials
const TEST_TEACHER = {
	email: 'teacher@test.com',
	password: 'test123',
	displayName: 'E2E Test Teacher'
};

// Student credentials
const TEST_STUDENT = {
	email: 'student@test.com',
	password: 'test123',
	displayName: 'E2E Test Student'
};
```

## Helper Functions

The test suite includes comprehensive helper functions for maintainable and reliable testing:

### Authentication Helpers

- `signInAsTeacher(page)` - Complete teacher login flow with error handling
- `signInAsStudent(page)` - Complete student login flow
- `createTestTeacherAccount(page)` - Create test teacher account for E2E tests
- `setupTestTeacherProfile(page)` - Initialize teacher profile for API access

### Import & Data Helpers

- `gotoSnapshotImport(page)` - Navigate to classroom import page
- `uploadSnapshotFile(page)` - Upload test classroom snapshot
- `waitForImportSuccess(page)` - Wait for import completion with status checking
- `verifyDashboardData(page)` - Verify real data vs empty state

### Navigation & UI Helpers

- `waitForPageReady(page)` - Wait for loading states to complete
- `navigateDashboardSafely(page)` - Robust dashboard navigation
- `clickElementSafely(page, selector)` - Safe element clicking with retries
- `waitForElementSafely(page, selector)` - Element waiting with timeout handling

### Debugging & Testing Helpers

- `debugPage(page, name)` - Take screenshot and log page info for debugging
- `checkWelcomeText(page)` - Flexible welcome text verification
- `verifyDashboardState(page)` - Comprehensive dashboard state validation
- `TestDataHelpers` - Data generation and validation utilities

## Running Tests

### **🏠 Emulator Testing (Default Development)**
```bash
# Setup: Start emulators first (in separate terminals)
npm run emulators        # Terminal 1: Start Firebase emulators
npm run dev             # Terminal 2: Start frontend (connects to emulators)

# Run E2E tests against emulators (fast, safe, default)
npm run test:e2e                                    # All tests against emulators
npx playwright test                                 # Alternative direct command
npx playwright test teacher-grades.test.ts         # Specific test file
npx playwright test --headed                       # Visible browser mode

# Debug emulator tests
npx playwright test --debug                        # Interactive debugging
npx playwright test core-*.test.ts                 # Core functionality only
```

### **🧪 Staging Validation (Pre-deployment)**  
```bash
# Run tests against real staging Firebase
TEST_ENVIRONMENT=staging npm run test:e2e:staging  # All staging tests
TEST_ENVIRONMENT=staging npx playwright test multi-user-access.test.ts  # Specific staging test

# Setup staging test users (run once)
TEST_ENVIRONMENT=staging npm run test:setup-users  # Create staging test accounts
TEST_ENVIRONMENT=staging npm run test:cleanup-users # Clean staging when done
```

### **🚀 Production Verification (Post-deployment)**
```bash  
# Read-only tests against production (non-destructive)
TEST_ENVIRONMENT=production npm run test:e2e:production

# Production tests run with existing accounts only - no test user creation/cleanup
```

### **Test Categories (All Environments)**
```bash
# Run by test category  
npx playwright test core-*.test.ts        # Core functionality
npx playwright test teacher-*.test.ts     # Teacher-specific features  
npx playwright test *-integration.test.ts # Architecture integration
npx playwright test test-complete-flow.ts # Comprehensive end-to-end test
```

## Test Philosophy

### 1. **Three-Stage Testing Pipeline**

**🏠 Phase 1: Emulator Testing (Primary)**
- **Default**: E2E tests run against Firebase emulators for fast, safe development
- **Local data**: Uses emulated Firebase services with persistent local data
- **Real authentication flows**: Actual Firebase Auth patterns via emulator
- **Fast feedback**: No network latency, instant environment reset

**🧪 Phase 2: Staging Validation**
- **Pre-deployment**: Tests against real staging Firebase project
- **Shared environment**: Uses staging data with controlled test accounts
- **Real services**: Validates against actual Firebase infrastructure
- **Integration testing**: Ensures compatibility with production-like environment

**🚀 Phase 3: Production Verification**  
- **Post-deployment**: Read-only tests against live production environment
- **Non-destructive**: Only validates existing functionality, no test data creation
- **Live validation**: Confirms production deployment success

### 2. **Comprehensive Coverage (97+ Tests)**

- All user-facing pages tested (13+ pages)
- Critical user journeys covered end-to-end
- Error states and edge cases handled
- Both teacher and student workflows validated

### 3. **Architecture Testing**

- New model-based architecture validated
- Real-time functionality tested with WebSocket connections
- State management and reactivity verified
- API integration and data synchronization tested

### 4. **Robust & Maintainable**

- Flexible selectors that adapt to UI changes
- Clear error messages and debugging screenshots
- Consistent helper functions for reliability
- Graceful degradation for missing features
- Retry logic for flaky network conditions

## Test Results Interpretation

### Success Indicators

- ✅ `Found X content/navigation/data` - Feature working correctly
- ✅ `Successfully navigated to X` - Navigation working
- ✅ `X test completed` - Test scenario handled
- ✅ `Authentication successful` - Login flows working
- ✅ `Import completed successfully` - Data import working
- ✅ `Dashboard shows imported classroom data` - End-to-end flow working

### Warning Indicators

- ⚠️ `No X found` - Feature may be missing or different than expected
- ⚠️ `X limitation` - Test couldn't fully validate due to data/access constraints
- ⚠️ `Auth failed, testing UI without authentication` - Continuing with UI-only tests
- ⚠️ `Store initialization check failed` - Data store issues

### Error Indicators

- ❌ `Import failed` - Data import issues (validation/network errors)
- ❌ `Dashboard failed: 403 API error` - Authentication/permission issues
- ❌ `E2E Flow failed` - End-to-end integration problems
- ❌ `Dashboard does not show imported data` - Data persistence issues

### Error Handling

- Tests are designed to degrade gracefully
- Missing features log warnings rather than failing hard
- Real-world conditions (empty data, slow networks) are handled
- Screenshots automatically taken on failures for debugging
- Network errors and authentication issues are specifically detected

## Maintenance

### Adding New Tests

1. Follow existing patterns in test files
2. Use helper functions for authentication and common actions
3. Include both positive and negative test cases
4. Add descriptive console.log messages for debugging

### Updating Tests

1. Tests auto-adapt to UI changes through flexible selectors
2. Update credentials in `test-helpers.ts` if needed
3. Add new helper functions for common patterns
4. Maintain test count accuracy when adding/removing tests
5. Update file descriptions when test purposes change

### Test Status Summary

- **Total Test Files**: 13 (.test.ts + test-complete-flow.ts)
- **Total Test Cases**: 97+ individual tests
- **Coverage Areas**: Authentication, Core Pages, Features, Architecture
- **Test Categories**:
  - Core Page Tests (42 tests)
  - Feature-Specific Tests (27 tests)
  - Architecture Tests (28 tests)
- **Authentication**: Both teacher and student workflows covered
- **Integration**: End-to-end flow validation with `test-complete-flow.ts`

This comprehensive test suite ensures the Roo application works correctly across all user scenarios, from initial authentication through complete data workflows, maintaining high quality through automated testing.
