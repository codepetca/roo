# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Roo**: Full-stack AI-powered auto-grading system for educational assignments
- **Focus**: Programming assignments (Karel the Dog) and quizzes
- **AI**: Google Gemini 1.5 Flash with generous grading for handwritten code
- **Stack**: SvelteKit frontend + Firebase Functions backend + Google Sheets integration

## Quick Start

```bash
npm run dev              # Start both frontend and backend
npm run build            # Build both components  
npm run quality:check    # Lint + type check everything
npm run test             # Run all tests
npm run deploy           # Deploy to Firebase
```

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

- **Frontend**: SvelteKit 2.x + TypeScript + TailwindCSS
- **Backend**: Firebase Functions + TypeScript + Zod validation
- **Database**: Firestore + Google Sheets (legacy)
- **AI**: Google Gemini 1.5 Flash
- **Testing**: Vitest (frontend) + endpoint scripts (backend)

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

### Adding New API Endpoint
1. Create handler in appropriate `routes/*.ts` file
2. Add route to `index.ts` router
3. Add Zod schema to `schemas/index.ts`
4. Update endpoint list in `routes/health.ts`
5. Test with endpoint scripts

### Frontend Component Development
1. Create component in `frontend/src/lib/`
2. Use TypeScript and Svelte 5 conventions
3. Import types from backend if needed
4. Test with `npm run test:frontend`

### AI Grading Modifications
1. Update prompts in `services/gemini.ts:GRADING_PROMPTS`
2. Modify grading logic in `GeminiService` class
3. Test with `POST /test-grading` endpoint
4. Update rate limiting if needed

This optimized structure enables efficient Claude Code assistance while maintaining full system context.