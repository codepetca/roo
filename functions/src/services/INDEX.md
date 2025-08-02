# Firebase Functions Services Index

## Core Services

### **AI & Grading Services**
- `gemini.ts` (402 lines) - **OVERSIZED** Gemini 1.5 Flash integration
  - *Needs splitting*: client.ts + grading.ts + prompts.ts
  - Generous grading mode for programming assignments
  - Rate limiting and error handling
  - Custom prompt engineering for educational context

### **Data Synchronization**
- `classroom-sync.ts` (474 lines) - **OVERSIZED** AppScript to Firestore sync
  - *Needs splitting*: parser.ts + validator.ts + sync.ts
  - Google Sheets data processing and validation
  - Student roster management with status tracking
  - Batch processing of assignment submissions

### **Google APIs Integration**
- `sheets.ts` (280 lines) - Google Sheets operations
  - Service account authentication
  - Sheet creation, sharing, and data extraction
  - Support for teacher onboarding flow
  
- `base-sheet-service.ts` (320 lines) - Base class for sheet operations
  - OAuth and service account authentication patterns
  - Drive API integration for permissions
  - Reusable sheet manipulation methods

### **Database Operations**
- `firestore.ts` (180 lines) - Firestore database operations
  - Typed database operations with Zod validation
  - Environment-aware timestamp handling
  - Batch operations and transaction support

### **Authentication Services**
- `auth-service.ts` (160 lines) - Authentication business logic
  - Firebase Auth integration
  - Role-based access control
  - Teacher/student authentication flows

### **Template & Code Generation**
- `sheet-template.ts` (250 lines) - Google Sheets template generation
  - AppScript code generation for teachers
  - Template creation for classroom data structures
  - Dynamic configuration based on teacher requirements

## Service Architecture Patterns

### **Dependency Injection**
```
Routes → Services → External APIs (Firebase, Google, Gemini)
```

### **Common Patterns**
- All services use comprehensive error handling
- Environment-aware configuration (dev/prod/emulator)
- Extensive logging for debugging and monitoring
- Zod validation at service boundaries

### **External Service Mocking**
- Firebase Admin SDK mocked in tests
- Google APIs mocked with realistic responses
- Gemini AI mocked with configurable responses
- 90+ tests ensure service reliability

## Service Dependencies

### **External APIs**
- **Firebase**: Firestore, Auth, Admin SDK
- **Google APIs**: Sheets v4, Drive v3, Forms v1
- **Gemini AI**: GenerativeAI client with custom models

### **Internal Dependencies**
- `../schemas/` - Centralized Zod validation
- `../config/` - Environment configuration
- `@shared/types` - Shared TypeScript types

## Service Interaction Patterns

### **AI Grading Flow**
```
Route → Gemini Service → External AI API → Validation → Firestore Service → Database
```

### **Data Sync Flow**  
```
Webhook → Classroom Sync → Sheets Service → Google API → Firestore Service → Database
```

### **Teacher Onboarding Flow**
```
Route → Sheet Template → Base Sheet Service → Google APIs → Auth Service → Firestore
```

## Development & Testing

### **Service Testing Strategy**
- Each service has dedicated test file in `../test/services/`
- Comprehensive mocking of external dependencies
- Test factories for realistic data generation
- Integration tests for service interactions

### **Local Development**
```bash
# Run with emulators
npm run emulators

# Test services only
npm run test:services

# Watch service tests during development
npm run test:services -- --watch
```

## Critical Refactoring Priorities

### **Immediate (Week 1)**
1. **Split gemini.ts** (402 lines)
   - `ai/gemini-client.ts` - API client and authentication
   - `ai/grading-service.ts` - Grading logic and validation
   - `ai/prompt-templates.ts` - Prompt engineering and templates

2. **Split classroom-sync.ts** (474 lines)
   - `sync/sheet-parser.ts` - Google Sheets data parsing
   - `sync/data-validator.ts` - Data validation and transformation
   - `sync/firestore-sync.ts` - Database synchronization logic

### **High Priority (Week 2)**
3. **Add service documentation** - Enhanced headers with interface specifications
4. **Standardize error handling** - Consistent error classes across services
5. **Add service interaction diagrams** - Visual representation of data flows

## Performance Considerations
- **Rate Limiting**: All external APIs respect rate limits
- **Batch Operations**: Firestore operations use batching where possible
- **Caching**: Service responses cached appropriately
- **Memory Management**: Large data processing handled in chunks

## Security Patterns
- **Input Validation**: All service inputs validated with Zod
- **Authentication**: Proper token verification for protected operations
- **Authorization**: Role-based access control at service level
- **Data Sanitization**: All external data sanitized before storage