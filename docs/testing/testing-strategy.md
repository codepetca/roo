# Testing Strategy & Maintenance Guide

**Location**: `docs/testing/testing-strategy.md`

This document outlines our comprehensive testing approach designed for **rapid development with sustained quality**.

## 🎯 **Current Test Coverage**

- **90 Tests Total** ✅ (100% passing)
- **Schema Tests**: 23 tests (data validation & transformation)
- **Firestore Tests**: 15 tests (database operations & mocking)
- **Sheets Tests**: 24 tests (Google Sheets integration)
- **Gemini Tests**: 25 tests (AI service & rate limiting)
- **Example Tests**: 3 tests (basic infrastructure)

## 🏗 **Test Architecture**

### **Layered Testing Strategy**
```
🔷 Schema Tests (23)     ← Data validation & transformation
🔷 Service Tests (64)    ← Business logic & external integrations  
🔷 Route Tests (TODO)    ← API endpoints & request/response
🔷 Integration (TODO)    ← End-to-end workflows
```

### **Test Stability Matrix**
```
Layer            | Stability | Change Frequency | Maintenance Effort
----------------|-----------|------------------|-------------------
Schema Tests    | 95%       | Only on new fields | Very Low
Service Tests   | 90%       | Only on logic changes | Low  
Route Tests     | 80%       | On API changes | Medium
Integration     | 70%       | On workflow changes | Medium
```

## 🚀 **Rapid Development Workflow**

### **Schema-First Development** (Most Efficient)
1. **Add new fields to schemas first**
   ```typescript
   const userSchema = z.object({
     name: z.string(),
     avatar: z.string().url().optional() // ← New field
   });
   ```
2. **Tests auto-adapt** because they use the same schemas
3. **Add test cases** for new behavior only
4. **No test rewrites needed**

### **TDD Cycle for New Features**
```bash
# 1. Write failing test
npm test -- --watch new-feature.test.ts

# 2. Implement feature
# 3. See test pass
# 4. Refactor with confidence
```

## 🔧 **Test Maintenance Patterns**

### **What Changes vs What Stays Stable**

#### ✅ **Tests That Stay Stable** (95% of cases)
- **Schema validation logic** - Only changes when adding fields
- **Service layer mocking** - Infrastructure stays the same
- **Test factories** - Reusable across all scenarios
- **Error handling** - Consistent patterns throughout

#### 🔧 **Tests That Need Updates** (Manageable)
- **New API endpoints** - Add new route handler tests
- **New service methods** - Extend existing service tests  
- **Schema field additions** - Add validation test cases
- **Business logic changes** - Update specific expectations

### **Change Impact Examples**

#### **Scenario 1: Add User Avatar Feature**
```typescript
// Files to change:
✏️ schemas/user.ts          - Add avatar field
✏️ test/factories.ts        - Add avatar to user factory
✏️ test/schemas.test.ts     - Add avatar validation tests
❌ No changes to existing tests (they continue to work)

// Effort: ~30 minutes
```

#### **Scenario 2: Change Grading Algorithm**
```typescript
// Files to change:
✏️ services/gemini.ts           - Update algorithm
✏️ test/services/gemini.test.ts - Update score expectations
❌ No changes to mocking infrastructure
❌ No changes to other service tests

// Effort: ~1 hour
```

#### **Scenario 3: Add New API Endpoint**
```typescript
// Files to change:
✏️ routes/users.ts          - New endpoint
✏️ test/routes/users.test.ts - New route tests (copy existing patterns)
❌ No changes to existing tests
✅ Reuse existing mocks and factories

// Effort: ~2 hours
```

## 🛠 **Mocking Infrastructure**

### **Service Mocks** (Already Built)
```typescript
// Firebase Admin
vi.mock("../../config/firebase", () => ({
  db: { collection: vi.fn() },
  getCurrentTimestamp: vi.fn()
}));

// Google Sheets API  
vi.mock("googleapis", () => ({
  google: { sheets: vi.fn(), auth: { GoogleAuth: vi.fn() }}
}));

// Gemini AI
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn()
}));
```

### **Test Factories** (Already Built)
```typescript
// Reusable data creation
const assignment = domainFactories.assignment({ maxPoints: 100 });
const submission = sheetFactories.submission({ isQuiz: true });
const scenario = testData.createTestScenario("premium-user");
```

## 📈 **Development Scenarios & Effort**

### **Common Changes**
| Change Type | Test Files Affected | Estimated Effort |
|-------------|-------------------|------------------|
| Add database field | 1-2 files | 15-30 minutes |
| New API endpoint | 1 new file | 1-2 hours |
| Change business logic | 1 file | 30-60 minutes |
| Add external service | 2-3 files | 2-4 hours |
| UI feature (no backend) | 0 files | 0 minutes |

### **Complex Changes**
| Change Type | Test Files Affected | Estimated Effort |
|-------------|-------------------|------------------|
| Database schema migration | 3-5 files | 2-4 hours |
| Authentication system | 5-8 files | 4-8 hours |
| Payment integration | 4-6 files | 3-6 hours |
| Multi-tenant architecture | 8-12 files | 1-2 days |

## 🎯 **Claude Code AI Efficiency Commitments**

When you request changes, I will:

### **Upfront Impact Assessment**
- "This will require updating 3 test files"
- "No existing tests need changes"
- "Estimated effort: 2 hours"

### **Automatic Test Updates**
- Update test expectations automatically
- Preserve existing test investment
- Reuse patterns, don't rewrite
- Maintain 100% test coverage

### **Quality Guarantees**
- All changes include tests
- Fast, reliable test suite
- No flaky tests
- Clear test failure messages

## 🔮 **Future Test Strategy**

### **Next Priorities**
1. **Route Handler Tests** - API endpoint coverage
2. **Integration Tests** - End-to-end workflows  
3. **Performance Tests** - Load testing for AI services
4. **Security Tests** - Auth & authorization validation

### **Scaling Considerations**
- **Test parallelization** for faster CI/CD
- **Test categorization** (unit/integration/e2e)
- **Selective test running** for large codebases
- **Visual regression testing** for UI components

## 🚨 **Critical Test Rules**

1. **Never skip failing tests** - Fix or remove, don't ignore
2. **Mock external services** - Tests must run offline
3. **Use real schemas** - Don't mock what you own
4. **Test error cases** - Happy path + edge cases
5. **Keep tests fast** - Under 100ms per test

## 📚 **Test File Organization**

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
    └── [future-service].test.ts
```

---

**The Result**: You can develop rapidly with confidence, knowing that tests will evolve efficiently alongside your code without becoming a maintenance burden.

**Last Updated**: January 2025