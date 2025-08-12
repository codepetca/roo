# Firebase Development Guide for Roo

This guide provides Firebase patterns and best practices specifically for the Roo project. All Firebase code must follow TypeScript best practices and Roo's architecture patterns.

## 🔧 Core Firebase Architecture

### Project Structure

```
functions/
├── src/
│   ├── config/
│   │   ├── firebase.ts          # Firebase Admin initialization
│   │   └── teachers.ts          # Teacher configuration
│   ├── services/
│   │   ├── firestore-repository.ts    # Repository pattern
│   │   ├── grade-versioning.ts        # Grade audit trails
│   │   └── snapshot-processor.ts      # Data transformation
│   ├── routes/                  # API endpoints
│   └── schemas/                 # Zod validation schemas
├── shared/                      # Shared types and schemas
└── lib/                        # Compiled JavaScript
```

## 🔥 Firebase Admin SDK Setup

### Environment-Aware Configuration

```typescript
// functions/src/config/firebase.ts
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: App;

if (getApps().length === 0) {
  app = initializeApp({
    // Service account automatically loaded from environment
    projectId: process.env.GCLOUD_PROJECT,
  });
} else {
  app = getApps()[0];
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// ✅ Environment-aware timestamp handling
export function serverTimestamp() {
  // Use FieldValue.serverTimestamp() for production
  // Use new Date() for emulator
  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
  
  if (isEmulator) {
    return new Date();
  } else {
    return require('firebase-admin/firestore').FieldValue.serverTimestamp();
  }
}
```

## 🗄️ Firestore Repository Pattern

### Base Repository Implementation

```typescript
// functions/src/services/firestore-repository.ts
import { db, serverTimestamp } from '../config/firebase.js';
import { z } from 'zod';
import type { DocumentData, QuerySnapshot, DocumentSnapshot } from 'firebase-admin/firestore';

export class FirestoreRepository<T extends { id: string }> {
  constructor(
    private collectionName: string,
    private schema: z.ZodSchema<T>
  ) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const doc = db.collection(this.collectionName).doc();
    
    const entityData = {
      ...data,
      id: doc.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Validate before saving
    const validated = this.schema.parse(entityData);
    
    await doc.set(validated);
    return validated;
  }

  async findById(id: string): Promise<T | null> {
    try {
      const doc = await db.collection(this.collectionName).doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = { ...doc.data(), id: doc.id };
      return this.schema.parse(data);
    } catch (error) {
      if (error.code === 5) { // Document not found
        return null;
      }
      throw error;
    }
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const docRef = db.collection(this.collectionName).doc(id);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await docRef.update(updateData);
    
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Document ${id} not found after update`);
    }
    
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.collection(this.collectionName).doc(id).delete();
  }

  async findMany(filters?: any[], limit = 100): Promise<T[]> {
    let query = db.collection(this.collectionName).limit(limit);
    
    // Apply filters if provided
    if (filters) {
      filters.forEach(filter => {
        query = query.where(filter.field, filter.op, filter.value);
      });
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => {
      const data = { ...doc.data(), id: doc.id };
      return this.schema.parse(data);
    });
  }

  // Batch operations for performance
  async batchCreate(items: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<T[]> {
    const batch = db.batch();
    const results: T[] = [];

    items.forEach(item => {
      const doc = db.collection(this.collectionName).doc();
      const entityData = {
        ...item,
        id: doc.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const validated = this.schema.parse(entityData);
      batch.set(doc, validated);
      results.push(validated);
    });

    await batch.commit();
    return results;
  }
}
```

### Specific Repository Implementation

```typescript
// functions/src/services/assignment-repository.ts
import { FirestoreRepository } from './firestore-repository.js';
import { AssignmentSchema } from '../../shared/schemas/core.js';
import type { Assignment } from '../../shared/schemas/core.js';

export class AssignmentRepository extends FirestoreRepository<Assignment> {
  constructor() {
    super('assignments', AssignmentSchema);
  }

  async findByClassroom(classroomId: string): Promise<Assignment[]> {
    return this.findMany([
      { field: 'classroomId', op: '==', value: classroomId }
    ]);
  }

  async findByTeacher(teacherId: string): Promise<Assignment[]> {
    return this.findMany([
      { field: 'teacherId', op: '==', value: teacherId }
    ]);
  }

  async findDueAssignments(dueDate: Date): Promise<Assignment[]> {
    return this.findMany([
      { field: 'dueDate', op: '<=', value: dueDate },
      { field: 'status', op: '==', value: 'active' }
    ]);
  }
}

export const assignmentRepository = new AssignmentRepository();
```

## 🔐 Authentication & Security

### Middleware for Authentication

```typescript
// functions/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: string;
  };
}

export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'student',
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid authentication token' });
  }
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: `Requires ${role} role` });
    }

    next();
  };
}
```

### Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Teachers can access their classrooms
    match /classrooms/{classroomId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.teacherId;
    }

    // Students can read assignments from their classrooms
    match /assignments/{assignmentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'teacher';
    }

    // Submissions belong to students or teachers
    match /submissions/{submissionId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.studentId || 
         request.auth.token.role == 'teacher');
    }

    // Grades are read-only for students, write for teachers
    match /grades/{gradeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'teacher';
    }
  }
}
```

## 📊 Data Modeling Best Practices

### Normalized Data Structure

```typescript
// shared/schemas/core.ts
import { z } from 'zod';

// Core entities with versioning
export const AssignmentSchema = z.object({
  id: z.string(),
  teacherId: z.string(),
  classroomId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  type: z.enum(['karel', 'quiz', 'essay']),
  dueDate: z.date(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  materials: z.object({
    instructions: z.string().optional(),
    files: z.array(z.string()).optional(),
    rubric: z.any().optional(),
  }),
  metadata: z.object({
    version: z.number().default(1),
    isLatest: z.boolean().default(true),
    parentId: z.string().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Assignment = z.infer<typeof AssignmentSchema>;

// Grade with audit trail
export const GradeSchema = z.object({
  id: z.string(),
  submissionId: z.string(),
  studentId: z.string(),
  assignmentId: z.string(),
  teacherId: z.string(),
  score: z.number().min(0).max(100),
  feedback: z.string().optional(),
  rubricScores: z.record(z.number()).optional(),
  gradedBy: z.enum(['teacher', 'ai', 'auto']),
  version: z.number().default(1),
  isLatest: z.boolean().default(true),
  previousVersionId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Grade = z.infer<typeof GradeSchema>;
```

## ⚡ Performance Optimization

### Efficient Querying Patterns

```typescript
// ✅ Good - Use compound indexes
async function getStudentAssignments(studentId: string, classroomId: string) {
  // Single query with compound index: (studentId, classroomId, dueDate)
  return db.collection('assignments')
    .where('classroomId', '==', classroomId)
    .where('status', '==', 'active')
    .orderBy('dueDate', 'asc')
    .limit(20)
    .get();
}

// ✅ Good - Batch reads
async function getMultipleDocuments(ids: string[]) {
  const batch = ids.map(id => 
    db.collection('assignments').doc(id).get()
  );
  
  const snapshots = await Promise.all(batch);
  return snapshots
    .filter(snap => snap.exists)
    .map(snap => ({ id: snap.id, ...snap.data() }));
}

// ✅ Good - Pagination with cursor
async function getAssignmentsPaginated(
  lastDocument?: any, 
  limit = 20
) {
  let query = db.collection('assignments')
    .orderBy('createdAt', 'desc')
    .limit(limit);

  if (lastDocument) {
    query = query.startAfter(lastDocument);
  }

  return query.get();
}

// ❌ Bad - N+1 queries
async function getStudentGradesBad(studentId: string) {
  const assignments = await db.collection('assignments').get();
  
  const grades = [];
  for (const assignment of assignments.docs) {
    // This creates N queries!
    const grade = await db.collection('grades')
      .where('studentId', '==', studentId)
      .where('assignmentId', '==', assignment.id)
      .get();
    grades.push(...grade.docs);
  }
  
  return grades;
}
```

### Batching and Transactions

```typescript
// ✅ Batch writes for multiple operations
async function createAssignmentWithSubmissions(
  assignment: Assignment,
  students: string[]
) {
  const batch = db.batch();
  
  // Create assignment
  const assignmentRef = db.collection('assignments').doc();
  batch.set(assignmentRef, assignment);
  
  // Create submission placeholders for each student
  students.forEach(studentId => {
    const submissionRef = db.collection('submissions').doc();
    batch.set(submissionRef, {
      id: submissionRef.id,
      assignmentId: assignmentRef.id,
      studentId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
  return assignmentRef.id;
}

// ✅ Transactions for consistency
async function gradeSubmission(
  submissionId: string,
  grade: Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>
) {
  return db.runTransaction(async (transaction) => {
    // Read submission
    const submissionRef = db.collection('submissions').doc(submissionId);
    const submission = await transaction.get(submissionRef);
    
    if (!submission.exists) {
      throw new Error('Submission not found');
    }
    
    // Create grade
    const gradeRef = db.collection('grades').doc();
    transaction.set(gradeRef, {
      ...grade,
      id: gradeRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // Update submission status
    transaction.update(submissionRef, {
      status: 'graded',
      gradeId: gradeRef.id,
      updatedAt: serverTimestamp(),
    });
    
    return gradeRef.id;
  });
}
```

## 🏗️ Cloud Functions Architecture

### Function Structure

```typescript
// functions/src/index.ts
import express from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

// Set global options
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 100,
});

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
import { authRoutes } from './routes/auth.js';
import { assignmentRoutes } from './routes/assignments.js';
import { gradeRoutes } from './routes/grades.js';

app.use('/auth', authRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/grades', gradeRoutes);

// Export the main function
export const api = onRequest(app);
```

### Route Implementation

```typescript
// functions/src/routes/assignments.ts
import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { assignmentRepository } from '../services/assignment-repository.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Create assignment (teachers only)
const createAssignmentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000),
    classroomId: z.string(),
    type: z.enum(['karel', 'quiz', 'essay']),
    dueDate: z.string().transform(str => new Date(str)),
    materials: z.object({
      instructions: z.string().optional(),
      files: z.array(z.string()).optional(),
    }).optional(),
  }),
});

router.post('/',
  authenticateUser,
  requireRole('teacher'),
  validateRequest(createAssignmentSchema),
  async (req, res) => {
    try {
      const assignment = await assignmentRepository.create({
        ...req.body,
        teacherId: req.user!.uid,
        status: 'draft',
        metadata: {
          version: 1,
          isLatest: true,
        },
      });

      res.status(201).json({ 
        success: true, 
        data: assignment 
      });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create assignment' 
      });
    }
  }
);

// Get assignments for classroom
router.get('/classroom/:classroomId',
  authenticateUser,
  async (req, res) => {
    try {
      const { classroomId } = req.params;
      const assignments = await assignmentRepository.findByClassroom(classroomId);

      res.json({ 
        success: true, 
        data: assignments 
      });
    } catch (error) {
      console.error('Get assignments error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch assignments' 
      });
    }
  }
);

export { router as assignmentRoutes };
```

## 🔄 Grade Versioning Service

```typescript
// functions/src/services/grade-versioning.ts
import { db, serverTimestamp } from '../config/firebase.js';
import type { Grade } from '../../shared/schemas/core.js';

export class GradeVersioningService {
  async createGrade(gradeData: Omit<Grade, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isLatest'>): Promise<Grade> {
    return db.runTransaction(async (transaction) => {
      const gradeRef = db.collection('grades').doc();
      
      const grade: Grade = {
        ...gradeData,
        id: gradeRef.id,
        version: 1,
        isLatest: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transaction.set(gradeRef, grade);
      return grade;
    });
  }

  async updateGrade(gradeId: string, updates: Partial<Grade>): Promise<Grade> {
    return db.runTransaction(async (transaction) => {
      const currentGradeRef = db.collection('grades').doc(gradeId);
      const currentGrade = await transaction.get(currentGradeRef);

      if (!currentGrade.exists) {
        throw new Error('Grade not found');
      }

      const current = currentGrade.data() as Grade;
      
      // Mark current version as not latest
      transaction.update(currentGradeRef, { isLatest: false });
      
      // Create new version
      const newGradeRef = db.collection('grades').doc();
      const newGrade: Grade = {
        ...current,
        ...updates,
        id: newGradeRef.id,
        version: current.version + 1,
        isLatest: true,
        previousVersionId: current.id,
        updatedAt: new Date(),
      };

      transaction.set(newGradeRef, newGrade);
      return newGrade;
    });
  }

  async getGradeHistory(submissionId: string): Promise<Grade[]> {
    const snapshot = await db.collection('grades')
      .where('submissionId', '==', submissionId)
      .orderBy('version', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as Grade);
  }
}

export const gradeVersioningService = new GradeVersioningService();
```

## 📱 Frontend Integration

### API Client with Type Safety

```typescript
// frontend/src/lib/api/firebase-client.ts
import { z } from 'zod';
import type { Assignment, Grade } from '@shared/types';

class FirebaseApiClient {
  private baseUrl = '/api';
  
  async createAssignment(data: CreateAssignmentData): Promise<Assignment> {
    const response = await fetch(`${this.baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create assignment');
    }

    // Validate response
    return AssignmentSchema.parse(result.data);
  }

  async getAssignments(classroomId: string): Promise<Assignment[]> {
    const response = await fetch(
      `${this.baseUrl}/assignments/classroom/${classroomId}`,
      {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      }
    );

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch assignments');
    }

    // Validate array response
    return z.array(AssignmentSchema).parse(result.data);
  }

  private async getAuthToken(): Promise<string> {
    // Get Firebase Auth token
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    return user.getIdToken();
  }
}

export const firebaseApi = new FirebaseApiClient();
```

## 🎯 Best Practices Summary

1. **Use TypeScript everywhere** - Functions, schemas, and API clients
2. **Validate at boundaries** - Use Zod schemas for all data validation
3. **Implement repository pattern** - Centralize database operations
4. **Handle timestamps correctly** - Environment-aware timestamp handling
5. **Optimize queries** - Use compound indexes and avoid N+1 queries
6. **Batch operations** - Use batch writes and transactions for consistency
7. **Version critical data** - Implement audit trails for grades and assignments
8. **Secure by default** - Write restrictive security rules
9. **Handle errors gracefully** - Proper error handling and logging
10. **Test with emulators** - Use Firebase Local Emulator Suite for development

## 📚 Related Documentation

- [Current Architecture](./development/current-architecture.md) - Overall system design
- [Coding Patterns](./development/coding-patterns.md) - General coding standards
- [Testing Strategy](../testing/testing-strategy.md) - Firebase testing patterns

---

*This guide is specific to Roo's Firebase implementation. Follow these patterns to ensure scalable, secure, and maintainable Firebase code.*