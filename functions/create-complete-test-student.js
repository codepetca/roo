/**
 * Complete Test Student Setup Script
 * 
 * Creates a fully functional test student with dashboard data:
 * - Email: student@schoolemail.com
 * - Passcode: 12345
 * - Complete classroom with assignments, submissions, and grades
 * 
 * Usage:
 *   cd functions
 *   node create-complete-test-student.js
 * 
 * Note: Uses regular data structures (no special test flags) for easy cleanup
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for local emulator
admin.initializeApp({
  projectId: 'roo-app-3d24e'
});

// Connect to emulator
const firestore = admin.firestore();
const auth = admin.auth();

// Check if we're running against emulator or production
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST || process.env.FUNCTIONS_EMULATOR;
if (isEmulator) {
  console.log('🔧 Using Firebase emulator');
  firestore.settings({
    host: 'localhost:8080',
    ssl: false
  });
} else {
  console.log('🌐 Using production Firebase');
}

async function createCompleteTestStudent() {
  try {
    console.log('🚀 Creating complete test student setup...\n');

    // Generate stable IDs for our test entities
    const teacherUid = 'test_teacher_uid';
    const studentUid = 'test_student_uid';
    const classroomId = 'test_classroom_001';
    const now = new Date();

    console.log('📝 Step 1: Creating test teacher...');
    
    // 1. Create test teacher user
    const teacherData = {
      id: teacherUid,
      email: 'teacher@test.com',
      displayName: 'Test Teacher',
      name: 'Test Teacher', 
      role: 'teacher',
      schoolEmail: 'teacher@test.com',
      classroomIds: [classroomId],
      totalStudents: 1,
      totalClassrooms: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await firestore.collection('users').doc(teacherUid).set(teacherData);
    console.log('✅ Created test teacher account');

    // Create Firebase Auth user for teacher if needed
    try {
      await auth.createUser({
        uid: teacherUid,
        email: 'teacher@test.com',
        displayName: 'Test Teacher',
        emailVerified: true
      });
      await auth.setCustomUserClaims(teacherUid, { role: 'teacher' });
      console.log('✅ Created Firebase Auth for teacher');
    } catch (authError) {
      if (authError.code === 'auth/uid-already-exists') {
        console.log('⚠️  Teacher Firebase Auth already exists');
      } else {
        console.log('⚠️  Teacher Auth creation failed:', authError.message);
      }
    }

    console.log('\n👤 Step 2: Creating test student...');

    // 2. Create test student user with fixed passcode
    const studentData = {
      id: studentUid,
      email: 'student@schoolemail.com',
      displayName: 'Test Student',
      name: 'Test Student',
      role: 'student',
      passcode: {
        value: '12345',
        createdAt: now,
        lastRequestedAt: now,
        attempts: 0
      },
      classroomIds: [classroomId],
      totalStudents: 0,
      totalClassrooms: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    await firestore.collection('users').doc(studentUid).set(studentData);
    console.log('✅ Created test student account with passcode "12345"');

    // Create Firebase Auth user for student if needed
    try {
      await auth.createUser({
        uid: studentUid,
        email: 'student@schoolemail.com',
        displayName: 'Test Student',
        emailVerified: true
      });
      await auth.setCustomUserClaims(studentUid, { role: 'student' });
      console.log('✅ Created Firebase Auth for student');
    } catch (authError) {
      if (authError.code === 'auth/uid-already-exists') {
        console.log('⚠️  Student Firebase Auth already exists');
      } else {
        console.log('⚠️  Student Auth creation failed:', authError.message);
      }
    }

    console.log('\n🏫 Step 3: Creating test classroom...');

    // 3. Create test classroom
    const classroomData = {
      id: classroomId,
      teacherId: teacherUid,
      name: 'Test Math 101',
      section: 'A',
      description: 'Test classroom for student dashboard demonstration',
      externalId: 'test_gc_classroom_001',
      courseState: 'ACTIVE',
      enrollmentCode: 'TEST001',
      studentIds: [studentUid],
      assignmentIds: [], // Will be populated as we add assignments
      studentCount: 1,
      assignmentCount: 4, // We'll create 4 assignments
      activeSubmissions: 1, // One pending submission
      ungradedSubmissions: 1,
      createdAt: now,
      updatedAt: now
    };

    await firestore.collection('classrooms').doc(classroomId).set(classroomData);
    console.log('✅ Created test classroom: Test Math 101');

    console.log('\n📋 Step 4: Creating student enrollment...');

    // 4. Create student enrollment
    const enrollmentId = `enrollment_${studentUid}_${classroomId}`;
    const enrollmentData = {
      id: enrollmentId,
      studentId: studentUid,
      classroomId: classroomId,
      studentEmail: 'student@schoolemail.com',
      studentName: 'Test Student',
      enrollmentStatus: 'ACTIVE',
      enrolledAt: now,
      createdAt: now,
      updatedAt: now
    };

    await firestore.collection('enrollments').doc(enrollmentId).set(enrollmentData);
    console.log('✅ Created student enrollment');

    console.log('\n📚 Step 5: Creating test assignments...');

    // 5. Create test assignments with different states
    const assignments = [
      {
        id: 'test_assignment_001',
        title: 'Introduction to Variables',
        description: 'Learn about variables and data types in programming',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'graded',
        instructions: 'Create variables of different types and demonstrate their usage.',
        maxPoints: 20
      },
      {
        id: 'test_assignment_002', 
        title: 'Loop Practice',
        description: 'Practice with for loops and while loops',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        status: 'submitted',
        instructions: 'Write loops to solve the given problems.',
        maxPoints: 25
      },
      {
        id: 'test_assignment_003',
        title: 'Functions and Methods', 
        description: 'Learn how to write and use functions',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'not_started',
        instructions: 'Create functions that solve mathematical problems.',
        maxPoints: 30
      },
      {
        id: 'test_assignment_004',
        title: 'Arrays and Lists',
        description: 'Working with data structures',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (past due)
        status: 'missing',
        instructions: 'Demonstrate array manipulation and list operations.',
        maxPoints: 35
      }
    ];

    for (const assignment of assignments) {
      const assignmentData = {
        id: assignment.id,
        classroomId: classroomId,
        teacherId: teacherUid,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        dueDate: assignment.dueDate,
        maxPoints: assignment.maxPoints,
        
        // Assignment classification for AI grading
        classification: {
          platform: 'google_docs',
          contentType: 'code',
          gradingApproach: 'generous_code',
          confidence: 1.0
        },
        
        // Assignment state
        state: 'PUBLISHED',
        submissionCount: assignment.status === 'not_started' || assignment.status === 'missing' ? 0 : 1,
        gradedCount: assignment.status === 'graded' ? 1 : 0,
        
        createdAt: now,
        updatedAt: now
      };

      await firestore.collection('assignments').doc(assignment.id).set(assignmentData);
      console.log(`✅ Created assignment: ${assignment.title} (${assignment.status})`);
    }

    console.log('\n📄 Step 6: Creating test submissions...');

    // 6. Create submissions for assignments 1 and 2
    const submissions = [
      {
        id: 'test_submission_001',
        assignmentId: 'test_assignment_001',
        studentName: 'Test Student',
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        content: `// Variables Assignment Solution
let studentName = "Test Student";
let age = 16;
let gpa = 3.5;
let isEnrolled = true;

console.log("Student: " + studentName);
console.log("Age: " + age);
console.log("GPA: " + gpa);
console.log("Enrolled: " + isEnrolled);`,
        status: 'graded'
      },
      {
        id: 'test_submission_002',
        assignmentId: 'test_assignment_002',
        studentName: 'Test Student',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        content: `// Loop Practice Solution
// Problem 1: Print numbers 1 to 10
for (let i = 1; i <= 10; i++) {
    console.log(i);
}

// Problem 2: Sum of first 20 numbers
let sum = 0;
let count = 1;
while (count <= 20) {
    sum += count;
    count++;
}
console.log("Sum: " + sum);`,
        status: 'submitted'
      }
    ];

    for (const submission of submissions) {
      const submissionData = {
        id: submission.id,
        studentId: studentUid,
        assignmentId: submission.assignmentId,
        classroomId: classroomId,
        studentEmail: 'student@schoolemail.com',
        studentName: submission.studentName,
        
        // Submission content
        extractedContent: {
          text: submission.content,
          wordCount: submission.content.split(' ').length
        },
        
        // Submission metadata
        submittedAt: submission.submittedAt,
        status: submission.status,
        version: 1,
        isLatest: true,
        
        createdAt: submission.submittedAt,
        updatedAt: submission.submittedAt
      };

      await firestore.collection('submissions').doc(submission.id).set(submissionData);
      console.log(`✅ Created submission for: ${submission.assignmentId}`);
    }

    console.log('\n📊 Step 7: Creating test grade...');

    // 7. Create grade for assignment 1
    const gradeData = {
      id: 'test_grade_001',
      studentId: studentUid,
      assignmentId: 'test_assignment_001',
      classroomId: classroomId,
      submissionId: 'test_submission_001',
      teacherId: teacherUid,
      
      // Grade details
      percentage: 85,
      points: 17,
      maxPoints: 20,
      letterGrade: 'B',
      
      // Detailed feedback
      feedback: `Great work on the variables assignment! You demonstrated a solid understanding of different data types and variable declaration. Your code is clean and well-commented.

Strengths:
- Correct use of let keyword
- Good variable naming conventions  
- Proper data types chosen
- Clear console output

Areas for improvement:
- Consider using template literals instead of string concatenation
- Add more descriptive comments for complex operations

Keep up the excellent work!`,
      
      // Rubric scores
      rubricScores: {
        "Correctness": { score: 4, maxScore: 5, comment: "All variables declared correctly" },
        "Code Style": { score: 3, maxScore: 5, comment: "Good style, could use template literals" },
        "Documentation": { score: 4, maxScore: 5, comment: "Well commented code" },
        "Efficiency": { score: 4, maxScore: 5, comment: "Efficient implementation" }
      },
      
      // Timestamps
      gradedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      gradedBy: teacherUid,
      
      // Version tracking
      version: 1,
      isLatest: true,
      
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    };

    await firestore.collection('grades').doc('test_grade_001').set(gradeData);
    console.log('✅ Created detailed grade with rubric and feedback');

    console.log('\n🎉 SETUP COMPLETE!');
    console.log('=====================================');
    console.log('✅ Test Student Setup Complete!');
    console.log('=====================================');
    console.log('📧 Email: student@schoolemail.com');
    console.log('🔑 Passcode: 12345');
    console.log('🏫 Classroom: Test Math 101');
    console.log('📚 Assignments: 4 (various states)');
    console.log('📄 Submissions: 2');
    console.log('📊 Grades: 1 (with detailed feedback)');
    console.log('=====================================');
    console.log('\nExpected Dashboard Stats:');
    console.log('- Average Grade: 85%');
    console.log('- Total Grades: 1');
    console.log('- Completed: 2/4');
    console.log('- Pending: 2');
    console.log('\nTo test: Go to the app and login with the credentials above!');
    console.log('\n🧹 To cleanup later, run: node cleanup-test-data.js');

  } catch (error) {
    console.error('❌ Error creating test student setup:', error);
    if (error.message) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}

// Self-executing function with error handling
(async () => {
  try {
    await createCompleteTestStudent();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Setup failed!', error);
    process.exit(1);
  }
})();