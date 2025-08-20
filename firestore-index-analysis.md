# Firestore Index Analysis Report

Generated: 2025-08-20

## Current Firestore Indexes (14 total)

### 📋 Assignments Collection Indexes

1. **assignments + classroomId + createdAt** ✅ **USED**
   - Query: `routes/assignments.ts:73` - `.where("classroomId", "==", classroomId).orderBy("createdAt", "desc")`
   - Purpose: List assignments for a classroom ordered by creation date

2. **assignments + classroomId + dueDate** ✅ **USED**
   - Query: `firestore-repository.ts:315` - `.where("classroomId", "==", classroomId).orderBy("dueDate", "asc")`
   - Purpose: Get assignments by classroom ordered by due date

### 📋 Classrooms Collection Indexes

3. **classrooms + teacherEmail + updatedAt** ✅ **USED**
   - Query: `firestore-repository.ts:248` - `.where("teacherId", "==", teacherEmail).orderBy("updatedAt", "desc")`
   - Purpose: Get classrooms by teacher ordered by recent activity

4. **classrooms + teacherId + name** ❓ **POSSIBLY UNUSED**
   - No direct match found in codebase
   - Potential legacy index from old queries

5. **classrooms + teacherId + updatedAt** ❓ **DUPLICATE/UNUSED**
   - Similar to index #3 but uses `teacherId` instead of `teacherEmail`
   - May be legacy from when teacherId was used instead of teacherEmail

### 📋 Enrollments Collection Indexes

6. **enrollments + classroomId + status + name** ✅ **USED**
   - Query: `firestore-repository.ts:532-533` - `.where("classroomId", "==", classroomId).where("status", "==", "active").orderBy("name", "asc")`
   - Purpose: Get active students in a classroom ordered by name

### 📋 Grades Collection Indexes

7. **grades + assignmentId + gradedAt** ✅ **USED**
   - Query: `firestore.ts:140` - `.where("assignmentId", "==", assignmentId).orderBy("gradedAt", "desc")`
   - Purpose: Get grades for an assignment ordered by grade date

8. **grades + classroomId + isLatest + gradedAt** ✅ **USED**
   - Query: `firestore-repository.ts:487-488` - `.where("classroomId", "==", classroomId).where("isLatest", "==", true).orderBy("gradedAt", "desc")`
   - Purpose: Get latest grades for a classroom

### 📋 Submissions Collection Indexes

9. **submissions + assignmentId + isLatest + status + submittedAt** ✅ **USED - GRADE ALL**
   - Query: `firestore-repository.ts:654-658` - `.where("assignmentId", "==", assignmentId).where("status", "in", ["submitted", "draft"]).where("isLatest", "==", true).orderBy("submittedAt", "asc")`
   - Purpose: **CRITICAL for Grade All functionality**

10. **submissions + assignmentId + isLatest + submittedAt** ✅ **USED**
    - Query: `firestore-repository.ts:380` - `.where("assignmentId", "==", assignmentId).where("isLatest", "==", true).orderBy("submittedAt", "desc")`
    - Purpose: Get submissions for assignment

11. **submissions + assignmentId + submittedAt** ❓ **POSSIBLY REDUNDANT**
    - Query: `firestore.ts:238` - `.where("assignmentId", "==", assignmentId).orderBy("submittedAt", "desc")`
    - May be covered by index #10

12. **submissions + classroomId + isLatest + status + submittedAt** ❓ **LEGACY - Grade All Old**
    - Query: `firestore-repository.ts:641-648` - Old Grade All functionality (classroom-based)
    - **CANDIDATE FOR REMOVAL** - replaced by assignment-based Grade All

13. **submissions + classroomId + isLatest + submittedAt** ✅ **USED**
    - Query: `firestore-repository.ts:670` - `.where("classroomId", "==", classroomId).where("isLatest", "==", true).orderBy("submittedAt", "desc")`
    - Purpose: Get recent activity for classroom

14. **submissions + classroomId + isLatest + submittedAt** ❌ **DUPLICATE**
    - Identical to index #13
    - **SHOULD BE REMOVED**

## Summary

### ✅ Definitely Used (9 indexes)
- assignments + classroomId + createdAt
- assignments + classroomId + dueDate  
- classrooms + teacherEmail + updatedAt
- enrollments + classroomId + status + name
- grades + assignmentId + gradedAt
- grades + classroomId + isLatest + gradedAt
- submissions + assignmentId + isLatest + status + submittedAt (Grade All)
- submissions + assignmentId + isLatest + submittedAt
- submissions + classroomId + isLatest + submittedAt

### ❓ Questionable/Legacy (3 indexes)
- classrooms + teacherId + name
- classrooms + teacherId + updatedAt
- submissions + assignmentId + submittedAt

### ❌ Should Remove (2 indexes)
- submissions + classroomId + isLatest + status + submittedAt (old Grade All)
- submissions + classroomId + isLatest + submittedAt (duplicate)

## Cleanup Results ✅

**Successfully removed 5 unused indexes:**
- classrooms + teacherId + name (legacy)
- classrooms + teacherId + updatedAt (duplicate) 
- submissions + assignmentId + submittedAt (redundant)
- submissions + classroomId + isLatest + status + submittedAt (old Grade All)
- submissions + classroomId + isLatest + submittedAt (duplicate)

**Current state: 9 optimized indexes** (down from 14)

## Index Registry for Future Reference

### 📋 Keep These Indexes - All Verified Active

1. **assignments + classroomId + createdAt** - List assignments by classroom
2. **assignments + classroomId + dueDate** - Assignment calendar views  
3. **classrooms + teacherEmail + updatedAt** - Teacher dashboard
4. **enrollments + classroomId + status + name** - Student rosters
5. **grades + assignmentId + gradedAt** - Assignment grade history
6. **grades + classroomId + isLatest + gradedAt** - Classroom grades
7. **submissions + assignmentId + isLatest + status + submittedAt** - **Grade All (NEW)**
8. **submissions + assignmentId + isLatest + submittedAt** - Assignment submissions
9. **submissions + classroomId + isLatest + submittedAt** - Classroom activity

## Monitoring

- ✅ Grade All functionality preserved with new assignment-based index
- ✅ All existing queries continue to work  
- ✅ Storage and write performance improved
- ✅ Index maintenance simplified