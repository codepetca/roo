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

### **Complete System Flow**
```
Board Forms → Personal Google Sheets → AppScript (nightly) → Firebase → Frontend View
```

### **1. Teacher Onboarding & Setup**
```
Teacher Signup (OAuth)
    ↓
Google Sheet Creation (_roo_data)
    ↓ (Auto-share with service accounts)
AppScript Code Generation
    ↓
Teacher Board Account Setup
```

### **2. Daily Data Collection & Processing**
```
Google Forms (Student Submissions)
    ↓ (Board account collection)
AppScript Nightly Processing
    ↓ (Consolidate classroom data)
Personal Google Sheets (_roo_data)
    ↓ (Webhook with API auth)
Firebase Functions (Data Sync)
```

### **3. AI Grading & Storage**
```
Firestore (Submissions Collection)
    ↓ (AI processing trigger)
Gemini 1.5 Flash (Generous grading)
    ↓ (Results storage)
Firestore (Grades & Feedback)
    ↓ (Display only - no write-back)
Teacher & Student Dashboards
```

## Current Component Status

### ✅ **Fully Implemented**

**Core Infrastructure:**
- **Teacher Onboarding**: OAuth-based Google Sheet creation with automatic permissions
- **AppScript Integration**: Daily automated data extraction and webhook sync
- **Firebase Functions**: Secure API endpoints with comprehensive error handling
- **AI Grading Service**: Gemini 1.5 Flash with generous grading for programming
- **Type Safety**: Comprehensive Zod validation and shared type system
- **Testing**: 90+ tests covering all services and business logic

**Key Services:**
- **Classroom Sync**: Webhook-based data synchronization from AppScript
- **Student Management**: Firestore-based tracking with roster updates
- **Authentication**: Firebase Auth integration for teachers and students
- **Database**: Firestore collections for classrooms, students, submissions, grades

### 🚧 **In Development**

**Frontend Interfaces:**
- **Teacher Dashboard**: Basic structure exists, needs full submission management
- **Student Portal**: Authentication working, needs grade/feedback display
- **Manual Grading**: Infrastructure ready, needs user interface

**Automation:**
- **Nightly Scheduling**: AppScript automation needs production scheduling setup
- **Error Monitoring**: Basic logging exists, needs comprehensive alerting

### 📋 **Planned Development**

**Phase 1 - Teacher Frontend:**
- Student submission summaries and status tracking
- Manual AI grading interface and grade override capabilities  
- Analytics dashboard with class performance metrics

**Phase 2 - Student Frontend:**
- Grade viewing with detailed AI feedback display
- Progress tracking and assignment history
- Interactive feedback features

**Phase 3 - Production Hardening:**
- Robust nightly processing with error recovery
- Advanced student management (dropped/transferred handling)
- Performance optimization and monitoring

## Technology Stack Details

### **Frontend (SvelteKit + Svelte 5)**
- **Framework**: SvelteKit 2.x with Svelte 5 runes (`$state`, `$derived`, `$props`)
- **Styling**: TailwindCSS for consistent design system
- **Type Safety**: TypeScript with strict mode + shared types from `@shared/types`
- **API Client**: Runtime validation of all responses using Zod schemas
- **Authentication**: Firebase Auth integration with SvelteKit hooks

### **Backend (Firebase Functions)**
- **Runtime**: Node.js with TypeScript compilation
- **Validation**: Centralized Zod schemas for all API boundaries
- **Database**: Firestore with comprehensive error handling
- **AI Service**: Google Gemini 1.5 Flash for generous grading
- **Testing**: 90+ Vitest tests with mocked external services

### **AppScript Integration**
- **Location**: Runs in teacher's board account (institutional Google account)
- **Frequency**: Nightly automated processing (needs production scheduling)
- **Purpose**: Extract Google Forms data and sync to personal sheets
- **Security**: Webhook authentication with API keys
- **Data Flow**: One-way from forms → sheets → Firebase (no write-back)

## Database Schema (Firestore)

### **Primary Collections**
- **`teachers/`**: Teacher profiles, OAuth tokens, sheet configurations
- **`classrooms/`**: Classroom definitions synced from Google Sheets
- **`students/`**: Student roster with status tracking (active/dropped/not-submitted)
- **`assignments/`**: Assignment metadata from Google Forms
- **`submissions/`**: Student submission data from forms
- **`grades/`**: AI-generated grades and feedback (no write-back to sheets)

### **Key Schema Patterns**
- **Comprehensive Zod Validation**: All data validated at API boundaries
- **Shared Types**: Single source of truth in `shared/types.ts`
- **Timestamp Handling**: Environment-aware converters for emulator vs production
- **Error Resilience**: Graceful handling of missing documents and malformed data

## Security Architecture

### **Authentication Flow**
- **Teachers**: Google OAuth during onboarding, Firebase Auth tokens
- **Students**: Firebase Auth with email/password (planned)
- **API Protection**: All endpoints validate Firebase Auth tokens
- **Role-Based Access**: Teacher/student permissions via Firestore security rules

### **Data Security**
- **Webhook Authentication**: API key validation for AppScript sync
- **Service Account Permissions**: Limited to specific Google Sheets only
- **Input Validation**: Comprehensive Zod schemas prevent malicious data
- **Environment Isolation**: Separate dev/prod configurations

## Development Workflow

### **Quality Gates (All Must Pass Before Commits)**
```bash
npm run test             # 90+ comprehensive tests
npm run quality:check    # ESLint + TypeScript validation  
npm run build           # Full compilation check
```

### **Local Development Environment**
```bash
npm run emulators       # Firebase emulators with data persistence
npm run dev            # Frontend + emulators (separate terminal)
```

### **Test-Driven Development**
- **Red-Green-Refactor**: All new features start with failing tests
- **Schema-First**: Zod validation drives API design
- **Mocked Services**: Firebase, Google Sheets, and Gemini all mocked for testing

---

**Last Updated**: January 2025 - Update when core architecture changes