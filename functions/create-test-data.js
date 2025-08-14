const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
admin.initializeApp({
  projectId: 'roo-app-3d24e'
});

// Connect to emulator
const firestore = admin.firestore();
firestore.settings({
  host: 'localhost:8080',
  ssl: false
});

async function createTestData() {
  try {
    console.log('Creating test data...');

    // Create dev.codepet user
    const teacherData = {
      email: 'dev.codepet@gmail.com',
      name: 'Dev CodePet',
      role: 'teacher',
      classroomIds: [],
      totalStudents: 0,
      totalClassrooms: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const teacherRef = await firestore.collection('users').add(teacherData);
    console.log('✅ Created teacher user:', teacherRef.id);

    // Create sample classrooms
    const classrooms = [
      {
        teacherId: 'dev.codepet@gmail.com',
        name: 'Computer Science 101',
        section: 'A',
        description: 'Introduction to Computer Science',
        externalId: 'cs101',
        courseState: 'ACTIVE',
        studentIds: [],
        assignmentIds: [],
        studentCount: 0,
        assignmentCount: 0,
        activeSubmissions: 0,
        ungradedSubmissions: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        teacherId: 'dev.codepet@gmail.com',
        name: 'Programming Fundamentals',
        section: 'B',
        description: 'Learn programming basics',
        externalId: 'prog101',
        courseState: 'ACTIVE',
        studentIds: [],
        assignmentIds: [],
        studentCount: 0,
        assignmentCount: 0,
        activeSubmissions: 0,
        ungradedSubmissions: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    const classroomRefs = [];
    for (const classroom of classrooms) {
      const ref = await firestore.collection('classrooms').add(classroom);
      classroomRefs.push(ref);
      console.log('✅ Created classroom:', ref.id, '- Name:', classroom.name);
    }

    // Now add Stew as a student to these classrooms
    const stewartEmail = 'stew.chan@gmail.com';
    const stewartName = 'Stew Chan';
    
    for (let i = 0; i < classroomRefs.length; i++) {
      const classroomRef = classroomRefs[i];
      const enrollmentId = `${classroomRef.id}_${stewartEmail}`;
      
      const enrollment = {
        id: enrollmentId,
        classroomId: classroomRef.id,
        studentId: stewartEmail,
        email: stewartEmail,
        name: stewartName,
        firstName: 'Stew',
        lastName: 'Chan',
        displayName: stewartName,
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        submissionCount: 0,
        gradedSubmissionCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await firestore.collection('enrollments').doc(enrollmentId).set(enrollment);
      console.log('✅ Created enrollment:', enrollmentId);

      // Update classroom student count
      await classroomRef.update({
        studentCount: 1,
        studentIds: [stewartEmail]
      });
      console.log('✅ Updated classroom student count');
    }

    // Create student passcode for testing
    const passcode = {
      email: stewartEmail,
      code: 'TEST1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry for testing
      isUsed: false,
      studentName: stewartName,
      isTemporary: false
    };

    await firestore.collection('passcodes').doc(`${stewartEmail}_TEST1`).set(passcode);
    console.log('✅ Created student passcode: TEST1 for', stewartEmail);

    // Create sample assignments for each classroom
    const assignments = [];
    for (let i = 0; i < classroomRefs.length; i++) {
      const classroomRef = classroomRefs[i];
      const classroomName = classrooms[i].name;
      
      const classroomAssignments = [
        {
          classroomId: classroomRef.id,
          title: 'Karel Robot - First Steps',
          name: 'Karel Robot - First Steps',
          description: 'Learn the basics of Karel robot programming',
          type: 'coding',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          maxScore: 100,
          submissionCount: 1,
          gradedCount: 1,
          pendingCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          classroomId: classroomRef.id,
          title: 'Logic Quiz - Conditionals',
          name: 'Logic Quiz - Conditionals',
          description: 'Test your understanding of conditional statements',
          type: 'quiz',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
          maxScore: 50,
          submissionCount: 1,
          gradedCount: 1,
          pendingCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          classroomId: classroomRef.id,
          title: 'Loop Challenges',
          name: 'Loop Challenges',
          description: 'Practice with for and while loops',
          type: 'coding',
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
          maxScore: 100,
          submissionCount: 0,
          gradedCount: 0,
          pendingCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ];

      for (const assignment of classroomAssignments) {
        const assignmentRef = await firestore.collection('assignments').add(assignment);
        assignments.push({ ref: assignmentRef, data: assignment });
        console.log('✅ Created assignment:', assignmentRef.id, '- Title:', assignment.title);
      }
    }

    // Create submissions and grades for completed assignments
    for (let i = 0; i < assignments.length - 1; i++) { // Skip last assignment (pending)
      const assignment = assignments[i];
      const isFirstAssignment = i === 0;
      const isQuiz = assignment.data.type === 'quiz';
      
      // Create submission
      const submission = {
        assignmentId: assignment.ref.id,
        classroomId: assignment.data.classroomId,
        studentId: stewartEmail,
        status: 'submitted',
        content: isQuiz ? 
          '{"answers": {"q1": "A", "q2": "B", "q3": "C"}, "completedAt": "' + new Date().toISOString() + '"}' :
          'def move():\n    turnLeft()\n    move()\n    putBeeper()\n\n# Student code submission',
        submittedAt: new Date(Date.now() - (3 - i) * 24 * 60 * 60 * 1000), // Staggered submission times
        version: 1,
        isLatest: true,
        gradeId: null, // Will be set after grade creation
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const submissionRef = await firestore.collection('submissions').add(submission);
      console.log('✅ Created submission:', submissionRef.id, '- Assignment:', assignment.data.title);

      // Create grade for the submission
      const score = isFirstAssignment ? 95 : (isQuiz ? 42 : 88); // Varying scores for realism
      const grade = {
        assignmentId: assignment.ref.id,
        classroomId: assignment.data.classroomId,
        studentId: stewartEmail,
        submissionId: submissionRef.id,
        score: score,
        maxScore: assignment.data.maxScore,
        percentage: Math.round((score / assignment.data.maxScore) * 100),
        feedback: isFirstAssignment ? 
          'Excellent work! Your logic is clear and the solution is efficient.' :
          (isQuiz ? 'Good understanding shown, review conditional logic for improvement.' :
           'Nice implementation! Consider edge cases for more robust solutions.'),
        rubricScores: {},
        gradedAt: new Date(Date.now() - (2 - i) * 24 * 60 * 60 * 1000), // Graded after submission
        gradedBy: 'dev.codepet@gmail.com',
        version: 1,
        isLatest: true,
        aiGenerated: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const gradeRef = await firestore.collection('grades').add(grade);
      console.log('✅ Created grade:', gradeRef.id, '- Score:', score + '/' + assignment.data.maxScore);

      // Update submission with grade reference
      await submissionRef.update({ gradeId: gradeRef.id });

      // Update student enrollment stats
      const enrollmentId = `${assignment.data.classroomId}_${stewartEmail}`;
      await firestore.collection('enrollments').doc(enrollmentId).update({
        submissionCount: admin.firestore.FieldValue.increment(1),
        gradedSubmissionCount: admin.firestore.FieldValue.increment(1)
      });
    }

    console.log('✅ Test data creation completed with assignments, submissions, and grades!');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

createTestData()
  .then(() => {
    console.log('Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });