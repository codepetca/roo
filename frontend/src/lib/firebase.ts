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
	signInWithCustomToken,
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
	PUBLIC_ENVIRONMENT,
	PUBLIC_EMULATOR_AUTH_URL,
	PUBLIC_EMULATOR_FIRESTORE_HOST,
	PUBLIC_EMULATOR_FIRESTORE_PORT,
	PUBLIC_EMULATOR_FUNCTIONS_HOST,
	PUBLIC_EMULATOR_FUNCTIONS_PORT
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

		// Connect to emulators in local environment
		console.log('🔍 DEBUG: PUBLIC_ENVIRONMENT =', PUBLIC_ENVIRONMENT);
		if (PUBLIC_ENVIRONMENT === 'development' && !emulatorsConnected) {
			console.log('🔍 DEBUG: Connecting to local emulators...');
			connectToEmulators();
			emulatorsConnected = true;
		} else {
			console.log('🔍 DEBUG: Using remote Firebase services for environment:', PUBLIC_ENVIRONMENT);
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
		console.log('🔍 DEBUG: Starting emulator connections...');
		
		// Connect Auth emulator
		const authUrl = PUBLIC_EMULATOR_AUTH_URL || 'http://127.0.0.1:9099';
		connectAuthEmulator(auth, authUrl, {
			disableWarnings: true
		});
		console.log('🔍 DEBUG: Auth emulator connected at', authUrl);

		// Connect Firestore emulator
		const firestoreHost = PUBLIC_EMULATOR_FIRESTORE_HOST || '127.0.0.1';
		const firestorePort = parseInt(PUBLIC_EMULATOR_FIRESTORE_PORT || '8080');
		connectFirestoreEmulator(db, firestoreHost, firestorePort);
		console.log('🔍 DEBUG: Firestore emulator connected at', `${firestoreHost}:${firestorePort}`);

		// Connect Functions emulator
		const functionsHost = PUBLIC_EMULATOR_FUNCTIONS_HOST || '127.0.0.1';
		const functionsPort = parseInt(PUBLIC_EMULATOR_FUNCTIONS_PORT || '5001');
		connectFunctionsEmulator(functions, functionsHost, functionsPort);
		console.log('🔍 DEBUG: Functions emulator connected at', `${functionsHost}:${functionsPort}`);

		console.log('🔧 Connected to Firebase Emulators');
		console.log(`   Auth: ${authUrl}`);
		console.log(`   Firestore: ${firestoreHost}:${firestorePort}`);
		console.log(`   Functions: ${functionsHost}:${functionsPort}`);
		console.log('   Emulator UI: http://127.0.0.1:4000');
	} catch (error) {
		// Emulators might already be connected or there could be other issues
		console.error('🚨 Emulator connection error:', error);
	}
}

// Initialize on import
const firebase = initializeFirebase();

export const firebaseApp = firebase.app;
export const firebaseAuth = firebase.auth;
export const firestore = firebase.db;
export const firebaseFunctions = firebase.functions;

// Expose Firebase services to global scope for E2E testing
if (typeof window !== 'undefined') {
	(window as any).firebaseAuth = firebaseAuth;
	(window as any).firebaseFunctions = firebaseFunctions;
}

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
 * Sign in with custom token (for student authentication)
 * Location: frontend/src/lib/firebase.ts:151
 */
export { signInWithCustomToken };

/**
 * Sign out current user
 * Location: frontend/src/lib/firebase.ts:159
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
