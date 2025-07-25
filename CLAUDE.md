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

### Frontend Development (SvelteKit)
- `npm run dev` - Start development server with hot reload
- `npm run build` - Production build of frontend
- `npm run preview` - Preview production build locally
- `npm test` - Run frontend unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint frontend code with ESLint
- `npm run format` - Format code with Prettier
- `npm run check` - Run Svelte type checking

### Backend Development (Firebase Functions)
- `cd functions && npm run build` - Compile TypeScript to JavaScript
- `cd functions && npm run build:watch` - Watch mode compilation 
- `cd functions && npm run serve` - Start Firebase emulators for local testing
- `cd functions && npm run deploy` - Deploy functions to Firebase (requires build first)
- `cd functions && npm run logs` - View Firebase function logs

### API Testing Commands
- `./test-all-endpoints.sh` - Comprehensive test of all API endpoints
- `./test-functions.sh` - Test Firebase functions specifically
- `./test-firestore.sh` - Test Firestore operations
- `./test-gemini.sh` - Test Gemini AI integration
- `./test-sheets.sh` - Test Google Sheets integration
- `./test-validation.sh` - Test data validation

### Full-Stack Development Workflow
1. **Start backend**: `cd functions && npm run serve` (Firebase emulators)
2. **Start frontend**: `npm run dev` (SvelteKit dev server)
3. **Run tests**: `npm test` (frontend) + `./test-all-endpoints.sh` (backend)
4. **Build**: `npm run build` (frontend) + `cd functions && npm run build` (backend)

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
- `index.ts` - Main API router with all endpoints
- `services/gemini.ts` - AI grading service with rate limiting
- `services/sheets.ts` - Google Sheets integration
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