# Current Architecture

**Living Document** - Updated as the system evolves  
**Last Updated**: January 2025

## System Overview

Roo is a full-stack AI-powered auto-grading system with three main components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   SvelteKit     │    │ Firebase         │    │ Google Sheets   │
│   Frontend      │◄──►│ Functions        │◄──►│ Integration     │
│                 │    │ (API Layer)      │    │ (Data Source)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Firebase      │    │    Firestore     │    │   AI Grading    │
│   Auth          │    │   Database       │    │ (Gemini 1.5)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Data Flow Architecture

### 1. Assignment Creation & Management
```
Google Sheets (Source of Truth)
    ↓ (Apps Script Sync)
Firestore (Assignments Collection)
    ↓ (API Layer)
Frontend Dashboard (Teacher View)
```

### 2. Student Submissions
```
Google Forms/Sheets (Student Submissions)
    ↓ (Periodic Sync)
Firestore (Submissions Collection)
    ↓ (Grading Trigger)
AI Grading Service (Gemini 1.5 Flash)
    ↓ (Results Storage)
Firestore (Grades Collection)
    ↓ (Display/Export)
Teacher Dashboard & Google Sheets
```

## Current Component Status

### ✅ **Fully Implemented**
- **Teacher Dashboard**: Svelte 5 with authentication, assignment viewing, statistics
- **API Layer**: Firebase Functions with comprehensive validation
- **Type Safety**: Shared types, Zod schemas, bulletproof validation
- **Testing**: Comprehensive unit, integration, and E2E tests
- **Firebase Emulator**: Local development environment with test data

### 🚧 **In Development**
- **Automated Grading Pipeline**: Scheduled grading jobs
- **Assignment Grading**: Code assignment grading (quiz grading complete)
- **Real-time Updates**: Live dashboard updates

### 📋 **Planned**
- **Student Dashboard**: Student-facing assignment submission interface
- **Grade Export**: Automated grade posting to Google Classroom
- **Analytics**: Advanced grading analytics and insights

## Technology Stack Details

### Frontend (SvelteKit + Svelte 5)
```
frontend/
├── src/routes/                 # SvelteKit routing
│   ├── dashboard/             # Teacher dashboard pages
│   └── login/                 # Authentication pages
├── src/lib/
│   ├── components/            # Reusable Svelte components
│   ├── stores/               # Svelte 5 runes-based state
│   └── api.ts                # Type-safe API client
└── tests/                    # Comprehensive test suite
```

**Key Patterns**:
- Svelte 5 runes for state management (`$state`, `$derived`, `$props`)
- Server-side authentication via SvelteKit hooks
- Type-safe API integration with runtime validation

### Backend (Firebase Functions)
```
functions/src/
├── routes/                   # API endpoint handlers
│   ├── assignments.ts        # Assignment CRUD operations
│   ├── grading.ts           # AI grading endpoints
│   └── grades.ts            # Grade management
├── services/                # Business logic
│   ├── gemini.ts            # AI grading service
│   └── firestore.ts         # Database operations
├── schemas/                 # Centralized Zod validation
└── middleware/              # Request validation & error handling
```

**Key Patterns**:
- Centralized validation with Zod schemas
- Consistent error handling and API responses
- Environment-aware Firebase configuration

### Shared Types
```
shared/
├── types.ts                 # All shared type definitions
├── converters.ts            # Firebase timestamp handling
└── index.ts                 # Main exports
```

## Database Schema (Firestore)

### Collections Structure
```
assignments/                 # Assignment definitions
├── {assignmentId}
│   ├── id: string
│   ├── title: string
│   ├── isQuiz: boolean
│   ├── formId?: string     # For Google Forms quizzes
│   └── gradingRubric: object

submissions/                 # Student submissions
├── {submissionId}
│   ├── assignmentId: string
│   ├── studentId: string
│   ├── status: 'pending' | 'grading' | 'graded'
│   └── content: string

grades/                     # Grading results
├── {gradeId}
│   ├── submissionId: string
│   ├── score: number
│   ├── feedback: string
│   └── gradingDetails: object
```

## AI Grading Architecture

### Current Implementation
- **Model**: Google Gemini 1.5 Flash
- **Mode**: Generous grading (focuses on logic over syntax)
- **Rate Limiting**: 15 requests/minute per assignment
- **Fallback**: Graceful error handling with manual review flagging

### Grading Types
1. **Quiz Grading**: Answer key comparison with partial credit
2. **Code Grading**: Logic and implementation assessment (in development)

## Authentication & Security

### Current Setup
- **Frontend**: Firebase Auth with role-based access control
- **Backend**: Firebase Admin SDK for token verification
- **Roles**: Teacher/Student distinction based on email patterns
- **Route Protection**: SvelteKit hooks for server-side auth

### Security Patterns
- Server-side token validation for all protected routes
- Environment-aware configuration (development/production)
- Comprehensive input validation via Zod schemas

## Development Workflow

### Local Development
```bash
npm run dev              # Start frontend + emulators
npm run emulators:seed   # Populate test data
npm run quality:check    # Lint + type check
npm run test            # Run all tests
```

### Deployment Pipeline
```bash
npm run build           # Build all packages
npm run deploy          # Deploy to Firebase
```

## Known Issues & Technical Debt

### Current Challenges
1. **Firebase Emulator Timestamps**: serverTimestamp() behaves differently in emulators
2. **Manual Testing Scripts**: Backend still relies on shell scripts for API testing
3. **Real-time Updates**: Dashboard doesn't automatically refresh data
4. **Error Recovery**: Some API failures don't have graceful fallbacks

### Planned Improvements
1. **Automated Backend Testing**: Replace shell scripts with proper test framework
2. **Real-time Subscriptions**: Add Firestore listeners for live updates
3. **Enhanced Error Handling**: Better user feedback for API failures
4. **Performance Optimization**: Implement caching for frequently accessed data

---

**Update Triggers**: Update this document when:
- New major features are added
- Architecture patterns change
- Technology choices are modified
- Database schema evolves