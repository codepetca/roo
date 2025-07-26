# CLAUDE.md

This file provides core guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Roo**: Full-stack AI-powered auto-grading system for educational assignments
- **Focus**: Programming assignments (Karel the Dog) and quizzes
- **AI**: Google Gemini 1.5 Flash with generous grading for handwritten code
- **Stack**: SvelteKit + **Svelte 5** frontend + Firebase Functions backend + Google Sheets integration

🚨 **MANDATORY**: Use Svelte 5 runes (`$state`, `$derived`, `$props`) - NOT Svelte 4 patterns!

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
- **Database**: Firestore + Google Sheets (legacy)
- **AI**: Google Gemini 1.5 Flash
- **Testing**: Vitest (frontend) + endpoint scripts (backend)
- **Type Safety**: Comprehensive Zod validation + shared types + TypeScript strict mode

## File Organization Principles

- **File Size**: Keep files under 200 lines for optimal Claude processing
- **Location Comments**: Include `Location: file:line` in function docs
- **Shared Types**: Import via `@shared/types` in frontend
- **Naming**: Use kebab-case for routes, PascalCase for components

## 🎯 **BULLETPROOF TYPE SAFETY ARCHITECTURE**

This project implements **comprehensive type safety** at every layer:

1. **Shared Types Package** (`shared/`): Single source of truth for all data structures
2. **Centralized Zod Validation** (`functions/src/schemas/`): All API schemas in one place
3. **Type-Safe Frontend API Client** (`frontend/src/lib/api.ts`): Runtime validation of responses
4. **Firebase Timestamp Handling**: Environment-aware converters

### Type Safety Rules (MANDATORY)
🚨 **NEVER use `any` or `unknown` types** - Always define proper interfaces
🚨 **ALWAYS validate API inputs** - Use centralized Zod schemas  
🚨 **ALWAYS use shared types** - Import from `@shared/types` in frontend
🚨 **ALWAYS handle timestamps properly** - Use `getCurrentTimestamp()` and converters

## Firebase Emulator Development

The project uses Firebase Local Emulator Suite for safe local development.

#### Emulator Services
- **Auth**: http://localhost:9099 (mock authentication)
- **Firestore**: http://localhost:8080 (local database)
- **Functions**: http://localhost:5001 (API endpoints)
- **Emulator UI**: http://localhost:4000 (visual debugging)

#### Test Credentials (after seeding)
- Teacher: `teacher@test.com` / `test123`
- Student 1: `student1@test.com` / `test123`
- Student 2: `student2@test.com` / `test123`

#### Critical Firebase Development Patterns
**🚨 IMPORTANT: serverTimestamp() Issues in Emulators**
- Always use environment-aware timestamp handling
- Import Firebase Admin directly, avoid re-exports
- Build after TypeScript changes (`npm run build`)
- Handle missing documents gracefully (check `error.code === 5`)

## Detailed Guidance

For evolving patterns, detailed architecture, and implementation guides, see:
- `docs/development/current-architecture.md` - Living system design
- `docs/development/coding-patterns.md` - Detailed implementation patterns
- `docs/development/ai-collaboration-guide.md` - How to work with Claude Code effectively

## Quality Gates

**Before any commit**:
- ✅ `npm run quality:check` passes (lint + type check)
- ✅ All validation schemas are centralized
- ✅ All API responses use proper error handling
- ✅ No secrets in code

---

**Last Updated**: January 2025 - Update only when core architecture changes.