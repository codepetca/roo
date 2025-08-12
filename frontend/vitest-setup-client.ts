/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

// Mock environment variables for SvelteKit
import { vi } from 'vitest';

// Mock Firebase configuration
vi.mock('$env/static/public', () => ({
	PUBLIC_FIREBASE_API_KEY: 'mock-api-key',
	PUBLIC_FIREBASE_AUTH_DOMAIN: 'mock-project.firebaseapp.com',
	PUBLIC_FIREBASE_PROJECT_ID: 'mock-project',
	PUBLIC_FIREBASE_STORAGE_BUCKET: 'mock-project.appspot.com',
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
	PUBLIC_FIREBASE_APP_ID: 'mock-app-id',
	PUBLIC_USE_EMULATORS: 'false',
	PUBLIC_FUNCTIONS_EMULATOR_URL: 'http://localhost:5001'
}));

// Mock Firebase modules
vi.mock('firebase/app', () => ({
	initializeApp: vi.fn(),
	getApps: vi.fn(() => [])
}));

vi.mock('firebase/auth', () => ({
	getAuth: vi.fn(() => ({ currentUser: null })),
	connectAuthEmulator: vi.fn(),
	signInWithPopup: vi.fn(),
	signOut: vi.fn(),
	GoogleAuthProvider: vi.fn()
}));

vi.mock('firebase/functions', () => ({
	getFunctions: vi.fn(),
	connectFunctionsEmulator: vi.fn(),
	httpsCallable: vi.fn(() => vi.fn().mockResolvedValue({ data: {} }))
}));

// Mock the API module
vi.mock('$lib/api', () => ({
	api: {
		validateSnapshot: vi.fn().mockResolvedValue({ isValid: true, stats: {} })
	}
}));
