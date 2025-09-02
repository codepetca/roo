# CLAUDE.md

This file provides core guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Roo**: Full-stack AI-powered auto-grading system for educational assignments
- **Focus**: Programming assignments (Karel the Dog) and quizzes
- **AI**: Google Gemini 1.5 Flash with generous grading for handwritten code
- **Stack**: SvelteKit + **Svelte 5** frontend + Firebase Functions backend + Google Sheets integration

🚨 **MANDATORY**: Use Svelte 5 runes (`$state`, `$derived`, `$props`) - NOT Svelte 4 patterns!

### Svelte 5 Snippets Pattern
**IMPORTANT**: In Svelte 5, use `{#snippet name()}...{/snippet}` blocks instead of slots:
- Define snippets BEFORE they are used in the component
- Pass snippets as props: `let { children }: { children?: Snippet } = $props()`
- Render with: `{@render children?.()}`
- For named snippets: `{#snippet actions()}...{/snippet}` then pass as prop

## Essential Commands

```bash
npm run dev              # Start frontend + Firebase emulators
npm run emulators        # Start Firebase emulators with data persistence
npm run build            # Build both components  
npm run quality:check    # Lint + type check everything
npm run test             # Run all tests
npm run deploy           # Deploy to Firebase
```

## Core Technology Stack (Immutable)

- **Frontend**: SvelteKit 2.x + **Svelte 5** (REQUIRED) + TypeScript + TailwindCSS
- **Backend**: Firebase Functions + TypeScript + Zod validation
- **Database**: Firestore + Google Sheets (legacy) + **NEW: DataConnect-Ready Architecture**
- **AI**: Google Gemini 1.5 Flash
- **Testing**: Vitest (comprehensive test suite with 90+ tests) + mocked services
- **Type Safety**: Comprehensive Zod validation + shared types + TypeScript strict mode

### **NEW: DataConnect-Ready Schema Architecture**
- **Core Entities**: `shared/schemas/core.ts` - Teacher, Classroom, Assignment, Submission, Grade, StudentEnrollment
- **Transformers**: `shared/schemas/transformers.ts` - Snapshot → Normalized entity conversion
- **Repository**: `functions/src/services/firestore-repository.ts` - CRUD operations
- **Grade Versioning**: `functions/src/services/grade-versioning.ts` - Preserves graded work across updates
- **Processor**: `functions/src/services/snapshot-processor.ts` - Orchestrates transformation pipeline

## File Organization Principles

- **File Size**: Keep files under 200 lines for optimal Claude processing
- **Location Comments**: Include `Location: file:line` in function docs
- **Shared Types**: Import via `@shared/types` in frontend
- **Naming**: Use kebab-case for routes, PascalCase for components

## 🎯 **BULLETPROOF TYPE SAFETY ARCHITECTURE**

This project implements **comprehensive type safety** at every layer:

### **Backend Layer (Sophisticated Entity System)**
1. **Shared Core Schemas** (`shared/schemas/core.ts`): Normalized entities with versioning
2. **Transformation Pipeline** (`shared/schemas/transformers.ts`): Snapshot → Core conversion
3. **Repository Services** (`functions/src/services/`): Type-safe CRUD with Firebase Admin SDK
4. **Grade Versioning** (`functions/src/services/grade-versioning.ts`): Protected grade history
5. **AI Grading Pipeline** (`functions/src/routes/grading.ts`): Classification-aware content extraction and AI grading

### **Frontend Layer (Simple API Consumption)**
6. **API Client** (`frontend/src/lib/api/client.ts`): Direct HTTP calls with auth token injection
7. **API Endpoints** (`frontend/src/lib/api/endpoints.ts`): Type-safe endpoint definitions with Zod validation
8. **Simple Stores** (`frontend/src/lib/stores/`): Reactive state management with Svelte 5 runes

## 🔄 **SIMPLIFIED FRONTEND ARCHITECTURE (Current)**

**NEW APPROACH**: Direct API consumption without data transformation layers

### **Frontend Data Flow (Simple & Direct)**
```
SvelteKit Load Functions → HTTP API Calls → typedApiRequest → Zod Validation → Reactive Stores → UI Components
```

### **AI Grading Pipeline (Backend Only)**
```
AppScript Extract → Snapshot Import → Firestore Storage → Classification-Aware Extraction → AI Grading → Grade Storage
```

**Pipeline Architecture Rules**:
1. **AppScript** (`appscript/development/classroom-snapshot-exporter/`): Extracts submissions from Google Classroom, detects platform types (Google Forms, Docs, etc.)
2. **Snapshot Processing** (`functions/src/services/snapshot-processor.ts`): Transforms raw classroom data into normalized core entities with classification metadata
3. **Classification System** (`shared/schemas/core.ts`): Each assignment gets `platform`, `contentType`, and `gradingApproach` classification
4. **Content Extraction** (`functions/src/routes/grading.ts:extractSubmissionContent()`): Platform-aware data extraction (Google Forms → `quizResponse`, Google Docs → `extractedContent.text`, etc.)
5. **AI Grading** (Google Gemini 1.5 Flash): Receives properly extracted content with context-appropriate prompts based on classification
6. **Grade Versioning** (`functions/src/services/grade-versioning.ts`): Preserves grade history across assignment updates

### **Key Frontend Components**
- **Load Functions** (`routes/**/+page.ts`): SvelteKit SSR data loading with fetch()
- **API Client** (`frontend/src/lib/api/client.ts`): HTTP client with Firebase auth token injection
- **API Endpoints** (`frontend/src/lib/api/endpoints.ts`): Type-safe endpoint definitions using core schemas
- **UserService** (`frontend/src/lib/services/user-service.ts`): Simplified API-only authentication service
- **Data Store** (`frontend/src/lib/stores/data-store.svelte.ts`): Svelte 5 runes with manual refresh patterns

### **Frontend Import Patterns**
```typescript
// ✅ Correct - Frontend imports from API endpoints
import { api } from '$lib/api/endpoints';
const assignments = await api.listAssignments();

// ✅ Correct - Frontend uses core schemas for validation
import { assignmentSchema } from '@shared/schemas/core';
const validated = assignmentSchema.parse(data);

// ❌ Wrong - Frontend does NOT import backend repositories
// import { FirestoreRepository } from '...' // NO!
```

### **Eliminated Patterns** ❌
- ~~**DataAdapter**: Removed - backend now returns normalized data~~
- ~~**Real-time listeners**: Removed - manual refresh pattern only~~
- ~~**Firestore fallbacks**: Removed - API-only approach~~

### **Backend Entity Architecture Rules** (MANDATORY for Backend Development)
🚨 **BACKEND ONLY** - These rules apply to `functions/src/` development only
🚨 **ALWAYS use core entities** - Import from `shared/schemas/core.ts` in backend services
🚨 **NEVER bypass repository** - Use `FirestoreRepository` for all backend CRUD operations
🚨 **PROTECT grades** - Use `GradeVersioningService` for all grade operations in backend
🚨 **PRESERVE history** - All entities have `version`, `isLatest`, timestamps
🚨 **STABLE IDs** - Use `StableIdGenerator` for consistent entity identification
🚨 **STUDENT ENROLLMENT MATCHING** - Import process resolves student emails to Firebase UIDs for proper dashboard integration

### **Frontend Development Rules** (MANDATORY for Frontend Development)
🚨 **FRONTEND ONLY** - These rules apply to `frontend/src/` development only
🚨 **USE API ENDPOINTS** - Import from `$lib/api/endpoints` for all data operations
🚨 **MANUAL REFRESH** - Use explicit refresh actions, no automatic real-time updates
🚨 **SIMPLE STORES** - Use Svelte 5 runes for reactive state management
🚨 **VALIDATE RESPONSES** - Use core schemas to validate API responses, not for data manipulation

### **Frontend Development Patterns (Current Implementation)**

#### **SvelteKit Load Function Pattern**
```typescript
// routes/dashboard/teacher/+page.ts
export const load: PageLoad = async ({ fetch }) => {
  // Direct API calls using fetch (for SSR compatibility)
  const response = await fetch(`${API_BASE_URL}/api/assignments`);
  const result = await response.json();
  
  return {
    assignments: result.data || [],
    classrooms: [], // Loaded client-side with auth
  };
};
```

#### **Client-Side API Pattern**
```typescript
// In Svelte components
import { api } from '$lib/api/endpoints';
import { dataStore } from '$lib/stores/data-store.svelte';

// Load authenticated data
async function loadDashboard() {
  const dashboard = await api.getTeacherDashboard();
  dataStore.setData({ classrooms: dashboard.classrooms });
}
```

#### **Store Pattern with Svelte 5 Runes**
```typescript
// stores/data-store.svelte.ts
class DataStore {
  classrooms = $state<Classroom[]>([]);
  assignments = $state<Assignment[]>([]);
  
  // Computed properties
  hasData = $derived(this.classrooms.length > 0);
  
  // Methods for manual updates
  setData(data: { classrooms?: Classroom[] }) {
    if (data.classrooms) this.classrooms = data.classrooms;
  }
}
```

### Legacy Compatibility
- **Old schemas**: `functions/src/schemas/` still exist but being replaced
- **Migration**: Use `SnapshotProcessor` to convert legacy data

## Development Flow & Testing Guidelines

**🔄 THREE-STAGE DEVELOPMENT PIPELINE**
This project follows a structured development approach:

1. **🏠 Local Development (Emulators)**: Build and test features locally with Firebase emulators
2. **🧪 Staging Validation**: Test against real Firebase staging project  
3. **🚀 Production Deployment**: Deploy only after staging validation passes

### **E2E Testing Strategy by Environment**

#### **Phase 1: Emulator Testing (Primary Development)**
- **Default approach**: `npm run test:e2e` runs against local emulators
- **Fast feedback**: No network latency, instant data reset
- **Safe testing**: No impact on shared staging data
- **Real authentication**: Still uses actual Firebase Auth flows via emulator

#### **Phase 2: Staging Validation**  
- **Pre-deployment**: `npm run test:e2e:staging` tests against staging Firebase
- **Real services**: Validates against actual Firebase infrastructure
- **Shared environment**: Uses staging project with controlled test data

#### **Phase 3: Production Verification**
- **Post-deployment**: `npm run test:e2e:production` runs read-only tests
- **Live validation**: Confirms production deployment success
- **Non-destructive**: Only read operations, no test data creation

### Current Test Suite Statistics
- **Unit Tests**: 24 test files with 156 individual test cases (**91% pass rate**)
- **E2E Tests**: 12+ E2E test files with 95+ individual test cases
- **Test Categories**: Core, Integration, and Architecture tests
- **Most Reliable**: Core authentication and dashboard tests, UserService API tests
- **Coverage**: Complete authentication flows, data import, API-only patterns, cross-page navigation

### E2E Test Execution Commands

#### **🏠 Local Development (Emulators) - DEFAULT**
```bash
# Start emulators + development server
npm run emulators        # Terminal 1: Start Firebase emulators with persistence
npm run dev             # Terminal 2: Start frontend connecting to emulators

# Run E2E tests against emulators (fast, safe)
npm run test:e2e         # Default: runs against local emulators
npx playwright test      # Alternative direct command

# Debug emulator tests
npx playwright test --debug    # Interactive debugging
npx playwright test --headed   # Visible browser
```

#### **🧪 Staging Validation**
```bash
# Test against real staging Firebase
TEST_ENVIRONMENT=staging npm run test:e2e:staging

# Run specific staging tests
TEST_ENVIRONMENT=staging npx playwright test core-auth.test.ts
TEST_ENVIRONMENT=staging npx playwright test multi-user-access.test.ts
```

#### **🚀 Production Verification (Read-Only)**
```bash
# Verify production deployment (non-destructive tests only)
TEST_ENVIRONMENT=production npm run test:e2e:production
```

### Standardized Test Credentials
- **Teacher Tests**: `teacher1@test.com`, `teacher2@test.com`, `teacher3@test.com` / `test123`
- **Student Tests**: `student1@schoolemail.com` through `student8@schoolemail.com` / passcode `12345`
- **Authentication**: Teachers use email/password, Students use school email/passcode
- **Profile Data**: All test users have consistent Firebase UIDs (e.g., `teacher1-e2e-uid`, `student1-e2e-uid`)

### Test Reliability and Categories

#### Most Reliable Tests (Core)
- **Core Authentication** (`core-auth.test.ts`): Login redirects, authentication flow
- **Core Dashboard** (`core-dashboard.test.ts`): Data display, navigation
- **Core Import** (`core-import.test.ts`): Classroom snapshot import functionality

#### Integration Tests
- **Complete Login Flows** (`complete-login-flows.test.ts`): End-to-end authentication
- **Cross-page Navigation** (`cross-page-navigation.test.ts`): Multi-page workflows
- **Data Store Tests** (`data-store.test.ts`): State management integration

#### Architecture Tests
- **Model Integration** (`model-integration.test.ts`): Data model consistency
- **Realtime Listeners** (`realtime-listeners.test.ts`): Firebase realtime functionality

### Test Development Best Practices
- **Run Core Tests First**: Start with `core-auth.test.ts` and `core-dashboard.test.ts`
- **Staging Environment**: All tests run against real Firebase staging instance
- **Helper Functions**: Use `test-helpers.ts` for common operations (login, navigation, etc.)
- **Robust Selectors**: Tests use multiple fallback selectors and safe element detection
- **Comprehensive Logging**: Test failures include detailed error context and screenshots

## Unit Testing Guidelines (API-Only Architecture)

**✅ CURRENT APPROACH: API Mocking Pattern**
- **Test Environment**: Vitest with comprehensive mocking
- **API Mocking**: Mock `apiRequest` and `callFunction` from `frontend/src/lib/api/client`
- **No DataAdapter**: Tests use direct API response patterns
- **Schema Validation**: All API responses validated with Zod schemas

### Unit Test Execution Commands
```bash
# Run all unit tests (91% pass rate)
npm run test:unit

# Run specific test files
npm run test:unit -- --run src/lib/services/user-service.test.ts
npm run test:unit -- --run src/lib/stores/hierarchical-navigation.test.ts

# Debug test failures
npm run test:unit -- --reporter=verbose
```

### Testing Patterns (Updated Architecture)
- **UserService Tests**: Mock `apiRequest` and `callFunction` directly
- **Store Tests**: Test Svelte 5 runes with manual refresh patterns
- **API Client Tests**: Test HTTP client with auth token injection
- **No Real-time Tests**: All tests use synchronous API patterns

### Test Statistics
- **Total Tests**: 156 unit tests across 24 files
- **Pass Rate**: 91% (142 passing, 14 failing)
- **Coverage**: UserService, data stores, API client, validation schemas
- **Environment**: Server tests (Node.js) + Client tests (Browser/Playwright)

## Firebase Emulator Development (Primary Development Environment)

The project uses Firebase Local Emulator Suite as the **primary development environment** for fast, safe feature development.

#### Emulator Services (Primary for Development & E2E Testing)
- **Auth**: http://localhost:9099 (real authentication flows, local users)
- **Firestore**: http://localhost:8080 (local database with persistence)
- **Functions**: http://localhost:5001 (local API endpoints)
- **Emulator UI**: http://localhost:4000 (visual debugging and data management)

#### **Environment Management**

**🏠 Local Development (Default)**
```bash
# Uses .env (points to emulators)
npm run emulators        # Start emulators with data persistence
npm run dev             # Frontend connects to emulators
npm run test:e2e        # E2E tests against emulators
```

**🧪 Staging Environment**  
```bash
# Uses .env.staging (real Firebase staging project)
TEST_ENVIRONMENT=staging npm run dev           # Frontend connects to staging
TEST_ENVIRONMENT=staging npm run test:e2e:staging  # E2E tests against staging
```

**🚀 Production Environment**
```bash
# Uses .env.production (production Firebase project)  
TEST_ENVIRONMENT=production npm run test:e2e:production  # Read-only tests
npm run deploy          # Deploy to production (after staging validation)
```

## Authentication Architecture

The Roo system implements **dual authentication flows** for teachers and students with distinct patterns:

### **Teacher Authentication Flow**
- **Method**: Standard Firebase Auth with email/password
- **Accounts**: Created manually via Firebase Auth (app emails like `teacher1@test.com`)
- **Login**: Direct Firebase signIn with email and password
- **Profile**: Firestore user document with `role: 'teacher'` and `schoolEmail` field
- **Dashboard**: Teacher dashboard shows classrooms they've created/imported

### **Student Authentication Flow** 
- **Method**: School email + 5-character passcode system
- **Accounts**: Created automatically during classroom import or via passcode request
- **Login Process**:
  1. Student enters school email (e.g., `student1@schoolemail.com`)
  2. Student requests passcode (generates/sends via Brevo email service)
  3. Student enters passcode for verification
  4. Backend creates Firebase Auth user and custom token
  5. Frontend signs in with custom token
- **Profile**: Firestore user document with `email = schoolEmail` and `role: 'student'`
- **Dashboard**: Student dashboard shows classrooms they're enrolled in (via teacher imports)

### **Key Authentication Implementation Details**

#### **Student Passcode System**
```typescript
// Backend: Generate passcode for student
POST /api/auth/student-request-passcode
{ email: "student1@schoolemail.com" }

// Backend: Verify passcode and create Firebase user
POST /api/auth/verify-passcode  
{ email: "student1@schoolemail.com", passcode: "ABC12" }
```

#### **Student Account Creation**
- **Triggered by**: Classroom import process or passcode request
- **Email matching**: Student email in snapshot matches Firestore user email
- **UID Resolution**: Import process resolves school email to Firebase UID for enrollments
- **Database structure**:
```typescript
// Firestore users collection
{
  id: "student1-e2e-uid",           // Firebase UID
  email: "student1@schoolemail.com", // School email (login credential)
  schoolEmail: "student1@schoolemail.com", // Same as email for students
  role: "student",
  passcode: {
    value: "ABC12",
    createdAt: timestamp,
    attempts: 0
  }
}
```

#### **Enrollment Matching Logic**
- **Critical Fix**: Import process now resolves student emails to Firebase UIDs
- **Before**: `studentId: "student_student1_at_schoolemail_com"` (email-based)
- **After**: `studentId: "student1-e2e-uid"` (Firebase UID)
- **Dashboard Query**: `getEnrollmentsByStudent(firebaseUID)` finds correct enrollments

### **Test Account Configuration**

#### **Teachers (Email/Password)**
- `teacher1@test.com` / `test123`
- `teacher2@test.com` / `test123`  
- `teacher3@test.com` / `test123`

#### **Students (School Email/Passcode)**
- `student1@schoolemail.com` / `12345`
- `student2@schoolemail.com` / `12345`
- ...through `student8@schoolemail.com` / `12345`

#### **Authentication Flow Validation**
```bash
# Test teacher authentication
curl -X POST http://localhost:5001/roo-app-3d24e/us-central1/api/auth/login \
  -d '{"email":"teacher1@test.com","password":"test123"}'

# Test student passcode request  
curl -X POST http://localhost:5001/roo-app-3d24e/us-central1/api/auth/student-request-passcode \
  -d '{"email":"student1@schoolemail.com"}'

# Test student passcode verification
curl -X POST http://localhost:5001/roo-app-3d24e/us-central1/api/auth/verify-passcode \
  -d '{"email":"student1@schoolemail.com","passcode":"12345"}'
```

#### Critical Firebase Development Patterns
**🚨 IMPORTANT: serverTimestamp() Issues**
- Always use environment-aware timestamp handling
- Import Firebase Admin directly, avoid re-exports
- Build after TypeScript changes (`npm run build`)
- Handle missing documents gracefully (check `error.code === 5`)

## Detailed Guidance

For evolving patterns, detailed architecture, and implementation guides, see:
- `docs/development/current-architecture.md` - Living system design
- `docs/development/coding-patterns.md` - Detailed implementation patterns
- `docs/development/ai-collaboration-guide.md` - How to work with Claude Code effectively
- `docs/development/dataconnect-architecture.md` - DataConnect-ready schema architecture
- `docs/firebase.md` - Firebase development patterns and best practices
- `docs/svelte5.md` - Svelte 5 runes patterns and mandatory practices

## 🔬 **MANDATORY TDD DEVELOPMENT WORKFLOW**

This project follows **strict Test-Driven Development** - tests must fail before passing.

### **Red-Green-Refactor Cycle (REQUIRED)**
```bash
# MANDATORY for ALL feature development:
1. RED: Write failing test first (npm run test MUST fail)
2. GREEN: Write minimal code to pass test  
3. REFACTOR: Improve code while keeping tests green
4. QUALITY: All quality gates pass
5. COMMIT: Commit with proper message
```

### **Pre-Development Setup**
```bash
npm run emulators        # Start Firebase emulators with data persistence
npm run dev             # Start frontend + emulators (separate terminal)
```

### **Schema-First Development Rules (MANDATORY)**

#### **Backend Schema Flow**
1. **Google Sheets → Source Schemas**: Validate all sheet data in `shared/schemas/classroom-snapshot.ts`
2. **Source → Domain Schemas**: Transform to core entities in `shared/schemas/core.ts`
3. **Domain → DTO Schemas**: Serialize for API boundaries in `frontend/src/lib/schemas.ts`
4. **Repository Layer**: Use `FirestoreRepository` with validated core entities

#### **Frontend Schema Flow**
1. **API Endpoints**: Import core schemas from `@shared/schemas/core`
2. **Response Validation**: Use `typedApiRequest()` with schema validation
3. **Store Updates**: Pass validated data to Svelte 5 reactive stores
4. **UI Consumption**: Components consume typed store data directly

### **Quality Gates (ALL MUST PASS)**

**Before any commit**:
- 🔴 **Tests fail first**: New tests must fail initially
- ✅ **All tests pass**: `npm run test` (frontend + backend)
- ✅ **Quality check**: `npm run quality:check` (lint + type check)
- ✅ **Build succeeds**: `npm run build` 
- ✅ **Schema validation**: All boundaries use Zod schemas
- ✅ **Type safety**: No `any` types, proper error handling
- ✅ **Security**: No secrets in code

### **Testing Strategy (90+ Tests ✅)**
- **Current Coverage**: 90 tests (schemas, services, business logic)
- **Unit Tests**: Vitest with comprehensive mocking (Firebase, Sheets, Gemini)
- **Service Tests**: Full coverage of Firestore, Sheets, AI services
- **Schema Tests**: Exhaustive validation of all data transformations
- **Test Factories**: Reusable data factories for rapid test development

#### **Test Maintenance Philosophy**
- **Schema-driven**: Tests auto-adapt when schemas evolve
- **Minimal rewrites**: ~95% of tests stay stable during development
- **Efficient updates**: I update tests automatically with feature changes
- **Rapid feedback**: Fast test suite enables confident refactoring

### **Commit Format**
```bash
git commit -m "feat: description 🤖 Generated with [Claude Code](https://claude.ai/code)"
```

## 📱 **AppScript Deployment (CRITICAL)**

**🚨 IMPORTANT**: For AppScript projects, `clasp push` only uploads files - it does NOT update the live web app!

### **Correct AppScript Deployment Flow**
```bash
# 1. Upload code changes
clasp push

# 2. Update live web app (REQUIRED!)
clasp deploy --deploymentId AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw --description "Update description"
```

### **AppScript Project Locations**
- **Teacher Grading UI**: `appscript/development/teacher-grading-ui/`
- **Deployment ID**: `AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw`

**⚠️ Common Mistake**: Running only `clasp push` and expecting the web app to update - it won't!

---

**Last Updated**: January 2025 - Update only when core architecture changes.