# Firestore Database Schema for Roo

## Collections Structure

### 1. `classrooms`
Stores Google Classroom information
```
/classrooms/{classroomId}
{
  id: string,                    // Google Classroom ID
  name: string,                  // Classroom name
  courseCode: string,            // Course code
  teacherId: string,             // Teacher's Google ID
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. `assignments`
Stores assignment details from Google Classroom
```
/assignments/{assignmentId}
{
  id: string,                    // Google Classroom assignment ID
  classroomId: string,           // Reference to classroom
  title: string,                 // Assignment title
  description: string,           // Assignment instructions
  dueDate: timestamp,            // Due date
  maxPoints: number,             // Maximum points
  gradingRubric: {               // AI grading configuration
    enabled: boolean,
    criteria: string[],          // Grading criteria
    promptTemplate: string       // Custom Gemini prompt
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3. `submissions`
Student submissions for assignments
```
/submissions/{submissionId}
{
  id: string,                    // Google Classroom submission ID
  assignmentId: string,          // Reference to assignment
  studentId: string,             // Student's Google ID
  studentEmail: string,          // Student email
  studentName: string,           // Student name
  submittedAt: timestamp,        // Submission time
  documentUrl: string,           // Google Doc URL
  status: 'pending' | 'grading' | 'graded' | 'error',
  content: string,               // Extracted document content
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. `grades`
AI-generated grades and feedback
```
/grades/{gradeId}
{
  id: string,                    // Auto-generated
  submissionId: string,          // Reference to submission
  assignmentId: string,          // Reference to assignment
  studentId: string,             // Student's Google ID
  score: number,                 // Numerical score
  maxScore: number,              // Maximum possible score
  feedback: string,              // AI-generated feedback
  gradingDetails: {              // Detailed grading breakdown
    criteria: [{
      name: string,
      score: number,
      maxScore: number,
      feedback: string
    }]
  },
  gradedBy: 'ai' | 'manual',     // Grading method
  gradedAt: timestamp,
  postedToClassroom: boolean,    // Whether grade was posted back
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 5. `users`
User profiles and settings
```
/users/{userId}
{
  id: string,                    // Google ID
  email: string,
  name: string,
  role: 'teacher' | 'student',
  classrooms: string[],          // Array of classroom IDs
  settings: {
    emailNotifications: boolean,
    autoGradeEnabled: boolean
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 6. `gradingSessions`
Batch grading session tracking
```
/gradingSessions/{sessionId}
{
  id: string,                    // Auto-generated
  assignmentId: string,          // Assignment being graded
  startedAt: timestamp,
  completedAt: timestamp,
  totalSubmissions: number,
  gradedCount: number,
  errorCount: number,
  status: 'running' | 'completed' | 'failed',
  errors: [{
    submissionId: string,
    error: string,
    timestamp: timestamp
  }]
}
```

## Indexes

1. **submissions by assignment**: `assignmentId` + `createdAt`
2. **grades by student**: `studentId` + `createdAt`
3. **pending submissions**: `status` + `createdAt`
4. **user classrooms**: `users.classrooms` (array contains)

## Security Rules (Production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Teachers can read/write their classroom data
    match /classrooms/{classroomId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.teacherId;
    }
    
    // Students can read their own submissions and grades
    match /submissions/{submissionId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.studentId ||
         request.auth.uid == get(/databases/$(database)/documents/assignments/$(resource.data.assignmentId)).data.teacherId);
    }
    
    match /grades/{gradeId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.studentId ||
         request.auth.uid == get(/databases/$(database)/documents/assignments/$(resource.data.assignmentId)).data.teacherId);
    }
  }
}
```