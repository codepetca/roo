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

1. **Shared Core Schemas** (`shared/schemas/core.ts`): Normalized entities with versioning
2. **Transformation Pipeline** (`shared/schemas/transformers.ts`): Snapshot → Core conversion
3. **Repository Services** (`functions/src/services/`): Type-safe CRUD with Firebase Admin SDK
4. **Grade Versioning** (`functions/src/services/grade-versioning.ts`): Protected grade history
5. **Frontend API Client** (`frontend/src/lib/api.ts`): Runtime validation of responses

### Entity Architecture Rules (MANDATORY)
🚨 **ALWAYS use core entities** - Import from `shared/schemas/core.ts`
🚨 **NEVER bypass repository** - Use `FirestoreRepository` for all CRUD operations
🚨 **PROTECT grades** - Use `GradeVersioningService` for all grade operations  
🚨 **PRESERVE history** - All entities have `version`, `isLatest`, timestamps
🚨 **STABLE IDs** - Use `StableIdGenerator` for consistent entity identification

### Legacy Compatibility
- **Old schemas**: `functions/src/schemas/` still exist but being replaced
- **Migration**: Use `SnapshotProcessor` to convert legacy data

## E2E Testing Guidelines

**🚨 IMPORTANT: NO EMULATORS FOR E2E TESTS**
- **NEVER use emulators** for E2E tests - they add unnecessary complexity
- **Always test against real Firebase staging project**
- **Mock Authentication**: Use mock auth to bypass Google OAuth in tests
- **DO NOT run `npm run emulators`** for E2E testing
- **Real Firebase**: All E2E tests run against staging Firebase instance

### Current Test Suite Statistics
- **Test Files**: 12+ E2E test files with 95+ individual test cases
- **Test Categories**: Core, Integration, and Architecture tests
- **Most Reliable**: Core authentication and dashboard tests
- **Coverage**: Complete authentication flows, data import, realtime listeners, cross-page navigation

### E2E Test Execution Commands
```bash
# NO EMULATORS! Test directly against staging
cd frontend
npm run dev              # Connects to staging Firebase
npm run test:e2e         # Run all E2E tests (recommended)
npx playwright test      # Alternative direct command

# Run specific test categories
npx playwright test core-auth.test.ts        # Core authentication tests
npx playwright test core-dashboard.test.ts   # Dashboard functionality tests
npx playwright test complete-login-flows.test.ts  # End-to-end login flows

# Debug failing tests
npx playwright test --debug                  # Interactive debugging mode
npx playwright test --headed                 # Run with visible browser
```

### Standardized Test Credentials
- **Teacher Tests**: `teacher@test.com` / `test123` (primary test account)
- **Student Tests**: `student@test.com` / `test123` (student test account)
- **Legacy Reference**: `test.codepet@gmail.com` (historical, still referenced in some tests)
- **Profile Data**: Consistent test display names and school emails across test suite

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

## Firebase Emulator Development (Local Development Only)

The project supports Firebase Local Emulator Suite for local development (NOT for E2E tests).

#### Emulator Services (Development Only)
- **Auth**: http://localhost:9099 (mock authentication)
- **Firestore**: http://localhost:8080 (local database)
- **Functions**: http://localhost:5001 (API endpoints)
- **Emulator UI**: http://localhost:4000 (visual debugging)

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
1. **Google Sheets → Source Schemas**: Validate all sheet data
2. **Source → Domain Schemas**: Transform for business logic  
3. **Domain → DTO Schemas**: Serialize for API boundaries
4. **Frontend Validation**: Validate all API responses

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