# DataConnect-Ready Schema Architecture

**Created**: January 2025  
**Purpose**: Comprehensive guide to the new normalized entity system designed for future Firebase DataConnect migration

## Quick Reference for Claude Code

### **Core Files & Locations**
- **Schemas**: `shared/schemas/core.ts` - All normalized entities with versioning
- **Transformers**: `shared/schemas/transformers.ts` - Snapshot → Core conversion
- **Repository**: `functions/src/services/firestore-repository.ts` - CRUD operations
- **Grade Versioning**: `functions/src/services/grade-versioning.ts` - Grade history management
- **Processor**: `functions/src/services/snapshot-processor.ts` - Orchestrates transformation

### **Key Entity Types**
```typescript
// From shared/schemas/core.ts
Teacher, Classroom, Assignment, Submission, Grade, StudentEnrollment
TeacherInput, ClassroomInput, AssignmentInput, SubmissionInput, GradeInput
```

### **Critical Versioning Fields**
All entities have: `id`, `version`, `isLatest`, `previousVersionId?`, `createdAt`, `updatedAt`

---

## Architecture Overview

### **Problem Solved**
- **Before**: Classroom snapshots from Google/AppScript were ephemeral - grades could be lost on updates
- **After**: Normalized entity system with version control preserves all graded work across snapshot updates

### **Core Principle: Stable IDs**
```typescript
// StableIdGenerator ensures consistent IDs across updates
classroom_12345
classroom_12345_assignment_67890  
classroom_12345_assignment_67890_student_john_at_school_edu
```

## Entity Relationships (DataConnect-Style)

```
Teacher (1) ← → (n) Classroom
Classroom (1) ← → (n) Assignment
Classroom (1) ← → (n) StudentEnrollment
Assignment (1) ← → (n) Submission
Submission (1) ← → (n) Grade (versioned history)
```

### **Denormalized Performance Fields**
```typescript
// Classroom entity caches counts for fast dashboard queries
studentCount: number;
assignmentCount: number; 
ungradedSubmissions: number;

// StudentEnrollment caches performance metrics
submissionCount: number;
averageGrade?: number;
```

## Grade Versioning System

### **Version Control Rules**
1. **Manual grades are LOCKED** - never overwritten by AI
2. **AI grades can be updated** - new versions created when content changes
3. **Only one `isLatest: true`** per student-assignment pair
4. **Complete audit trail** - all grade history preserved

### **Conflict Resolution Logic**
```typescript
// GradeVersioningService.resolveGradeConflict()
if (existingGrade.isLocked) return 'keep_existing';
if (existingGrade.gradedBy === 'manual' && newGrade.gradedBy === 'ai') return 'keep_existing';
if (gradesIdentical) return 'keep_existing';
return 'create_version';
```

## Transformation Pipeline

### **Snapshot Processing Flow**
```typescript
1. snapshotToCore(ClassroomSnapshot) 
   → { teacher, classrooms, assignments, submissions, enrollments }

2. mergeSnapshotWithExisting(transformed, existing)
   → { toCreate, toUpdate, toArchive }

3. SnapshotProcessor.processSnapshot()
   → Batch operations preserving grades
```

### **Key Transformation Rules**
- **Submissions**: Content changes create new versions, metadata updates modify existing
- **Grades**: Never overwrite existing grades - use GradeVersioningService
- **Enrollments**: Archive students no longer in snapshots
- **Assignments**: Update safely - grades reference by stable ID

## Services Architecture

### **FirestoreRepository** 
- All CRUD operations using Firebase Admin SDK
- Batch operations for efficiency
- Complex queries with proper indexing
- Transaction support for consistency

### **GradeVersioningService**
- Grade history management
- Conflict resolution
- Grade locking/unlocking
- Rollback capabilities
- Classroom statistics

### **SnapshotProcessor**
- Orchestrates entire pipeline
- Error handling and reporting
- Performance metrics tracking
- Denormalized count updates

## Usage Patterns for Claude Code

### **Creating New Entities**
```typescript
// Always use Input types for creation
const repository = new FirestoreRepository();
await repository.createClassroom(classroomInput);
```

### **Handling Grades**
```typescript
// Use GradeVersioningService for all grade operations
const gradeService = new GradeVersioningService();
await gradeService.createGradeVersion(gradeInput, submission, reason);
```

### **Processing Snapshots**
```typescript
// Use SnapshotProcessor for all snapshot transformations
const processor = new SnapshotProcessor();
const result = await processor.processSnapshot(classroomSnapshot);
```

## Future DataConnect Migration

When Firebase DataConnect becomes available:

1. **Schema Definition**: Convert Zod schemas to DataConnect SQL schema
2. **Repository Layer**: Replace FirestoreRepository with DataConnect queries
3. **Business Logic**: No changes needed - same entities and relationships
4. **Frontend**: No changes needed - same types and API contracts

## Testing Strategy

### **Key Test Files to Create**
- `shared/schemas/transformers.test.ts` - Transformation logic
- `functions/src/services/grade-versioning.test.ts` - Grade scenarios
- `functions/src/services/snapshot-processor.test.ts` - End-to-end pipeline

### **Critical Test Scenarios**
1. **Grade Preservation**: Manual grades survive snapshot updates
2. **Version Creation**: Content changes trigger new submission versions
3. **Conflict Resolution**: Manual vs AI grade conflicts handled correctly
4. **Stable IDs**: Consistent entity identification across updates
5. **Batch Operations**: Large snapshot processing performance

---

**For Claude Code**: This architecture ensures graded work is never lost while providing a clean migration path to Firebase DataConnect. All entity operations should go through the repository and grade versioning services.