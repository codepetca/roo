# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Roo**: Full-stack AI-powered auto-grading system for educational assignments
- **Focus**: Programming assignments (Karel the Dog) and quizzes
- **AI**: Google Gemini 1.5 Flash with generous grading for handwritten code
- **Stack**: SvelteKit + **Svelte 5** frontend + Firebase Functions backend + Google Sheets integration

🚨 **MANDATORY**: Use Svelte 5 runes (`$state`, `$derived`, `$props`) - NOT Svelte 4 patterns!

## Quick Start

```bash
npm run dev              # Start frontend + Firebase emulators
npm run emulators        # Start Firebase emulators with data persistence
npm run build            # Build both components  
npm run quality:check    # Lint + type check everything
npm run test             # Run all tests
npm run deploy           # Deploy to Firebase
```

### Firebase Emulator Suite Setup

The project uses Firebase Local Emulator Suite for safe local development without touching production data.

#### Emulator Services
- **Auth**: http://localhost:9099 (mock authentication)
- **Firestore**: http://localhost:8080 (local database)
- **Functions**: http://localhost:5001 (API endpoints)
- **Emulator UI**: http://localhost:4000 (visual debugging)

#### Quick Commands
```bash
npm run dev              # Start frontend + emulators together
npm run emulators        # Start only emulators with data persistence
npm run emulators:seed   # Populate test data (users, assignments, submissions)
npm run emulators:export # Manually save current emulator state
```

#### Test Credentials (after seeding)
- Teacher: `teacher@test.com` / `test123`
- Student 1: `student1@test.com` / `test123`
- Student 2: `student2@test.com` / `test123`

#### Key Files
- `firebase.json` - Emulator port configuration
- `frontend/src/lib/firebase.ts` - Auto-connects to emulators in dev
- `frontend/src/lib/api.ts` - API client with emulator URL switching
- `functions/src/utils/emulator.ts` - Backend emulator detection
- `scripts/seed-emulator-data.mjs` - Test data seeder

Data persists in `./emulator-data/` between sessions (gitignored).

## Architecture

### Current Project Structure
```
roo/
├── frontend/            # SvelteKit application
│   ├── src/
│   │   ├── routes/      # SvelteKit routes
│   │   │   ├── +layout.svelte
│   │   │   └── +page.svelte
│   │   ├── lib/         # Shared components and utilities
│   │   └── app.html     # HTML template
│   └── package.json     # Frontend dependencies
├── functions/           # Firebase Functions backend
│   └── src/
│       ├── routes/      # API endpoints (< 150 lines each)
│       │   ├── health.ts    # Health checks
│       │   ├── assignments.ts # CRUD operations
│       │   ├── grading.ts   # AI grading endpoints
│       │   └── sheets.ts    # Google Sheets integration
│       ├── middleware/validation.ts  # Request validation
│       ├── services/    # Business logic
│       │   ├── gemini.ts    # AI grading service
│       │   └── sheets.ts    # Google Sheets service
│       ├── schemas/     # Zod validation schemas
│       └── types/       # TypeScript definitions
└── package.json         # Root workspace configuration
```

### Key API Endpoints
- `POST /grade-quiz` - Grade quiz using answer keys
- `POST /grade-code` - Grade coding assignments (generous mode)
- `GET /sheets/all-submissions` - Get submissions from Google Sheets
- `GET /assignments` - List assignments from Firestore

## Claude Code Optimization

### File Organization Rules
- **File Size**: Keep files under 200 lines for optimal Claude processing
- **Single Responsibility**: Each file has one clear purpose
- **Location Comments**: Include `Location: file:line` in function docs
- **Naming**: Use kebab-case for routes, PascalCase for components

### Documentation Pattern
```typescript
/**
 * Brief description of function purpose
 * Location: functions/src/routes/grading.ts:48
 * Dependencies: GeminiService, SheetsService
 */
export async function gradeQuizSubmission(request: QuizGradingRequest) {
  // Implementation
}
```

### Import Organization
```typescript
// 1. External libraries
import { onRequest } from "firebase-functions/v2/https";

// 2. Internal services  
import { createGeminiService } from "../services/gemini";

// 3. Types and schemas
import { GradingRequest } from "../types";
```

## Development Workflow

### Local Development Setup
1. **Install dependencies**: `npm install` (root, frontend, and functions)
2. **Set up environment**: Copy `.env.development` and configure Firebase credentials
3. **Start development**: `npm run dev` (starts frontend + emulators)
4. **Seed test data**: `npm run emulators:seed` (first time only)
5. **Access services**:
   - Frontend: http://localhost:5173
   - API: http://localhost:5001/roo-app-3d24e/us-central1/api
   - Emulator UI: http://localhost:4000

### Quality Gates
1. **Before commits**: `npm run quality:check`
2. **Before deployment**: `npm run build && npm run test`
3. **TypeScript**: Strict mode enforced
4. **ESLint**: Frontend and backend configured

### AI Grading Configuration
- **Rate Limit**: 15 requests/minute per assignment
- **Generous Mode**: Focus on logic over syntax for handwritten code
- **Partial Credit**: Always give credit for attempts
- **Error Handling**: Graceful fallbacks with location references

## Technology Stack

- **Frontend**: SvelteKit 2.x + **Svelte 5** (REQUIRED) + TypeScript + TailwindCSS
- **Backend**: Firebase Functions + TypeScript + Zod validation
- **Database**: Firestore + Google Sheets (legacy)
- **AI**: Google Gemini 1.5 Flash
- **Testing**: Vitest (frontend) + endpoint scripts (backend)

⚠️ **CRITICAL**: This project uses **Svelte 5** syntax and patterns. Do NOT use Svelte 4 patterns!

## Critical Notes

### Required Environment Variables
```bash
# Firebase Functions secrets
GEMINI_API_KEY=your_gemini_key

# Frontend environment  
PUBLIC_FIREBASE_PROJECT_ID=roo-app-3d24e
# (other Firebase config vars)
```

### Before Deployment
- ✅ `npm run quality:check` passes
- ✅ `npm run build` succeeds 
- ✅ All endpoint tests pass
- ✅ No secrets in code

## Common Tasks

### Working with Firebase Emulators

#### Starting Development
```bash
npm run dev                    # Frontend + emulators (recommended)
npm run emulators             # Just emulators
npm run emulators:seed        # Populate test data
```

#### Emulator Features
- **Auto-detection**: Frontend/backend automatically connect when `PUBLIC_USE_EMULATORS=true`
- **Data persistence**: Changes saved to `./emulator-data/` on exit
- **Visual debugging**: Use Emulator UI at http://localhost:4000
- **Hot reload**: Functions rebuild automatically on file changes
- **Security rules**: Test Firestore rules without deployment

#### Testing Scenarios
```bash
# Run tests with emulators
npm run emulators:exec -- npm test

# Test specific endpoint
curl http://localhost:5001/roo-app-3d24e/us-central1/api/

# Clear all data
rm -rf emulator-data && npm run emulators

# Export data snapshot
npm run emulators:export
```

#### Troubleshooting Emulators
- **Port conflicts**: Check `firebase.json` for port settings
- **Connection errors**: Ensure emulators are running before starting frontend
- **Data not persisting**: Check `--export-on-exit` flag in npm scripts
- **Auth issues**: Use Emulator UI to manually create/verify users

#### Critical Firebase Development Patterns (Learned from Implementation)

**🚨 IMPORTANT: serverTimestamp() Issues in Emulators**
- `FieldValue.serverTimestamp()` behaves differently/fails in Firebase emulators
- **Always use environment-aware timestamp handling**:
```typescript
function getCurrentTimestamp(): any {
  if (isEmulator()) {
    return new Date(); // Direct timestamp in emulator
  }
  return admin.firestore.FieldValue.serverTimestamp(); // Server timestamp in production
}
```

**Firebase Admin SDK Import Pattern**
- **Always import Firebase Admin directly**, avoid re-exports that can fail in emulator:
```typescript
import * as admin from "firebase-admin"; // ✅ Correct
// Use: admin.firestore.FieldValue.serverTimestamp()

import { FieldValue } from "../config/firebase"; // ❌ Can fail in emulator
```

**Build Process for Functions**
- **ALWAYS run `npm run build` after TypeScript changes** - the emulator runs compiled JS, not TS
- Pattern: Edit TypeScript → Build → Test (not just Edit → Test)

**Error Debugging Strategy**
- Firebase error messages can be misleading - check import chains and environment context first
- "Cannot read properties of undefined" often means import/context issues, not the method itself
- Check emulator logs for detailed error traces

**Graceful Fallback Patterns**
```typescript
// Handle missing documents gracefully
try {
  await this.updateSubmissionStatus(submissionId, 'graded', gradeId);
} catch (error: any) {
  if (error.code !== 5) { // 5 = NOT_FOUND
    throw error;
  }
  // Log and continue - missing document is acceptable
}
```

**Firebase Development Checklist**
1. ✅ Set up emulator detection utility (`isEmulator()`) first
2. ✅ Create environment-aware timestamp helpers early
3. ✅ Use direct Firebase Admin imports, not re-exports  
4. ✅ Build after every TypeScript change (`npm run build`)
5. ✅ Test incrementally: AI → Storage → Retrieval
6. ✅ Handle missing documents gracefully (check `error.code === 5`)
7. ✅ Check emulator logs for detailed error context

### Adding New API Endpoint
1. Create handler in appropriate `routes/*.ts` file
2. Add route to `index.ts` router
3. Add Zod schema to `schemas/index.ts`
4. Update endpoint list in `routes/health.ts`
5. Test with endpoint scripts

### Frontend Component Development
1. Create component in `frontend/src/lib/`
2. **MUST USE Svelte 5 syntax**: `$state`, `$derived`, `$props` (NO Svelte 4 patterns!)
3. Use TypeScript and modern Svelte 5 conventions
4. Import types from backend if needed
5. Test with `npm run test:frontend`

**Svelte 5 Example**:
```svelte
<script lang="ts">
  interface Props {
    data: GradingResult;
  }
  
  let { data }: Props = $props();
  let isLoading = $state(false);
  let computed = $derived(data.score > 80);
</script>
```

### AI Grading Modifications
1. Update prompts in `services/gemini.ts:GRADING_PROMPTS`
2. Modify grading logic in `GeminiService` class
3. Test with `POST /test-grading` endpoint
4. Update rate limiting if needed

This optimized structure enables efficient Claude Code assistance while maintaining full system context.