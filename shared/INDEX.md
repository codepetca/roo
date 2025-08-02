# Shared Types & Schemas Index

## Overview

This directory contains the **single source of truth** for all data structures, validation schemas, and type definitions used across the entire Roo application.

## Core Architecture

### **Schema-First Development**
```
Google Sheets (Source) → Domain Models → DTO/API → Frontend Types
```

All data flows through comprehensive Zod validation at every boundary to ensure **bulletproof type safety**.

## Schema Files

### **Primary Schemas**
- `types.ts` (400+ lines) - **Core type definitions and shared interfaces**
  - Domain models for all business entities
  - Shared enums and constants
  - Utility types and generic interfaces

### **Validation Schemas** (`schemas/`)
- `source.ts` - Raw data validation from Google Sheets
- `domain.ts` - Business logic data models
- `dto.ts` - API request/response schemas
- `validation.ts` - Form validation schemas

### **Utility Modules**
- `converters.ts` - Firebase timestamp handling and data transformations
- `errors.ts` - Standardized error types and handling
- `constants.ts` - Application-wide constants and enums

## Key Entities

### **Educational Domain**
- `Teacher` - Teacher profiles and authentication
- `Student` - Student information and enrollment
- `Classroom` - Classroom definitions and settings
- `Assignment` - Assignment metadata and requirements
- `Submission` - Student submission data
- `Grade` - AI-generated grades and feedback

### **System Domain**
- `User` - Base user authentication and profiles
- `ApiResponse<T>` - Standardized API response wrapper
- `ValidationError` - Type-safe error handling
- `FirebaseTimestamp` - Environment-aware timestamp handling

## Type Safety Architecture

### **Comprehensive Validation**
```typescript
// Every API boundary uses Zod validation
const teacherSignupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  boardAccount: z.string().email()
});

export type TeacherSignup = z.infer<typeof teacherSignupSchema>;
```

### **Environment-Aware Types**
- Development vs Production timestamp handling
- Emulator vs Live Firebase type differences
- Test-specific type factories and mocks

### **Import Patterns**
```typescript
// Frontend imports
import type { Teacher, Classroom } from '@shared/types';

// Backend imports  
import { teacherSchema, classroomSchema } from '@shared/schemas';

// Validation
import { validateTeacherData } from '@shared/validation';
```

## Schema Transformation Flow

### **1. Google Sheets → Source Schemas**
```typescript
// Raw data from Google Forms/Sheets
const sheetRowSchema = z.object({
  studentName: z.string(),
  assignmentTitle: z.string(),
  submissionText: z.string(),
  timestamp: z.string()
});
```

### **2. Source → Domain Schemas**
```typescript
// Business logic representation
const submissionSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string(),
  assignmentId: z.string(),
  content: z.string(),
  submittedAt: z.date(),
  status: z.enum(['pending', 'grading', 'graded'])
});
```

### **3. Domain → DTO Schemas**
```typescript
// API request/response format
const gradeResponseSchema = z.object({
  submissionId: z.string(),
  score: z.number().min(0).max(100),
  feedback: z.string(),
  gradedAt: z.date().optional()
});
```

## Development Patterns

### **Adding New Types**
1. **Define domain model** in `types.ts`
2. **Create validation schema** in appropriate schema file
3. **Add to transformers** if cross-boundary conversion needed
4. **Update test factories** with new type examples

### **Schema Evolution**
- **Backward compatibility** - Add optional fields first
- **Migration support** - Version schemas when needed
- **Test coverage** - All schema changes have corresponding tests

## Testing & Validation

### **Schema Tests**
- Comprehensive validation testing for all schemas
- Edge case testing (empty, null, malformed data)
- Cross-boundary transformation testing
- Performance testing for large data sets

### **Type Factories**
```typescript
// Test data factories for consistent testing
export const testFactories = {
  teacher: (overrides?: Partial<Teacher>) => ({
    id: 'teacher-123',
    email: 'teacher@school.edu',
    name: 'Test Teacher',
    ...overrides
  }),
  
  classroom: (overrides?: Partial<Classroom>) => ({
    id: 'classroom-456',
    teacherId: 'teacher-123',
    name: 'Math 101',
    students: [],
    ...overrides
  })
};
```

## Integration Points

### **Frontend Integration**
- All API responses validated with runtime Zod checking
- Form validation uses shared schemas
- Store types derived from domain models

### **Backend Integration** 
- All route handlers validate inputs with Zod
- Database operations use typed interfaces
- External API responses validated before processing

### **Cross-Service Communication**
- Webhook payloads validated with shared schemas
- Inter-service types maintained in single location
- API versioning through schema evolution

## Quality Assurance

### **Type Safety Rules**
- **Zero `any` types** in shared definitions (enforced by linting)
- **Comprehensive validation** at all system boundaries
- **Runtime type checking** prevents type mismatches
- **Consistent error handling** across all validation points

### **Performance Considerations**
- **Lazy validation** for large data sets
- **Efficient transformers** for high-frequency operations
- **Caching** for frequently accessed schemas

## Development Commands

```bash
# Type checking for shared module
npm run type-check:shared

# Schema validation testing
npm run test:schemas

# Generate type documentation
npm run docs:types
```

## Future Enhancements

### **Planned Improvements**
1. **OpenAPI generation** from Zod schemas
2. **Automatic documentation** from TypeScript types
3. **Schema versioning** for API evolution
4. **Performance profiling** for validation overhead

### **Advanced Features**
1. **Custom validation rules** for business logic
2. **Conditional schemas** based on user roles
3. **Dynamic schema composition** for flexible APIs
4. **Real-time validation** for form interfaces