# Firebase Functions Routes Index

## Route Handlers

### **Authentication & User Management**
- `auth.ts` (11 lines) - **REFACTORED** Clean re-export from modular structure
  - **Successfully split**: auth/signup.ts + auth/session.ts + auth/passcode.ts
  - 98.5% size reduction with maintained functionality
  - User registration, authentication, session management
  - Student passcode authentication system

### **Teacher & Classroom Management**
- `teacher-onboarding.ts` (280 lines) - Teacher setup and Google Sheets integration
  - OAuth-based sheet creation with automatic permissions
  - AppScript code generation for teachers
  - Integration with Google Drive API

### **Webhook Integration**
- `webhooks.ts` (180 lines) - AppScript to Firebase data sync
  - Classroom sync webhook with API key authentication
  - Handles daily AppScript data processing
  - Secure data validation and Firestore updates

### **AI Grading System**
- `grading.ts` (220 lines) - AI-powered assignment grading
  - Gemini 1.5 Flash integration
  - Generous grading mode for programming assignments
  - Batch processing and individual submission grading

### **Core Application Routes**
- `assignments.ts` (150 lines) - Assignment CRUD operations
- `grades.ts` (130 lines) - Grade management and retrieval
- `classrooms.ts` (160 lines) - Classroom data management
- `students.ts` (140 lines) - Student roster and profile management

## Route Architecture Patterns

### **Request/Response Flow**
```
HTTP Request → Middleware (auth, validation) → Route Handler → Service Layer → Firestore
```

### **Common Patterns**
- All routes use centralized Zod validation from `../schemas/`
- Authentication via Firebase Admin SDK token verification
- Consistent error handling with typed responses
- Environment-aware configuration (dev/prod)

### **Security Layer**
- API key validation for webhook endpoints
- Firebase Auth token verification for protected routes
- Comprehensive input validation via Zod schemas
- Rate limiting and request size limits

## Service Dependencies

### **External Integrations**
- **Google APIs**: Sheets, Drive, Forms (for teacher onboarding)
- **Gemini AI**: GPT-style grading with custom prompts
- **Firebase**: Firestore, Auth, Functions runtime

### **Internal Services** (`../services/`)
- `gemini.ts` - AI grading service (needs splitting)
- `classroom-sync.ts` - Data synchronization (needs splitting)
- `sheets.ts` - Google Sheets operations
- `firestore.ts` - Database operations

## Development Commands
```bash
# Start emulators for local development
npm run emulators

# Deploy functions
npm run deploy:functions

# Test backend only
npm run test:backend

# Watch function logs
firebase functions:log --follow
```

## Optimization Results ✅

### **Completed High-Impact Improvements**  
1. **Split auth.ts** - ✅ **COMPLETED** - 760 lines → 11 lines + focused modules
2. **Enhanced file headers** - ✅ **COMPLETED** - Module metadata on split files
3. **Directory navigation** - ✅ **COMPLETED** - This INDEX.md provides instant context

### **Remaining Improvements**
1. **Add route documentation** - Enhanced headers with endpoint specifications
2. **Standardize error responses** - Consistent error handling across all routes
3. **API documentation** - OpenAPI/Swagger specifications for all endpoints

## Testing Strategy
- Each route has comprehensive test coverage in `../test/routes/`
- Uses Vitest with mocked Firebase services
- Integration tests validate full request/response cycles
- 90+ tests ensure refactoring safety