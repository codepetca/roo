#!/usr/bin/env node

// Simple debug script to test the student dashboard data
const fs = require('fs');

// Set up emulator environment
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.NODE_ENV = 'emulator';
process.env.GCLOUD_PROJECT = 'roo-app-3d24e';

const { FirestoreRepository } = require('./lib/src/services/firestore-repository');

async function testStudentDashboard() {
  try {
    console.log('🔍 Testing student dashboard data...');
    
    const repository = new FirestoreRepository();
    const studentId = 'student1-e2e-uid';
    
    console.log(`📊 Looking for enrollments for student: ${studentId}`);
    
    // Test the specific method used by the student dashboard
    const enrollments = await repository.getEnrollmentsByStudent(studentId);
    
    console.log(`✅ Found ${enrollments.length} enrollments:`);
    enrollments.forEach((enrollment, i) => {
      console.log(`  ${i + 1}. Classroom: ${enrollment.classroomId}, Status: ${enrollment.status}`);
    });

    if (enrollments.length > 0) {
      console.log(`🏫 Testing classroom retrieval for first enrollment...`);
      const classroom = await repository.getClassroom(enrollments[0].classroomId);
      console.log(`  Classroom found: ${!!classroom}`);
      if (classroom) {
        console.log(`  Classroom name: ${classroom.name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testStudentDashboard().catch(console.error);