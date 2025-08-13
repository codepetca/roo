/**
 * Firebase configuration and initialization
 * Location: frontend/src/lib/firebase.ts:1
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
	getAuth,
	connectAuthEmulator,
	GoogleAuthProvider,
	signInWithPopup,
	signOut as firebaseSignOut,
	onAuthStateChanged,
	type Auth,
	type User
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_USE_EMULATORS
} from '$env/static/public';

// Firebase configuration
const firebaseConfig = {
	apiKey: PUBLIC_FIREBASE_API_KEY,
	authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

// Flag to track if emulators are connected
let emulatorsConnected = false;

/**
 * Initialize Firebase services
 * Location: frontend/src/lib/firebase.ts:52
 */
export function initializeFirebase() {
	if (!app) {
		app = initializeApp(firebaseConfig);
		auth = getAuth(app);
		db = getFirestore(app);
		functions = getFunctions(app);

		// Connect to emulators if in development
		if (PUBLIC_USE_EMULATORS === 'true' && !emulatorsConnected) {
			connectToEmulators();
			emulatorsConnected = true;
		}
	}

	return { app, auth, db, functions };
}

/**
 * Connect to Firebase emulators
 * Location: frontend/src/lib/firebase.ts:71
 */
function connectToEmulators() {
	try {
		// Connect Auth emulator
		connectAuthEmulator(auth, 'http://localhost:9099', {
			disableWarnings: true
		});

		// Connect Firestore emulator
		connectFirestoreEmulator(db, 'localhost', 8080);

		// Connect Functions emulator
		connectFunctionsEmulator(functions, 'localhost', 5001);

		console.log('🔧 Connected to Firebase Emulators');
		console.log('   Auth: http://localhost:9099');
		console.log('   Firestore: http://localhost:8080');
		console.log('   Functions: http://localhost:5001');
		console.log('   Emulator UI: http://localhost:4000');
	} catch (error) {
		// Emulators might already be connected
		console.warn('Emulator connection warning:', error);
	}
}

// Initialize on import
const firebase = initializeFirebase();

export const firebaseApp = firebase.app;
export const firebaseAuth = firebase.auth;
export const firestore = firebase.db;
export const firebaseFunctions = firebase.functions;

// Configure Google provider with required scopes for teachers
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive');
// Removed gmail.send scope to avoid OAuth verification warnings
// Now using Firebase Auth for email sending instead
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Set custom parameters for Google OAuth
googleProvider.setCustomParameters({
	prompt: 'consent', // Force consent screen to show all scopes
	access_type: 'offline', // Request refresh token
	include_granted_scopes: 'true' // Include previously granted scopes
});

/**
 * Sign in with Google for teachers
 * Location: frontend/src/lib/firebase.ts:110
 */
export async function signInWithGoogle(): Promise<{ user: User; accessToken: string }> {
	try {
		const result = await signInWithPopup(firebaseAuth, googleProvider);
		const user = result.user;

		// Get the access token for Google APIs
		const credential = GoogleAuthProvider.credentialFromResult(result);
		const accessToken = credential?.accessToken;

		if (!accessToken) {
			throw new Error('Failed to obtain Google access token');
		}

		return { user, accessToken };
	} catch (error) {
		console.error('Google sign-in error:', error);
		throw error;
	}
}

/**
 * Sign out current user
 * Location: frontend/src/lib/firebase.ts:133
 */
export async function signOut(): Promise<void> {
	try {
		await firebaseSignOut(firebaseAuth);
	} catch (error) {
		console.error('Sign out error:', error);
		throw error;
	}
}

/**
 * Listen to authentication state changes
 * Location: frontend/src/lib/firebase.ts:144
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
	return onAuthStateChanged(firebaseAuth, callback);
}

/**
 * Get the current user's ID token
 * Location: frontend/src/lib/firebase.ts:151
 */
export async function getCurrentUserToken(): Promise<string | null> {
	const user = firebaseAuth.currentUser;
	if (!user) return null;

	try {
		return await user.getIdToken();
	} catch (error) {
		console.error('Error getting user token:', error);
		return null;
	}
}
