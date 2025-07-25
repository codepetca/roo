# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roo is a full-stack AI-powered auto-grading system for educational assignments, particularly focused on programming assignments (Karel the Dog) and quizzes. The system integrates with Google Classroom, Google Sheets, and uses Google's Gemini AI for grading.

### Technology Stack
- **Frontend**: SvelteKit with TypeScript and Svelte 5
- **Backend**: Firebase Functions with TypeScript
- **Database**: Firebase Firestore + Google Sheets integration
- **AI**: Google Gemini 1.5 Flash for grading
- **Authentication**: Firebase Auth (planned for Phase 3)
- **Styling**: TailwindCSS (when frontend is added)
- **Testing**: Vitest (frontend) + custom endpoint testing scripts (backend)

## Development Commands

### Unified Full-Stack Development
- `npm run dev` - Start both frontend and backend development servers
- `npm run build` - Build both frontend and backend for production  
- `npm run test` - Run all tests (frontend unit tests + backend endpoint tests)
- `npm run lint` - Lint both frontend and backend code
- `npm run format` - Format both frontend and backend code
- `npm run type-check` - Type check both frontend and backend
- `npm run quality:check` - Run comprehensive quality checks (lint + type-check)
- `npm run quality:complexity` - Analyze code complexity
- `npm run deploy` - Build and deploy backend functions

### Individual Component Commands
- `npm run dev:frontend` - Start only SvelteKit development server  
- `npm run dev:backend` - Start only Firebase emulators
- `npm run build:frontend` - Build only frontend
- `npm run build:backend` - Build only backend
- `npm run test:frontend` - Run only frontend tests
- `npm run test:backend` - Run only backend endpoint tests
- `npm run lint:frontend` - Lint only frontend code
- `npm run lint:backend` - Lint only backend code

### API Testing Commands
- `./test-all-endpoints.sh` - Comprehensive test of all API endpoints
- `./test-functions.sh` - Test Firebase functions specifically
- `./test-firestore.sh` - Test Firestore operations
- `./test-gemini.sh` - Test Gemini AI integration
- `./test-sheets.sh` - Test Google Sheets integration
- `./test-validation.sh` - Test data validation

### Optimized Development Workflow
1. **Start development**: `npm run dev` (starts both frontend and backend)
2. **Make changes**: Edit code with real-time feedback
3. **Quality check**: `npm run quality:check` before commits
4. **Test**: `npm run test` for comprehensive testing
5. **Deploy**: `npm run deploy` when ready

### Required Before Deployment
**CRITICAL**: 
- Firebase functions must pass TypeScript type checking: `cd functions && npm run build`
- Frontend must pass type checking and build: `npm run check && npm run build`
- All tests should pass before deploying either component

## Architecture

### Full-Stack System Flow
```
Teacher Dashboard (SvelteKit) ←→ Firebase Functions API ←→ Gemini AI
         ↓                              ↓
   Firebase Auth                  Google Sheets
         ↓                              ↓
Student Dashboard (SvelteKit)     Board Account (Apps Script)
```

### Project Structure
```
roo/
├── src/                          # SvelteKit frontend
│   ├── routes/                   # Page routes and API routes
│   │   ├── +page.svelte         # Home page
│   │   ├── teacher/             # Teacher dashboard routes
│   │   ├── student/             # Student dashboard routes
│   │   └── auth/                # Authentication routes
│   ├── lib/                     # Shared frontend code
│   │   ├── components/          # Svelte components
│   │   ├── stores/              # Svelte stores for state
│   │   ├── firebase/            # Firebase client configuration
│   │   └── types/               # Frontend TypeScript types
│   └── app.html                 # HTML template
├── functions/                   # Firebase Functions backend
│   ├── src/                     # Function source code
│   └── package.json             # Backend dependencies
├── static/                      # Static assets
├── package.json                 # Frontend dependencies
└── vite.config.ts              # Frontend build configuration
```

### Core Components

#### 1. **Frontend (SvelteKit)** (`src/`)
- **Routes**: Page routing with authentication guards
- **Components**: Reusable UI components for grading interface
- **Stores**: State management for user sessions and grading data
- **Firebase Client**: Client-side Firebase integration
- **Types**: Shared TypeScript types between frontend/backend

#### 2. **Backend (Firebase Functions)** (`functions/src/`)
- `index.ts` - Modular API router (105 lines)
- `routes/` - Focused route handlers
  - `health.ts` - Health check and API status endpoints
  - `assignments.ts` - Assignment CRUD operations
  - `grading.ts` - AI grading endpoints  
  - `sheets.ts` - Google Sheets integration endpoints
- `middleware/validation.ts` - Request validation middleware
- `services/gemini.ts` - AI grading service with rate limiting
- `services/sheets.ts` - Google Sheets integration service
- `config/firebase.ts` - Firestore configuration
- `schemas/` - Zod validation schemas
- `types/` - TypeScript type definitions

#### 3. **Data Layer**
- **Firestore**: User accounts, assignments, grades, and session data
- **Google Sheets**: Submissions data and answer keys (legacy integration)
- **Firebase Auth**: Teacher and student authentication

#### 4. **AI Grading System**
- Uses Google Gemini 1.5 Flash model
- Generous grading mode for handwritten code (missing semicolons = minor penalty)
- Support for both quiz questions and coding assignments
- Rate limiting: 15 requests per minute per assignment

### Key Endpoints

#### Grading Endpoints
- `POST /grade-quiz` - Grade complete quiz using answer keys
- `POST /grade-code` - Grade individual coding assignments with generous mode
- `POST /test-grading` - Test grading without saving (for development)

#### Data Management
- `GET /sheets/all-submissions` - Get all submissions from Google Sheets
- `GET /sheets/ungraded` - Get submissions needing grading
- `POST /sheets/answer-key` - Get answer key for specific form ID
- `GET /assignments` - List assignments from Firestore
- `POST /assignments` - Create test assignment

#### Health Checks
- `GET /` - API status and endpoint listing
- `GET /gemini/test` - Test Gemini AI connection
- `GET /sheets/test` - Test Google Sheets connection

## Development Workflow

### Frontend Development Workflow
1. **Setup Environment**: Ensure Firebase config and environment variables are set
2. **Start Development**: `npm run dev` to start SvelteKit dev server
3. **Make Changes**: Edit components in `src/lib/components/` or routes in `src/routes/`
4. **Test Locally**: Use `npm test` for unit tests, browser for integration testing
5. **Type Check**: Run `npm run check` to verify TypeScript types
6. **Build**: `npm run build` before deployment

### Backend Development Workflow  
1. **Edit Code**: TypeScript files in `functions/src/`
2. **Compile**: `cd functions && npm run build` to verify compilation
3. **Test**: Use `./test-all-endpoints.sh` to test API changes
4. **Deploy**: `cd functions && npm run deploy` if tests pass

### Full-Stack Development Workflow
1. **Start Both Services**:
   - Backend: `cd functions && npm run serve` (Firebase emulators)
   - Frontend: `npm run dev` (SvelteKit dev server)
2. **Develop**: Make changes to frontend and backend simultaneously
3. **Test Integration**: Test full user flows in browser
4. **Run All Tests**: Frontend (`npm test`) + Backend (`./test-all-endpoints.sh`)
5. **Deploy**: Build and deploy both components

### Testing Strategy
- **Frontend**: Vitest for unit tests, manual testing in browser
- **Backend**: Comprehensive test scripts before deployment
- **Integration**: Test with real submission IDs from Google Sheets
- **Monitoring**: Firebase logs during development: `cd functions && npm run logs`
- **Verification**: Ensure grades are written back to correct Google Sheets rows

### Error Handling
- All endpoints include comprehensive error handling and validation
- Rate limiting prevents API abuse
- Structured logging for debugging in production
- Graceful fallbacks for AI grading errors (partial credit)

## Firebase Integration Patterns

### Client-Side Firebase Setup
```typescript
// src/lib/firebase/client.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Configuration from environment variables
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Authentication Flow
- Use Firebase Auth for teacher/student login
- Implement role-based routing guards
- Store user sessions in Svelte stores
- Handle auth state changes reactively

### API Communication Patterns
```typescript
// Call Firebase Functions from frontend
const response = await fetch('/api/grade-quiz', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await user.getIdToken()}`
  },
  body: JSON.stringify(data)
});
```

### State Management
- Use Svelte stores for global state (user, grading sessions)
- Local component state with Svelte 5 runes (`$state`, `$derived`)
- Reactive updates for real-time grading progress
- Persistent state for teacher dashboard preferences

### Environment Variables
Frontend requires these environment variables:
```
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_STORAGE_BUCKET=
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
PUBLIC_FIREBASE_APP_ID=
```

## Data Structure

### Google Sheets Format
- **Submissions**: 17 columns including submission text, grades, quiz metadata
- **Answer Keys**: Questions with correct answers, point values, grading strictness
- **Grade Updates**: Automatically written to Current Grade (column I) and Status (column J)

### Grading Philosophy
- **Generous Mode**: For handwritten code, focus on logic over syntax
- **Partial Credit**: Always give some credit for attempts
- **Encouraging Feedback**: AI provides positive, constructive feedback
- **Flexible Scoring**: Minor syntax errors don't heavily penalize

## Frontend Development Best Practices

### Component Organization
- Keep components small and focused on single responsibilities
- Use TypeScript for all components and utilities
- Follow Svelte 5 conventions with runes for reactivity
- Implement proper loading states and error boundaries

### Testing Strategy
```bash
# Frontend testing commands
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
npm run test:ui           # Visual test runner (if configured)
```

### Code Quality Tools
```bash
npm run lint              # ESLint for code quality
npm run format            # Prettier for formatting
npm run check             # Svelte type checking
npm run check:watch       # Type checking in watch mode
```

### Development Guidelines
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Accessibility**: Use semantic HTML and ARIA labels
- **Performance**: Lazy load components and optimize bundle size
- **SEO**: Use SvelteKit's built-in meta and title handling
- **Type Safety**: Share types between frontend and backend

### Component Structure Example
```svelte
<script lang="ts">
  import type { GradingSession } from '$lib/types';
  
  interface Props {
    session: GradingSession;
    onComplete: (result: GradingResult) => void;
  }
  
  let { session, onComplete }: Props = $props();
  let isLoading = $state(false);
  let error = $state<string | null>(null);
</script>
```

## Important Constraints

### Authentication & Security
- Firebase Auth for frontend user management
- Firebase service account for Google Sheets access (backend)
- Gemini API key stored as Firebase secret
- Role-based access control (teacher/student permissions)

### Rate Limits
- Gemini AI: 15 requests per minute per assignment/quiz
- Google Sheets API: Uses default quotas with exponential backoff
- Firebase Auth: Standard rate limits apply

### Known Issues & Limitations
- Google Sheets integration is legacy (transitioning to Firestore)
- Real-time grading dashboard in development
- Student access system requires Phase 3 implementation
- Mobile optimization needed for teacher dashboard

## Future Development

The system is designed for full-stack expansion:

### Phase 2: Teacher Dashboard (SvelteKit Frontend)
- **Teacher Interface**: Real-time grading dashboard with SvelteKit
- **Manual Controls**: "Run Grading Now" button with progress tracking
- **Assignment Management**: Create and edit assignments through UI
- **Grade Review**: Visual interface for reviewing and adjusting AI grades
- **Analytics**: Grading statistics and performance metrics

### Phase 3: Student Access System
- **Student Dashboard**: SvelteKit interface with Firebase Auth
- **Grade Viewing**: Students can view grades with course passcodes
- **Submission History**: Track assignment submissions and feedback
- **Profile Management**: Student profile and preferences

### Phase 4: Advanced Features
- **Mobile Apps**: Progressive Web App (PWA) with SvelteKit
- **Real-time Collaboration**: Live grading sessions with WebSocket integration
- **Advanced Analytics**: Machine learning insights on grading patterns
- **Integration Expansion**: Additional LMS integrations beyond Google Classroom

### Technical Roadmap
- **Database Migration**: Transition from Google Sheets to Firestore
- **Performance Optimization**: Implement caching and lazy loading
- **Monitoring**: Add comprehensive logging and error tracking
- **Testing**: E2E tests with Playwright for critical user flows

See `DEVELOPMENT_PLAN.md` for detailed backend roadmap and current API status.

## Claude Code Optimization Guidelines

### File Organization for AI Efficiency
- **File Size Limits**: Keep individual files under 200 lines for optimal Claude Code processing
- **Focused Modules**: Each file should have a single responsibility  
- **Clear Naming**: Use descriptive file names that indicate purpose
- **Location Documentation**: Include location comments for function reference

### Optimized File Structure
```
functions/src/
├── routes/           # API route handlers (< 150 lines each)
│   ├── health.ts    # Health check endpoints
│   ├── assignments.ts # Assignment CRUD operations  
│   ├── grading.ts   # AI grading endpoints
│   └── sheets.ts    # Google Sheets integration
├── middleware/      # Express middleware
│   └── validation.ts # Request validation utilities
├── services/        # Business logic services
│   ├── gemini.ts    # AI grading service
│   └── sheets.ts    # Google Sheets service
├── schemas/         # Zod validation schemas
└── types/          # TypeScript type definitions
```

### Naming Conventions for Claude Code
- **Routes**: kebab-case files (e.g. `grade-submission.ts`)
- **Components**: PascalCase (e.g. `GradingDashboard.svelte`)
- **Services**: camelCase with Service suffix (e.g. `gradingService.ts`)
- **Types**: PascalCase interfaces (e.g. `GradingRequest`)

### Function Documentation Standards
```typescript
/**
 * Brief description of function purpose
 * Location: functions/src/routes/grading.ts:48
 * Dependencies: GeminiService, SheetsService
 * Rate Limit: 15 requests/minute per form
 */
export async function gradeQuizSubmission(request: QuizGradingRequest) {
  // Implementation
}
```

### Import Organization Pattern
```typescript
// 1. External libraries
import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";

// 2. Internal services  
import { createGeminiService } from "../services/gemini";

// 3. Types and schemas
import { GradingRequest } from "../types";
import { gradeSchema } from "../schemas";
```

### Quality Scripts for Claude Code
- **Quality Check**: `npm run quality:check` - Runs linting and type checking
- **Complexity**: `npm run quality:complexity` - Analyzes code complexity
- **Type Safety**: All functions must have proper TypeScript types
- **Error Handling**: Consistent error patterns with location references

### Development Workflow for Claude Code
1. **Plan with Context**: Use location comments to help Claude understand file relationships
2. **Single Purpose Files**: Keep functions focused on one responsibility
3. **Clear Error Messages**: Include file:line references in error logs
4. **Modular Architecture**: Split large files into focused modules

### AI-Friendly Patterns
- **Explicit Dependencies**: Clear import statements and dependency injection
- **Consistent Patterns**: Use established patterns for error handling and validation  
- **Self-Documenting Code**: Clear variable names and function purposes
- **Location References**: Include file:line references in documentation

## Development Principles

### Code Organization
- **Separation of Concerns**: Clear frontend/backend boundaries
- **Type Safety**: Shared TypeScript types across the stack
- **Component Reusability**: Build a component library for consistent UI
- **API Design**: RESTful endpoints with clear documentation

### Performance Considerations
- **Frontend**: Code splitting, lazy loading, optimized builds
- **Backend**: Efficient Firebase Functions with proper caching
- **Database**: Optimized Firestore queries and indexing
- **AI Integration**: Smart rate limiting and request batching