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

    // Now add Stewart as a student to these classrooms
    const stewartEmail = 'stewart.chan@gapps.yrdsb.ca';
    const stewartName = 'Stewart Chan';
    
    for (let i = 0; i < classroomRefs.length; i++) {
      const classroomRef = classroomRefs[i];
      const enrollmentId = `${classroomRef.id}_${stewartEmail}`;
      
      const enrollment = {
        id: enrollmentId,
        classroomId: classroomRef.id,
        studentId: stewartEmail,
        email: stewartEmail,
        name: stewartName,
        firstName: 'Stewart',
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

    console.log('✅ Test data creation completed!');

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