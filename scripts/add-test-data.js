#!/usr/bin/env node

const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

admin.initializeApp({
  projectId: 'roo-app-3d24e'
});

const db = admin.firestore();

async function addTestData() {
  console.log('Adding test classroom data...');
  
  try {
    // Add a test classroom
    const classroomRef = await db.collection('classrooms').add({
      name: 'Math 101 - Advanced',
      courseCode: 'MATH101',
      teacherId: 'v7jEadozFKuMWtEuoDX9CBcMZB8G', // The teacher ID from the logs
      studentIds: [],
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('Created classroom:', classroomRef.id);
    
    // Add another classroom
    const classroom2Ref = await db.collection('classrooms').add({
      name: 'Science 201 - Physics',
      courseCode: 'SCI201',
      teacherId: 'v7jEadozFKuMWtEuoDX9CBcMZB8G',
      studentIds: [],
      isActive: true,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('Created classroom:', classroom2Ref.id);
    
    // Add some test assignments for the first classroom
    const assignmentRef = await db.collection('assignments').add({
      classroomId: classroomRef.id,
      title: 'Algebra Quiz #1',
      description: 'Basic algebra problems covering linear equations',
      maxPoints: 20,
      isQuiz: true,
      formId: 'test-form-id-1',
      sourceFileId: 'test-file-id-1',
      gradingRubric: {
        enabled: true,
        criteria: ['Accuracy', 'Method', 'Work Shown'],
        promptTemplate: 'Grade this math quiz focusing on accuracy and methodology'
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('Created assignment:', assignmentRef.id);
    
    // Add a regular assignment
    const assignment2Ref = await db.collection('assignments').add({
      classroomId: classroomRef.id,
      title: 'Geometry Project',
      description: 'Create geometric proofs and demonstrate understanding',
      maxPoints: 50,
      isQuiz: false,
      gradingRubric: {
        enabled: true,
        criteria: ['Understanding', 'Presentation', 'Accuracy'],
        promptTemplate: 'Grade this geometry project on understanding and presentation'
      },
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('Created assignment:', assignment2Ref.id);
    
    // Add some test submissions
    await db.collection('submissions').add({
      assignmentId: assignmentRef.id,
      studentEmail: 'student1@example.com',
      studentName: 'John Doe',
      submissionText: 'x = 5, y = 3, z = 7',
      status: 'pending',
      submittedAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    await db.collection('submissions').add({
      assignmentId: assignmentRef.id,
      studentEmail: 'student2@example.com',
      studentName: 'Jane Smith',
      submissionText: 'x = 5, y = 3, z = 7',
      status: 'graded',
      submittedAt: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('Added test submissions');
    console.log('✅ Test data added successfully!');
    
  } catch (error) {
    console.error('Error adding test data:', error);
  }
}

addTestData().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(error => {
  console.error('Failed:', error);
  process.exit(1);
});