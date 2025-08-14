#!/usr/bin/env ts-node

/**
 * Add Student Enrollment Script
 * Location: functions/src/scripts/add-student-enrollment.ts
 * 
 * Adds Stewart Chan as a student to dev.codepet's imported classrooms
 */

import * as admin from 'firebase-admin';
import { FirestoreRepository } from '../services/firestore-repository';
import { StudentEnrollment } from '@shared/schemas/core';
import { getCurrentTimestamp } from '../config/firebase';

// Initialize Firebase Admin for emulator
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'roo-app-3d24e'
  });
}

// Connect to emulator
const firestore = admin.firestore();
firestore.settings({
  host: 'localhost:8080',
  ssl: false
});

const repository = new FirestoreRepository();

async function addStudentEnrollment() {
  try {
    console.log('Starting student enrollment process...');

    // Student info
    const studentEmail = 'stew.chan@gmail.com';
    const studentName = 'Stew Chan';
    const teacherEmail = 'dev.codepet@gmail.com';

    // Get teacher's classrooms
    console.log(`Getting classrooms for teacher: ${teacherEmail}`);
    const classrooms = await repository.getClassroomsByTeacher(teacherEmail);
    
    if (classrooms.length === 0) {
      console.log('No classrooms found for teacher');
      return;
    }

    console.log(`Found ${classrooms.length} classrooms:`, classrooms.map(c => ({ id: c.id, name: c.name })));

    // Create student enrollment for each classroom
    for (const classroom of classrooms) {
      const enrollmentId = `${classroom.id}_${studentEmail}`;
      
      console.log(`Creating enrollment for classroom: ${classroom.name} (${classroom.id})`);
      
      const enrollment: StudentEnrollment = {
        id: enrollmentId,
        classroomId: classroom.id,
        studentId: studentEmail, // Using email as student ID for now
        email: studentEmail,
        name: studentName,
        firstName: 'Stew',
        lastName: 'Chan',
        displayName: studentName,
        enrolledAt: new Date(),
        status: 'active',
        submissionCount: 0,
        gradedSubmissionCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Check if enrollment already exists
      const existingEnrollment = await repository.getEnrollment(enrollmentId);
      if (existingEnrollment) {
        console.log(`Enrollment already exists for ${classroom.name}, skipping...`);
        continue;
      }

      // Create the enrollment
      await repository.createEnrollment(enrollment);
      console.log(`✅ Created enrollment: ${enrollmentId}`);

      // Update classroom student count
      await repository.updateCounts(classroom.id);
      console.log(`✅ Updated counts for classroom: ${classroom.id}`);
    }

    console.log('✅ Student enrollment process completed successfully!');

  } catch (error) {
    console.error('❌ Error adding student enrollment:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  addStudentEnrollment()
    .then(() => {
      console.log('Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { addStudentEnrollment };