/**
 * Test Data Cleanup Script
 * 
 * Removes all test data created by create-complete-test-student.js:
 * - Test student and teacher accounts
 * - Test classroom and enrollments  
 * - Test assignments, submissions, and grades
 * - Firebase Auth users
 * 
 * Usage:
 *   cd functions
 *   node cleanup-test-data.js
 * 
 * This script uses batch operations for efficient deletion
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'roo-app-3d24e'
});

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
  console.log('🌐 Using production Firebase - Please confirm this is intended!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 5000));
}

async function cleanupTestData() {
  try {
    console.log('🧹 Starting test data cleanup...\n');

    // Define test entity IDs (must match create-complete-test-student.js)
    const testEntityIds = {
      teacherUid: 'test_teacher_uid',
      studentUid: 'test_student_uid', 
      classroomId: 'test_classroom_001',
      assignmentIds: [
        'test_assignment_001',
        'test_assignment_002', 
        'test_assignment_003',
        'test_assignment_004'
      ],
      submissionIds: [
        'test_submission_001',
        'test_submission_002'
      ],
      gradeIds: [
        'test_grade_001'
      ],
      enrollmentId: 'enrollment_test_student_uid_test_classroom_001'
    };

    // Track deletion counts
    let deletionCount = {
      grades: 0,
      submissions: 0,
      assignments: 0,
      enrollments: 0,
      classrooms: 0,
      users: 0,
      authUsers: 0
    };

    console.log('📊 Step 1: Deleting grades...');
    
    // 1. Delete grades first (no dependencies)
    const gradeBatch = firestore.batch();
    for (const gradeId of testEntityIds.gradeIds) {
      const gradeRef = firestore.collection('grades').doc(gradeId);
      gradeBatch.delete(gradeRef);
      deletionCount.grades++;
    }
    await gradeBatch.commit();
    console.log(`✅ Deleted ${deletionCount.grades} grades`);

    console.log('\n📄 Step 2: Deleting submissions...');
    
    // 2. Delete submissions
    const submissionBatch = firestore.batch();
    for (const submissionId of testEntityIds.submissionIds) {
      const submissionRef = firestore.collection('submissions').doc(submissionId);
      submissionBatch.delete(submissionRef);
      deletionCount.submissions++;
    }
    await submissionBatch.commit();
    console.log(`✅ Deleted ${deletionCount.submissions} submissions`);

    console.log('\n📚 Step 3: Deleting assignments...');
    
    // 3. Delete assignments
    const assignmentBatch = firestore.batch();
    for (const assignmentId of testEntityIds.assignmentIds) {
      const assignmentRef = firestore.collection('assignments').doc(assignmentId);
      assignmentBatch.delete(assignmentRef);
      deletionCount.assignments++;
    }
    await assignmentBatch.commit();
    console.log(`✅ Deleted ${deletionCount.assignments} assignments`);

    console.log('\n📋 Step 4: Deleting enrollments...');
    
    // 4. Delete enrollment
    await firestore.collection('enrollments').doc(testEntityIds.enrollmentId).delete();
    deletionCount.enrollments++;
    console.log(`✅ Deleted ${deletionCount.enrollments} enrollment`);

    console.log('\n🏫 Step 5: Deleting classroom...');
    
    // 5. Delete classroom
    await firestore.collection('classrooms').doc(testEntityIds.classroomId).delete();
    deletionCount.classrooms++;
    console.log(`✅ Deleted ${deletionCount.classrooms} classroom`);

    console.log('\n👤 Step 6: Deleting user accounts...');
    
    // 6. Delete user documents
    const userBatch = firestore.batch();
    const studentUserRef = firestore.collection('users').doc(testEntityIds.studentUid);
    const teacherUserRef = firestore.collection('users').doc(testEntityIds.teacherUid);
    
    userBatch.delete(studentUserRef);
    userBatch.delete(teacherUserRef);
    deletionCount.users += 2;
    
    await userBatch.commit();
    console.log(`✅ Deleted ${deletionCount.users} user documents`);

    console.log('\n🔐 Step 7: Deleting Firebase Auth users...');
    
    // 7. Delete Firebase Auth users
    try {
      await auth.deleteUser(testEntityIds.studentUid);
      deletionCount.authUsers++;
      console.log('✅ Deleted student Firebase Auth user');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('⚠️  Student Firebase Auth user not found');
      } else {
        console.log('⚠️  Failed to delete student Auth user:', error.message);
      }
    }

    try {
      await auth.deleteUser(testEntityIds.teacherUid);
      deletionCount.authUsers++;
      console.log('✅ Deleted teacher Firebase Auth user');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('⚠️  Teacher Firebase Auth user not found');
      } else {
        console.log('⚠️  Failed to delete teacher Auth user:', error.message);
      }
    }

    // 8. Additional cleanup: Find any orphaned test data by email/name patterns
    console.log('\n🔍 Step 8: Checking for additional test data...');
    
    // Check for users with test emails
    const testEmailUsers = await firestore.collection('users')
      .where('email', 'in', ['student@schoolemail.com', 'teacher@test.com'])
      .get();
    
    if (!testEmailUsers.empty) {
      console.log(`⚠️  Found ${testEmailUsers.size} additional users with test emails`);
      const additionalUserBatch = firestore.batch();
      testEmailUsers.forEach(doc => {
        additionalUserBatch.delete(doc.ref);
        deletionCount.users++;
      });
      await additionalUserBatch.commit();
      console.log(`✅ Cleaned up ${testEmailUsers.size} additional test users`);
    }

    // Check for classrooms with "Test" in the name
    const testClassrooms = await firestore.collection('classrooms')
      .where('name', '>=', 'Test')
      .where('name', '<', 'Tesu') // Range query to find names starting with 'Test'
      .get();
    
    if (!testClassrooms.empty) {
      console.log(`⚠️  Found ${testClassrooms.size} additional classrooms with "Test" in name`);
      const additionalClassroomBatch = firestore.batch();
      testClassrooms.forEach(doc => {
        additionalClassroomBatch.delete(doc.ref);
        deletionCount.classrooms++;
      });
      await additionalClassroomBatch.commit();
      console.log(`✅ Cleaned up ${testClassrooms.size} additional test classrooms`);
    }

    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('=====================================');
    console.log('✅ Test Data Cleanup Summary');
    console.log('=====================================');
    console.log(`📊 Grades deleted: ${deletionCount.grades}`);
    console.log(`📄 Submissions deleted: ${deletionCount.submissions}`);
    console.log(`📚 Assignments deleted: ${deletionCount.assignments}`);
    console.log(`📋 Enrollments deleted: ${deletionCount.enrollments}`);
    console.log(`🏫 Classrooms deleted: ${deletionCount.classrooms}`);
    console.log(`👤 User documents deleted: ${deletionCount.users}`);
    console.log(`🔐 Firebase Auth users deleted: ${deletionCount.authUsers}`);
    console.log('=====================================');
    console.log('\nAll test data has been successfully removed!');
    console.log('You can now re-run create-complete-test-student.js if needed.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    if (error.message) {
      console.error('Error details:', error.message);
    }
    throw error;
  }
}

// Confirmation prompt for production
async function confirmCleanup() {
  if (!isEmulator) {
    console.log('\n⚠️  WARNING: Running against PRODUCTION Firebase!');
    console.log('This will permanently delete test data from your production database.');
    console.log('\nType "DELETE TEST DATA" to confirm:');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      readline.question('Confirmation: ', resolve);
    });
    
    readline.close();
    
    if (answer !== 'DELETE TEST DATA') {
      console.log('❌ Cleanup cancelled - confirmation failed');
      process.exit(1);
    }
  }
}

// Self-executing function with error handling and confirmation
(async () => {
  try {
    await confirmCleanup();
    await cleanupTestData();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Cleanup failed!', error);
    process.exit(1);
  }
})();