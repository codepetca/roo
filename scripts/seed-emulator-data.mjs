#!/usr/bin/env node

/**
 * Seed script for Firebase Emulator data
 * Usage: node scripts/seed-emulator-data.mjs
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  projectId: 'roo-app-3d24e',
  apiKey: 'demo-key',
  authDomain: 'localhost',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators
connectFirestoreEmulator(db, 'localhost', 8080);
connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

/**
 * Seed test users
 */
async function seedUsers() {
  console.log('📝 Creating test users...');
  
  const testUsers = [
    { email: 'teacher@test.com', password: 'test123', name: 'Test Teacher' },
    { email: 'student1@test.com', password: 'test123', name: 'Test Student 1' },
    { email: 'student2@test.com', password: 'test123', name: 'Test Student 2' },
  ];

  for (const userData of testUsers) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      await updateProfile(userCredential.user, {
        displayName: userData.name
      });
      
      console.log(`  ✅ Created user: ${userData.email}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`  ⏭️  User already exists: ${userData.email}`);
      } else {
        console.error(`  ❌ Error creating user ${userData.email}:`, error.message);
      }
    }
  }
}

/**
 * Seed test assignments
 */
async function seedAssignments() {
  console.log('\n📚 Creating test assignments...');
  
  const assignments = [
    {
      id: 'karel-intro-001',
      title: 'Karel Introduction',
      type: 'code',
      description: 'Learn the basics of Karel the Dog programming',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      totalPoints: 100,
      published: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      id: 'variables-quiz-001',
      title: 'Variables and Data Types Quiz',
      type: 'quiz',
      description: 'Test your knowledge of variables and data types',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      totalPoints: 50,
      published: true,
      questions: [
        {
          id: 'q1',
          question: 'What is a variable?',
          type: 'multiple-choice',
          options: [
            'A container for storing data',
            'A type of function',
            'A loop structure',
            'A conditional statement'
          ],
          correctAnswer: 'A container for storing data',
          points: 10
        },
        {
          id: 'q2',
          question: 'Which of the following is a valid variable name in JavaScript?',
          type: 'multiple-choice',
          options: [
            '123variable',
            'variable-name',
            'variableName',
            'variable name'
          ],
          correctAnswer: 'variableName',
          points: 10
        }
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    {
      id: 'loops-practice-001',
      title: 'Loop Practice Problems',
      type: 'code',
      description: 'Practice writing and understanding loops',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      totalPoints: 80,
      published: false, // Draft assignment
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  ];

  for (const assignment of assignments) {
    try {
      await setDoc(
        doc(db, 'assignments', assignment.id),
        assignment
      );
      console.log(`  ✅ Created assignment: ${assignment.title}`);
    } catch (error) {
      console.error(`  ❌ Error creating assignment ${assignment.title}:`, error.message);
    }
  }
}

/**
 * Seed test submissions
 */
async function seedSubmissions() {
  console.log('\n📤 Creating test submissions...');
  
  const submissions = [
    {
      id: 'submission-001',
      assignmentId: 'karel-intro-001',
      studentId: 'student1@test.com',
      studentName: 'Test Student 1',
      submittedAt: serverTimestamp(),
      code: `function main() {
  move();
  turnLeft();
  move();
  putBeeper();
}`,
      status: 'submitted',
      grade: null,
      feedback: null,
    },
    {
      id: 'submission-002',
      assignmentId: 'variables-quiz-001',
      studentId: 'student1@test.com',
      studentName: 'Test Student 1',
      submittedAt: serverTimestamp(),
      answers: {
        'q1': 'A container for storing data',
        'q2': 'variable-name' // Wrong answer
      },
      status: 'graded',
      grade: 10,
      feedback: 'Good effort! Review variable naming conventions.',
    },
    {
      id: 'submission-003',
      assignmentId: 'karel-intro-001',
      studentId: 'student2@test.com',
      studentName: 'Test Student 2',
      submittedAt: serverTimestamp(),
      code: `// Student forgot to write any code`,
      status: 'submitted',
      grade: null,
      feedback: null,
    }
  ];

  for (const submission of submissions) {
    try {
      await setDoc(
        doc(db, 'submissions', submission.id),
        submission
      );
      console.log(`  ✅ Created submission: ${submission.id}`);
    } catch (error) {
      console.error(`  ❌ Error creating submission ${submission.id}:`, error.message);
    }
  }
}

/**
 * Main seeder function
 */
async function seedData() {
  console.log('🌱 Starting data seed for Firebase Emulators...\n');
  
  try {
    await seedUsers();
    await seedAssignments();
    await seedSubmissions();
    
    console.log('\n✨ Data seeding complete!');
    console.log('\n📌 Test credentials:');
    console.log('  Teacher: teacher@test.com / test123');
    console.log('  Student 1: student1@test.com / test123');
    console.log('  Student 2: student2@test.com / test123');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Check if emulators are running
fetch('http://localhost:4000')
  .then(() => {
    console.log('✅ Emulators detected, starting seed...\n');
    seedData();
  })
  .catch(() => {
    console.error('❌ Firebase Emulators are not running!');
    console.error('Please start them with: npm run emulators\n');
    process.exit(1);
  });