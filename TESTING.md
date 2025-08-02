# Testing Guide - 90+ Comprehensive Tests

## Quick Commands

### **Essential Test Commands**
```bash
# Run all tests (frontend + backend)
npm test

# Claude-optimized test watching
npm run claude:test-watch

# Quality check with tests
npm run claude:check

# Backend tests only
npm run test:backend

# Frontend tests only  
npm run test:frontend
```

### **Development Setup**
```bash
# Start development environment
npm run claude:setup

# Standard development
npm run dev
```

## Test Architecture Overview

### **Current Test Coverage: 90+ Tests**
- **Schema Tests**: Comprehensive data validation & transformation testing
- **Firestore Tests**: Database operations with full mocking
- **Sheets Tests**: Google Sheets integration with realistic mocked responses  
- **Gemini Tests**: AI service integration with configurable mock responses
- **Service Tests**: Business logic with external service mocking

### **Test File Organization**
```
functions/src/test/
├── example.test.ts           # Basic infrastructure tests
├── schemas.test.ts           # Comprehensive schema validation  
├── factories.ts              # Reusable test data creation
├── setup.ts                  # Mock infrastructure & utilities
└── services/
    ├── firestore.test.ts     # Database operations
    ├── sheets.test.ts        # Google Sheets integration
    ├── gemini.test.ts        # AI service integration
    └── [additional services]

frontend/src/
├── [component].test.ts       # Adjacent to each component
└── lib/
    └── [module].test.ts      # Adjacent to each module
```

## Common Testing Patterns

### **Backend Testing (Vitest + Mocked Services)**

#### **Firebase Admin Mocking**
```typescript
// Always mock Firebase Admin at top of test files
vi.mock("firebase-admin", () => ({
  // Mock implementation
  getFirestore: vi.fn(),
  getAuth: vi.fn()
}));

// Use test factories for data
import { createTestAssignment, createTestSubmission } from '../factories';

test('should process assignment data', () => {
  const assignment = createTestAssignment({
    title: 'Custom Title',
    maxPoints: 100
  });
  // Test with realistic data
});
```

#### **Google Sheets API Mocking**
```typescript
vi.mock("googleapis", () => ({
  google: {
    sheets: vi.fn(() => ({
      spreadsheets: {
        values: {
          get: vi.fn(),
          update: vi.fn()
        }
      }
    })),
    auth: { GoogleAuth: vi.fn() }
  }
}));
```

#### **Gemini AI Mocking**  
```typescript
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            score: 85,
            feedback: "Good work!"
          })
        }
      })
    }))
  }))
}));
```

### **Frontend Testing (Vitest + Svelte Testing)**

#### **Component Testing**
```typescript
import { render } from 'vitest-browser-svelte';
import Button from './Button.svelte';

test('Button renders with correct variant', async () => {
  const { getByRole } = render(Button, {
    props: { 
      variant: 'primary',
      children: 'Click me' 
    }
  });
  
  expect(getByRole('button')).toHaveClass('btn-primary');
  expect(getByRole('button')).toHaveTextContent('Click me');
});
```

#### **API Client Testing**
```typescript
import { api } from '../lib/api';

// Mock fetch globally
global.fetch = vi.fn();

test('API client handles successful response', async () => {
  const mockResponse = { assignments: [] };
  
  (fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse
  });

  const result = await api.listAssignments();
  expect(result).toEqual([]);
});
```

## Test Data Factories

### **Using Test Factories** (Recommended)
```typescript
// functions/src/test/factories.ts provides:

// Domain objects
const assignment = domainFactories.assignment({ 
  maxPoints: 100,
  isQuiz: true 
});

// Sheet data  
const submission = sheetFactories.submission({
  studentName: 'John Doe',
  submissionText: 'console.log("Hello");'
});

// Complex scenarios
const testScenario = testData.createTestScenario("quiz-with-coding");
// Returns: { assignment, submissions, answerKey, expectedGrades }
```

### **Custom Test Data**
```typescript
// When factories don't fit, create focused test data
const customAssignment = {
  id: 'test-assignment-123',
  title: 'Specific Test Case',
  type: 'coding',
  maxPoints: 50,
  createdAt: new Date('2025-01-01')
};
```

## Testing Strategies by Component

### **Schema Testing**
```typescript
import { assignmentSchema } from '../schemas/domain';

test('assignment schema validates correctly', () => {
  const validData = {
    id: 'assign-123',
    title: 'Test Assignment',
    maxPoints: 100
  };
  
  const result = assignmentSchema.safeParse(validData);
  expect(result.success).toBe(true);
});

test('assignment schema rejects invalid data', () => {
  const invalidData = {
    title: '', // Invalid: empty title
    maxPoints: -10 // Invalid: negative points
  };
  
  const result = assignmentSchema.safeParse(invalidData);
  expect(result.success).toBe(false);
  expect(result.error?.errors).toHaveLength(2);
});
```

### **Service Testing**
```typescript
import { GeminiGradingService } from '../services/gemini';

test('Gemini service handles rate limiting', async () => {
  const service = new GeminiGradingService();
  
  // Mock rate limit error
  const mockError = new Error('Rate limit exceeded');
  mockError.status = 429;
  
  // Test retry logic
  const result = await service.gradeSubmission(testSubmission);
  expect(result.error).toContain('rate limit');
});
```

### **Integration Testing**
```typescript
test('full grading workflow', async () => {
  // Create realistic test scenario  
  const scenario = testData.createTestScenario("complete-quiz");
  
  // Test complete workflow
  const gradeResult = await gradeQuizSubmission({
    submissionId: scenario.submission.id,
    answerKey: scenario.answerKey
  });
  
  expect(gradeResult.totalScore).toBeGreaterThan(0);
  expect(gradeResult.feedback).toBeDefined();
});
```

## Error Testing Patterns

### **Testing Error Handling**
```typescript
test('handles missing assignment gracefully', async () => {
  // Mock database to return empty result
  mockFirestore.collection().doc().get.mockResolvedValue({
    exists: false
  });

  await expect(
    getAssignmentById('nonexistent-id')
  ).rejects.toThrow('Assignment not found');
});
```

### **Testing Validation Errors**
```typescript
test('validates required fields', () => {
  const invalidSubmission = {
    // Missing required 'content' field
    studentId: 'student-123'
  };
  
  expect(() => 
    submissionSchema.parse(invalidSubmission)
  ).toThrow('Required');
});
```

## Development Workflow

### **Test-Driven Development (TDD)**
```bash
# 1. Write failing test
npm run claude:test-watch  # Watch mode for immediate feedback

# 2. Implement feature  
# 3. See test pass
# 4. Refactor with confidence (tests ensure no breakage)
```

### **Before Committing**
```bash
# Run full quality check (includes all tests)
npm run claude:check

# If all passes, commit safely
npm run claude:commit
```

## Debugging Tests

### **Common Issues & Solutions**

#### **Mock Not Working**
```typescript
// ❌ Mock after import
import { someService } from './service';
vi.mock('./service');

// ✅ Mock before import  
vi.mock('./service');
import { someService } from './service';
```

#### **Async Test Issues**
```typescript
// ❌ Missing await
test('async operation', () => {
  expect(asyncFunction()).resolves.toBe(true);
});

// ✅ Proper async handling
test('async operation', async () => {
  await expect(asyncFunction()).resolves.toBe(true);
});
```

#### **Firebase Timestamp Issues**
```typescript
// Use test-friendly timestamps
const testTimestamp = new Date('2025-01-01T00:00:00Z');

// Or use factory defaults
const assignment = domainFactories.assignment(); // Has proper timestamps
```

## Performance Testing

### **Testing Large Data Sets**
```typescript
test('handles large submission batch', async () => {
  const largeSubmissionSet = Array.from({ length: 100 }, (_, i) => 
    sheetFactories.submission({ studentName: `Student ${i}` })
  );
  
  const startTime = Date.now();
  await processBatchSubmissions(largeSubmissionSet);
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(5000); // Under 5 seconds
});
```

## Test Maintenance Philosophy

### **Schema-Driven Testing**
- Tests automatically adapt when schemas evolve
- ~95% of tests remain stable during development
- Schema changes require minimal test updates

### **Efficient Test Updates**
- Use factories for data generation
- Mock at appropriate boundaries
- Focus on behavior, not implementation
- Maintain comprehensive coverage without brittleness

---

**Result**: Fast, reliable test suite enabling confident development and refactoring with 90+ tests ensuring system stability.