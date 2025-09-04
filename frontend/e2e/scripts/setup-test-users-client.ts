#!/usr/bin/env node

/**
 * Client-Based Test Users Setup Script  
 * Location: frontend/e2e/scripts/setup-test-users-client.ts
 * 
 * Uses Firebase Client SDK to create users, ensuring consistent connection 
 * path for both user creation and authentication in E2E tests.
 * This solves the Admin SDK vs Client SDK data isolation issue.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { 
	getAuth, 
	connectAuthEmulator, 
	createUserWithEmailAndPassword, 
	signInWithEmailAndPassword,
	signOut,
	type Auth 
} from 'firebase/auth';
import { 
	getFirestore, 
	connectFirestoreEmulator, 
	doc, 
	setDoc,
	type Firestore 
} from 'firebase/firestore';
import { ALL_TEST_USERS, type TestUserConfig } from './test-users-config';

/**
 * Environment configuration with support for emulators, staging, and production
 */
const TEST_ENVIRONMENT = process.env.TEST_ENVIRONMENT || 'emulator';

// Firebase configuration (using same config as frontend)
const firebaseConfig = {
	apiKey: "AIzaSyClZQWC6ksWWwxZjSEautayQqoNTshjp1k",
	authDomain: "roo-app-3d24e.firebaseapp.com", 
	projectId: "roo-app-3d24e",
	storageBucket: "roo-app-3d24e.firebasestorage.app",
	messagingSenderId: "253828549203",
	appId: "1:253828549203:web:0049eccccd6c436aaf54a6"
};

// Emulator configuration
const USE_EMULATORS = TEST_ENVIRONMENT === 'emulator';
const EMULATOR_HOST = '127.0.0.1';
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_PORT = 8080;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let emulatorsConnected = false;

/**
 * Initialize Firebase Client SDK with emulator support
 */
function initializeFirebase() {
	console.log('🔧 Setting up Firebase test users...\n');
	
	// Initialize Firebase
	app = initializeApp(firebaseConfig);
	auth = getAuth(app);
	db = getFirestore(app);

	if (USE_EMULATORS && !emulatorsConnected) {
		console.log('🏠 Using emulator environment - connecting to local emulators');
		
		// Connect to emulators
		const authUrl = `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`;
		connectAuthEmulator(auth, authUrl, { disableWarnings: true });
		connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
		
		console.log('✅ Connected to Firebase Emulators');
		console.log(`   Project: ${firebaseConfig.projectId}`);
		console.log(`   Auth Emulator: ${authUrl}`);
		console.log(`   Firestore Emulator: ${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`);
		
		emulatorsConnected = true;
	} else {
		console.log(`🌍 Using ${TEST_ENVIRONMENT} environment`);
	}
}

/**
 * Create a Firebase Auth user using Client SDK
 */
async function createFirebaseUser(userConfig: TestUserConfig): Promise<boolean> {
	try {
		const userCredential = await createUserWithEmailAndPassword(
			auth, 
			userConfig.email, 
			userConfig.password
		);
		
		console.log(`✅ Created user: ${userConfig.email} (UID: ${userCredential.user.uid})`);
		return true;
	} catch (error: any) {
		if (error.code === 'auth/email-already-in-use') {
			console.log(`⚠️  User ${userConfig.email} already exists - skipping creation`);
			return true;
		} else {
			console.error(`❌ Failed to create user ${userConfig.email}:`, error.message);
			return false;
		}
	}
}

/**
 * Create user profile in Firestore (requires authentication)
 */
async function createUserProfile(userConfig: TestUserConfig): Promise<boolean> {
	try {
		// Sign in to create the profile
		const userCredential = await signInWithEmailAndPassword(
			auth,
			userConfig.email,
			userConfig.password
		);
		
		// Create profile document using the authenticated user's UID
		const userProfileData = {
			uid: userCredential.user.uid,
			email: userConfig.email,
			displayName: userConfig.displayName,
			role: userConfig.role,
			googleUserId: userConfig.googleUserId,
			createdAt: new Date().toISOString(),
			isTestUser: true // Mark as test user for cleanup
		};

		// Add schoolEmail for students
		if (userConfig.role === 'student') {
			userProfileData.schoolEmail = userConfig.email;
		}

		// Save profile to Firestore
		const userDocRef = doc(db, 'users', userCredential.user.uid);
		await setDoc(userDocRef, userProfileData);
		
		console.log(`✅ Created profile for: ${userConfig.email}`);
		
		// Sign out after creating profile
		await signOut(auth);
		
		return true;
	} catch (error: any) {
		console.error(`❌ Failed to create profile for ${userConfig.email}:`, error.message);
		return false;
	}
}

/**
 * Verify user can authenticate successfully
 */
async function verifyUserAuthentication(userConfig: TestUserConfig): Promise<boolean> {
	try {
		const userCredential = await signInWithEmailAndPassword(
			auth,
			userConfig.email, 
			userConfig.password
		);
		
		console.log(`✅ Verified authentication for: ${userConfig.email}`);
		
		// Sign out after verification
		await signOut(auth);
		
		return true;
	} catch (error: any) {
		console.error(`❌ Authentication verification failed for ${userConfig.email}:`, error.message);
		return false;
	}
}

/**
 * Process a single test user (create + profile + verify)
 */
async function setupTestUser(userConfig: TestUserConfig): Promise<boolean> {
	console.log(`\n📝 Processing user: ${userConfig.email} (${userConfig.role})`);
	
	// Step 1: Create Firebase Auth user
	const userCreated = await createFirebaseUser(userConfig);
	if (!userCreated) return false;
	
	// Step 2: Create Firestore profile 
	const profileCreated = await createUserProfile(userConfig);
	if (!profileCreated) return false;
	
	// Step 3: Verify authentication works
	const authVerified = await verifyUserAuthentication(userConfig);
	if (!authVerified) return false;
	
	console.log(`✅ Successfully set up: ${userConfig.email}`);
	return true;
}

/**
 * Main function to set up all test users
 */
async function setupAllTestUsers(): Promise<void> {
	try {
		initializeFirebase();
		
		console.log('🚀 Starting test user creation for CLIENT SDK approach...\n');
		
		let successCount = 0;
		let failCount = 0;
		
		// Process each user sequentially to avoid auth conflicts
		for (const userConfig of ALL_TEST_USERS) {
			const success = await setupTestUser(userConfig);
			if (success) {
				successCount++;
			} else {
				failCount++;
			}
		}
		
		// Summary
		console.log('\n============================================================');
		console.log('📊 Test User Setup Summary:');
		console.log(`   ✅ Successfully created: ${successCount} users`);
		console.log(`   ❌ Failed to create: ${failCount} users`);
		console.log(`   📚 Teachers created: ${ALL_TEST_USERS.filter(u => u.role === 'teacher').length}`);
		console.log(`   🎓 Students created: ${ALL_TEST_USERS.filter(u => u.role === 'student').length}`);
		console.log('\n🎉 All test users created successfully!');
		
		console.log('\n📝 You can now run E2E tests with:');
		console.log('   npm run test:e2e');
		
		if (failCount > 0) {
			console.log(`\n⚠️  ${failCount} users failed to create. Check the logs above for details.`);
			process.exit(1);
		}
		
	} catch (error: any) {
		console.error('\n💥 Setup failed:', error.message);
		process.exit(1);
	}
}

// Run the setup if called directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
	setupAllTestUsers();
}