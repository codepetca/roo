# Coding Patterns & Implementation Guidelines

**Living Document** - Updated as patterns evolve  
**Last Updated**: January 2025

## Svelte 5 Patterns (Frontend)

### State Management with Runes
```typescript
// ✅ Correct Svelte 5 pattern
let assignments = $state<Assignment[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);

// Derived values
let totalAssignments = $derived(assignments.length);
let quizCount = $derived(assignments.filter(a => a.isQuiz).length);

// Props
interface Props {
  assignment: Assignment;
}
let { assignment }: Props = $props();
```

### Component Structure
```svelte
<script lang="ts">
  import type { Assignment } from '@shared/types';
  import { api } from '$lib/api';
  
  // Props first
  interface Props { /* ... */ }
  let { assignment }: Props = $props();
  
  // State
  let loading = $state(false);
  
  // Derived values
  let isCompleted = $derived(assignment.status === 'completed');
  
  // Functions
  async function handleSubmit() {
    // Implementation
  }
</script>

<!-- Template with proper event handling -->
<form onsubmit={handleSubmit}>
  <!-- Svelte 5 event syntax -->
</form>
```

### Event Handling (Svelte 5)
```svelte
<!-- ✅ Correct Svelte 5 syntax -->
<button onclick={handleClick}>Click me</button>
<input onkeydown={handleKeydown} />
<form onsubmit={handleSubmit}>

<!-- ❌ Avoid Svelte 4 syntax -->
<button on:click={handleClick}>
<input on:keydown={handleKeydown} />
```

## API Client Patterns

### Type-Safe API Calls
```typescript
// Type-safe API request
async function loadAssignments(): Promise<Assignment[]> {
  try {
    const response = await api.listAssignments();
    return response; // Already typed and validated
  } catch (error) {
    throw new Error(`Failed to load assignments: ${error.message}`);
  }
}

// With proper error handling
async function handleApiCall<T>(apiCall: () => Promise<T>): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
}
```

### API Client Implementation
```typescript
// Location: frontend/src/lib/api.ts
export async function typedApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await apiRequest<ApiResponse<T>>(endpoint, options);
  
  if (!response.success && response.error) {
    throw new Error(response.error);
  }
  
  return response;
}
```

## Backend Patterns (Firebase Functions)

### Route Handler Structure
```typescript
// Location: functions/src/routes/example.ts
import { validateData, sendApiResponse, handleRouteError } from '../middleware/validation';
import { exampleSchema } from '../schemas';

export async function exampleEndpoint(req: Request, res: Response) {
  try {
    const data = validateData(exampleSchema, req.body);
    
    // Business logic
    const result = await processData(data);
    
    sendApiResponse(res, result);
  } catch (error) {
    handleRouteError(error, req, res);
  }
}
```

### Zod Schema Patterns
```typescript
// Location: functions/src/schemas/index.ts
export const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  maxPoints: z.number().positive(),
  dueDate: z.number(), // Unix timestamp
  isQuiz: z.boolean().default(false),
  formId: z.string().optional(),
});

export type CreateAssignmentRequest = z.infer<typeof createAssignmentSchema>;
```

### Firebase Service Patterns
```typescript
// Location: functions/src/services/firestore.ts
export class FirestoreService {
  private db = admin.firestore();
  
  async createDocument<T>(
    collection: string, 
    data: T, 
    docId?: string
  ): Promise<string> {
    const docRef = docId 
      ? this.db.collection(collection).doc(docId)
      : this.db.collection(collection).doc();
      
    await docRef.set({
      ...data,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    });
    
    return docRef.id;
  }
}
```

## Type Safety Patterns

### Shared Types Usage
```typescript
// ✅ Correct import in frontend
import type { Assignment, Submission, Grade } from '@shared/types';

// ✅ Correct usage in functions
import { Assignment, CreateAssignmentRequest } from '../schemas';
```

### Timestamp Handling
```typescript
// Environment-aware timestamp handling
function getCurrentTimestamp(): any {
  if (isEmulator()) {
    return new Date(); // Direct timestamp in emulator
  }
  return admin.firestore.FieldValue.serverTimestamp(); // Server timestamp in production
}

// Safe document conversion
function sanitizeDocument<T>(doc: FirebaseFirestore.DocumentSnapshot): T | null {
  if (!doc.exists) return null;
  
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    // Convert timestamps for frontend consumption
  } as T;
}
```

## Authentication Patterns

### SvelteKit Auth Hooks
```typescript
// Location: frontend/src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth-token');
  
  if (token) {
    try {
      const user = await verifyToken(token);
      event.locals.user = {
        uid: user.uid,
        email: user.email,
        role: determineRole(user.email),
      };
    } catch (error) {
      // Clear invalid token
      event.cookies.delete('auth-token');
    }
  }
  
  // Protect dashboard routes
  if (event.url.pathname.startsWith('/dashboard') && !event.locals.user) {
    throw redirect(302, `/login?redirect=${encodeURIComponent(event.url.pathname)}`);
  }
  
  return resolve(event);
};
```

### Frontend Auth Store
```typescript
// Location: frontend/src/lib/stores/auth.ts
let user = $state<AuthUser | null>(null);
let loading = $state(true);
let error = $state<string | null>(null);

export const auth = {
  get user() { return user; },
  get loading() { return loading; },
  get error() { return error; },
  
  async signIn(email: string, password: string) {
    loading = true;
    error = null;
    
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const token = await credential.user.getIdToken();
      
      // Set HTTP-only cookie
      document.cookie = `auth-token=${token}; path=/; max-age=3600`;
      
      user = {
        uid: credential.user.uid,
        email: credential.user.email!,
        role: determineRole(credential.user.email!),
      };
      
      goto('/dashboard');
    } catch (err: any) {
      error = err.message;
      throw err;
    } finally {
      loading = false;
    }
  },
};
```

## Testing Patterns

### Unit Test Structure
```typescript
// Vitest test pattern
describe('Component/Service Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Feature Group', () => {
    it('should behave as expected', async () => {
      // Arrange
      const mockData = createMockData();
      
      // Act
      const result = await functionUnderTest(mockData);
      
      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
```

### Firebase Service Testing
```typescript
// Mock Firebase Admin
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockFirestore,
}));

// Test with proper mocking
it('should handle Firestore operations', async () => {
  const service = new FirestoreService();
  const result = await service.createDocument('test', mockData);
  
  expect(mockFirestore.collection).toHaveBeenCalledWith('test');
  expect(result).toBeDefined();
});
```

## Error Handling Patterns

### API Error Responses
```typescript
// Standard error response format
export function handleRouteError(error: any, req: Request, res: Response) {
  console.error(`API Error [${req.method} ${req.path}]:`, error);
  
  if (error instanceof ZodError) {
    return sendApiResponse(res, null, 'Validation failed', 400);
  }
  
  const message = error.message || 'Internal server error';
  const statusCode = error.statusCode || 500;
  
  sendApiResponse(res, null, message, statusCode);
}
```

### Frontend Error Handling
```typescript
// Component error boundaries
let error = $state<string | null>(null);

async function handleAsyncOperation() {
  try {
    error = null;
    const result = await api.someOperation();
    // Handle success
  } catch (err: any) {
    error = err.message || 'An error occurred';
    console.error('Operation failed:', err);
  }
}
```

## File Organization Guidelines

### Directory Structure
```
component-name/
├── ComponentName.svelte           # Main component
├── ComponentName.svelte.test.ts   # Component tests
├── types.ts                       # Component-specific types
└── utils.ts                       # Component utilities
```

### Import Organization
```typescript
// 1. External libraries
import { onMount } from 'svelte';
import { z } from 'zod';

// 2. Internal services and utilities
import { api } from '$lib/api';
import { auth } from '$lib/stores/auth';

// 3. Types
import type { Assignment } from '@shared/types';
```

## Performance Patterns

### Reactive Optimizations
```typescript
// Efficient derived values
let filteredAssignments = $derived(() => {
  if (!searchTerm) return assignments;
  return assignments.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
});

// Avoid unnecessary reactivity
let expensiveComputation = $derived(() => {
  // Only recompute when necessary dependencies change
  return computeExpensiveValue(relevantData);
});
```

### API Caching
```typescript
// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();

async function cachedApiCall<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  const isValid = cached && (Date.now() - cached.timestamp < 5 * 60 * 1000); // 5 min cache
  
  if (isValid) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

---

**Update Triggers**: Update this document when:
- New patterns are established
- Best practices evolve
- Framework updates require pattern changes
- Team identifies better approaches