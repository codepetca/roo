#!/usr/bin/env ts-node

/**
 * Debug Production Schema Script
 * Tests classroom import to identify schema mismatches
 */

import * as admin from 'firebase-admin';
import { FirestoreRepository } from '../services/firestore-repository';

// Initialize Firebase Admin for production
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'roo-app-3d24e'
  });
}

const firestore = admin.firestore();
const repository = new FirestoreRepository();

async function debugProductionSchema() {
  try {
    console.log('🔧 Debugging production schema...');

    // First check current state
    console.log('\n📊 Current database state:');
    const classroomsSnapshot = await firestore.collection('classrooms').limit(5).get();
    console.log(`- Classrooms: ${classroomsSnapshot.docs.length}`);
    
    const usersSnapshot = await firestore.collection('users').limit(5).get();
    console.log(`- Users: ${usersSnapshot.docs.length}`);

    // Check our teacher user
    console.log('\n👤 Teacher user analysis:');
    const teacherEmail = 'teacher@test.com';
    const user = await repository.getUserByEmail(teacherEmail);
    if (user) {
      console.log('✅ Teacher user found:', {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolEmail: user.schoolEmail
      });
    } else {
      console.log('❌ Teacher user NOT found');
    }

    // Test classroom query
    console.log('\n🔍 Testing classroom queries:');
    const classrooms1 = await firestore.collection('classrooms')
      .where('teacherId', '==', teacherEmail)
      .get();
    console.log(`- Query by teacherId='${teacherEmail}': ${classrooms1.docs.length} results`);

    if (user?.schoolEmail) {
      const classrooms2 = await firestore.collection('classrooms')
        .where('teacherId', '==', user.schoolEmail)
        .get();
      console.log(`- Query by teacherId='${user.schoolEmail}': ${classrooms2.docs.length} results`);
    }

    // Test creating a minimal classroom document
    console.log('\n📝 Testing minimal classroom creation:');
    const testClassroom = {
      id: 'debug-test-classroom',
      name: 'Debug Test Classroom',
      teacherId: teacherEmail,
      teacherEmail: teacherEmail,
      studentCount: 0,
      externalId: 'debug-external-123',
      courseState: 'ACTIVE' as const,
      enrollmentCode: 'DEBUG123',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      alternateLink: 'https://classroom.google.com/debug',
      isLatest: true,
      version: 1
    };

    try {
      await firestore.collection('classrooms').doc(testClassroom.id).set(testClassroom);
      console.log('✅ Test classroom created successfully');

      // Verify it was created
      const readBack = await firestore.collection('classrooms').doc(testClassroom.id).get();
      if (readBack.exists) {
        console.log('✅ Test classroom verified in database');
        
        // Test the query again
        const queryTest = await firestore.collection('classrooms')
          .where('teacherId', '==', teacherEmail)
          .get();
        console.log(`✅ Query now returns ${queryTest.docs.length} classrooms`);

        // Clean up test data
        await firestore.collection('classrooms').doc(testClassroom.id).delete();
        console.log('✅ Test classroom cleaned up');
      } else {
        console.log('❌ Test classroom not found after creation');
      }
    } catch (createError) {
      console.error('❌ Failed to create test classroom:', createError.message);
      console.error('📋 Error details:', createError);
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message);
    console.error('📋 Full error:', error);
  }
}

debugProductionSchema()
  .then(() => {
    console.log('\n🎉 Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug script failed:', error);
    process.exit(1);
  });