const admin = require('firebase-admin');

// Initialize Firebase Admin for staging
// Note: Make sure GOOGLE_APPLICATION_CREDENTIALS is set to your service account key
admin.initializeApp({
  projectId: 'roo-app-3d24e'
});

const firestore = admin.firestore();

async function createStagingTestData() {
  try {
    console.log('Creating test data for staging Firebase...');

    // Create teacher user for dev.codepet@gmail.com
    const teacherId = 'dev-codepet-uid'; // Use a consistent UID
    const teacherData = {
      email: 'dev.codepet@gmail.com',
      displayName: 'Dev CodePet',
      name: 'Dev CodePet',
      role: 'teacher',
      schoolEmail: 'dev.codepet@gmail.com',
      classroomIds: [],
      totalStudents: 0,
      totalClassrooms: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await firestore.collection('users').doc(teacherId).set(teacherData);
    console.log('✅ Created teacher user:', teacherId);

    // Create another teacher for test.codepet@gmail.com
    const testTeacherId = 'test-codepet-uid';
    const testTeacherData = {
      email: 'test.codepet@gmail.com',
      displayName: 'Test Teacher',
      name: 'Test Teacher',
      role: 'teacher',
      schoolEmail: 'test.codepet@gmail.com',
      classroomIds: [],
      totalStudents: 0,
      totalClassrooms: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await firestore.collection('users').doc(testTeacherId).set(testTeacherData);
    console.log('✅ Created test teacher user:', testTeacherId);

    // Create sample classrooms for both teachers
    const classrooms = [
      {
        id: 'cs101-dev',
        teacherId: 'dev.codepet@gmail.com',
        name: 'Computer Science 101',
        section: 'A',
        description: 'Introduction to Computer Science',
        externalId: 'cs101',
        courseState: 'ACTIVE',
        studentIds: ['stew.chan@gmail.com'],
        assignmentIds: [],
        studentCount: 1,
        assignmentCount: 3,
        activeSubmissions: 2,
        ungradedSubmissions: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'prog101-dev',
        teacherId: 'dev.codepet@gmail.com',
        name: 'Programming Fundamentals',
        section: 'B',
        description: 'Learn programming basics with Karel',
        externalId: 'prog101',
        courseState: 'ACTIVE',
        studentIds: ['stew.chan@gmail.com'],
        assignmentIds: [],
        studentCount: 1,
        assignmentCount: 2,
        activeSubmissions: 1,
        ungradedSubmissions: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'cs102-test',
        teacherId: 'test.codepet@gmail.com',
        name: 'Advanced Computer Science',
        section: 'C',
        description: 'Advanced programming concepts',
        externalId: 'cs102',
        courseState: 'ACTIVE',
        studentIds: ['student.test@example.com'],
        assignmentIds: [],
        studentCount: 1,
        assignmentCount: 1,
        activeSubmissions: 1,
        ungradedSubmissions: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const classroom of classrooms) {
      await firestore.collection('classrooms').doc(classroom.id).set(classroom);
      console.log('✅ Created classroom:', classroom.id, '- Name:', classroom.name);
    }

    // Create student enrollments
    const enrollments = [
      {
        id: 'cs101-dev_stew.chan@gmail.com',
        classroomId: 'cs101-dev',
        studentId: 'stew.chan@gmail.com',
        email: 'stew.chan@gmail.com',
        name: 'Stew Chan',
        firstName: 'Stew',
        lastName: 'Chan',
        displayName: 'Stew Chan',
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        submissionCount: 2,
        gradedSubmissionCount: 2,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'prog101-dev_stew.chan@gmail.com',
        classroomId: 'prog101-dev',
        studentId: 'stew.chan@gmail.com',
        email: 'stew.chan@gmail.com',
        name: 'Stew Chan',
        firstName: 'Stew',
        lastName: 'Chan',
        displayName: 'Stew Chan',
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        submissionCount: 1,
        gradedSubmissionCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'cs102-test_student.test@example.com',
        classroomId: 'cs102-test',
        studentId: 'student.test@example.com',
        email: 'student.test@example.com',
        name: 'Test Student',
        firstName: 'Test',
        lastName: 'Student',
        displayName: 'Test Student',
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        submissionCount: 1,
        gradedSubmissionCount: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const enrollment of enrollments) {
      await firestore.collection('enrollments').doc(enrollment.id).set(enrollment);
      console.log('✅ Created enrollment:', enrollment.id);
    }

    // Create sample assignments
    const assignments = [
      {
        id: 'karel-basics-cs101',
        classroomId: 'cs101-dev',
        title: 'Karel Robot - First Steps',
        name: 'Karel Robot - First Steps',
        description: 'Learn the basics of Karel robot programming. Make Karel move and place beepers.',
        type: 'coding',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxScore: 100,
        submissionCount: 1,
        gradedCount: 1,
        pendingCount: 0,
        isLatest: true,
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'conditionals-quiz-cs101',
        classroomId: 'cs101-dev',
        title: 'Logic Quiz - Conditionals',
        name: 'Logic Quiz - Conditionals',
        description: 'Test your understanding of if statements and conditional logic.',
        type: 'quiz',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxScore: 50,
        submissionCount: 1,
        gradedCount: 1,
        pendingCount: 0,
        isLatest: true,
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'loops-challenge-cs101',
        classroomId: 'cs101-dev',
        title: 'Loop Challenges',
        name: 'Loop Challenges',
        description: 'Practice with for and while loops. Create patterns with Karel.',
        type: 'coding',
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        maxScore: 100,
        submissionCount: 0,
        gradedCount: 0,
        pendingCount: 0,
        isLatest: true,
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'functions-prog101',
        classroomId: 'prog101-dev',
        title: 'Functions and Methods',
        name: 'Functions and Methods',
        description: 'Learn to create and use functions in programming.',
        type: 'coding',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        maxScore: 80,
        submissionCount: 1,
        gradedCount: 0,
        pendingCount: 1,
        isLatest: true,
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'oop-basics-prog101',
        classroomId: 'prog101-dev',
        title: 'Object-Oriented Programming Basics',
        name: 'OOP Basics',
        description: 'Introduction to classes and objects.',
        type: 'coding',
        dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
        maxScore: 100,
        submissionCount: 0,
        gradedCount: 0,
        pendingCount: 0,
        isLatest: true,
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'algorithms-cs102',
        classroomId: 'cs102-test',
        title: 'Algorithm Design',
        name: 'Algorithm Design',
        description: 'Design efficient algorithms for common problems.',
        type: 'coding',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        maxScore: 120,
        submissionCount: 1,
        gradedCount: 1,
        pendingCount: 0,
        isLatest: true,
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const assignment of assignments) {
      await firestore.collection('assignments').doc(assignment.id).set(assignment);
      console.log('✅ Created assignment:', assignment.id, '- Title:', assignment.title);
    }

    // Create submissions and grades
    const submissionsAndGrades = [
      {
        submission: {
          id: 'karel-basics-submission-1',
          assignmentId: 'karel-basics-cs101',
          classroomId: 'cs101-dev',
          studentId: 'stew.chan@gmail.com',
          status: 'graded',
          content: 'def move():\n    move()\n    move()\n    turnLeft()\n    move()\n    putBeeper()',
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          version: 1,
          isLatest: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        grade: {
          id: 'karel-basics-grade-1',
          assignmentId: 'karel-basics-cs101',
          classroomId: 'cs101-dev',
          studentId: 'stew.chan@gmail.com',
          submissionId: 'karel-basics-submission-1',
          score: 95,
          maxScore: 100,
          percentage: 95,
          feedback: 'Excellent work! Your solution correctly implements the required Karel movements. Clean code structure.',
          rubricScores: { correctness: 45, style: 25, efficiency: 25 },
          gradedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          gradedBy: 'dev.codepet@gmail.com',
          version: 1,
          isLatest: true,
          aiGenerated: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      },
      {
        submission: {
          id: 'conditionals-quiz-submission-1',
          assignmentId: 'conditionals-quiz-cs101',
          classroomId: 'cs101-dev',
          studentId: 'stew.chan@gmail.com',
          status: 'graded',
          content: '{"answers": {"q1": "if (frontIsClear())", "q2": "else", "q3": "while (beepersPresent())"}, "completedAt": "' + new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() + '"}',
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          version: 1,
          isLatest: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        grade: {
          id: 'conditionals-quiz-grade-1',
          assignmentId: 'conditionals-quiz-cs101',
          classroomId: 'cs101-dev',
          studentId: 'stew.chan@gmail.com',
          submissionId: 'conditionals-quiz-submission-1',
          score: 42,
          maxScore: 50,
          percentage: 84,
          feedback: 'Good understanding of conditional statements. Review the syntax for while loops.',
          rubricScores: { correctness: 38, completeness: 4 },
          gradedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          gradedBy: 'dev.codepet@gmail.com',
          version: 1,
          isLatest: true,
          aiGenerated: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      },
      {
        submission: {
          id: 'functions-submission-1',
          assignmentId: 'functions-prog101',
          classroomId: 'prog101-dev',
          studentId: 'stew.chan@gmail.com',
          status: 'submitted',
          content: 'def buildTower():\n    for i in range(3):\n        putBeeper()\n        move()\n        turnLeft()\n\nbuildTower()',
          submittedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          version: 1,
          isLatest: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      },
      {
        submission: {
          id: 'algorithms-submission-1',
          assignmentId: 'algorithms-cs102',
          classroomId: 'cs102-test',
          studentId: 'student.test@example.com',
          status: 'graded',
          content: 'def quickSort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quickSort(left) + middle + quickSort(right)',
          submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          version: 1,
          isLatest: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        grade: {
          id: 'algorithms-grade-1',
          assignmentId: 'algorithms-cs102',
          classroomId: 'cs102-test',
          studentId: 'student.test@example.com',
          submissionId: 'algorithms-submission-1',
          score: 108,
          maxScore: 120,
          percentage: 90,
          feedback: 'Excellent implementation of quicksort! Well-structured and efficient. Consider edge case handling.',
          rubricScores: { correctness: 50, efficiency: 35, style: 23 },
          gradedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          gradedBy: 'test.codepet@gmail.com',
          version: 1,
          isLatest: true,
          aiGenerated: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      }
    ];

    for (const item of submissionsAndGrades) {
      // Create submission
      await firestore.collection('submissions').doc(item.submission.id).set(item.submission);
      console.log('✅ Created submission:', item.submission.id);

      // Create grade if it exists
      if (item.grade) {
        await firestore.collection('grades').doc(item.grade.id).set(item.grade);
        console.log('✅ Created grade:', item.grade.id, '- Score:', item.grade.score + '/' + item.grade.maxScore);

        // Update submission with grade reference
        await firestore.collection('submissions').doc(item.submission.id).update({
          gradeId: item.grade.id,
          status: 'graded'
        });
      }
    }

    // Create student passcodes for testing
    const passcodes = [
      {
        id: 'stew.chan@gmail.com_TEST123',
        email: 'stew.chan@gmail.com',
        code: 'TEST123',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
        isUsed: false,
        studentName: 'Stew Chan',
        isTemporary: false
      },
      {
        id: 'student.test@example.com_DEMO456',
        email: 'student.test@example.com',
        code: 'DEMO456',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
        isUsed: false,
        studentName: 'Test Student',
        isTemporary: false
      }
    ];

    for (const passcode of passcodes) {
      await firestore.collection('passcodes').doc(passcode.id).set(passcode);
      console.log('✅ Created student passcode:', passcode.code, 'for', passcode.email);
    }

    console.log('✅ Staging test data creation completed!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - Teachers: 2 (dev.codepet@gmail.com, test.codepet@gmail.com)');
    console.log('   - Classrooms: 3 (2 for dev, 1 for test)');
    console.log('   - Students: 2 (stew.chan@gmail.com, student.test@example.com)');
    console.log('   - Assignments: 6');
    console.log('   - Submissions: 4');
    console.log('   - Grades: 3');
    console.log('   - Passcodes: 2');
    console.log('');
    console.log('🔑 Test Login Credentials:');
    console.log('   Teacher: dev.codepet@gmail.com (or test.codepet@gmail.com)');
    console.log('   Student: stew.chan@gmail.com / passcode: TEST123');
    console.log('   Student: student.test@example.com / passcode: DEMO456');

  } catch (error) {
    console.error('❌ Error creating staging test data:', error);
    throw error;
  }
}

createStagingTestData()
  .then(() => {
    console.log('Staging test data script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Staging test data script failed:', error);
    process.exit(1);
  });