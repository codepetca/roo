/// <reference types="@vitest/browser/matchers" />
/// <reference types="@vitest/browser/providers/playwright" />

import { vi } from 'vitest';

// Define global for browser environment if not available
if (typeof global === 'undefined') {
	(globalThis as any).global = globalThis;
}

// Mock Firebase Auth with all required exports
vi.mock('firebase/auth', () => ({
	signInWithEmailAndPassword: vi.fn(),
	signOut: vi.fn(),
	onAuthStateChanged: vi.fn((auth, callback) => {
		// Return unsubscribe function
		return () => {};
	}),
	getAuth: vi.fn(() => ({ 
		currentUser: null,
		app: {}
	})),
	connectAuthEmulator: vi.fn(),
	GoogleAuthProvider: vi.fn(() => ({
		addScope: vi.fn(),
		setCustomParameters: vi.fn()
	})),
	signInWithPopup: vi.fn(),
	createUserWithEmailAndPassword: vi.fn(),
	sendPasswordResetEmail: vi.fn(),
	updateProfile: vi.fn(),
	getIdToken: vi.fn(),
	// Add missing User type export
	User: vi.fn()
}));

// Mock Firebase App
vi.mock('firebase/app', () => ({
	initializeApp: vi.fn(),
	getApps: vi.fn(() => []),
	getApp: vi.fn()
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
	getFirestore: vi.fn(),
	connectFirestoreEmulator: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	setDoc: vi.fn(),
	updateDoc: vi.fn(),
	deleteDoc: vi.fn(),
	collection: vi.fn(),
	getDocs: vi.fn(),
	addDoc: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
	Timestamp: {
		fromDate: vi.fn((date) => ({ toDate: () => date })),
		now: vi.fn(() => ({ toDate: () => new Date() }))
	}
}));

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
	getFunctions: vi.fn(),
	connectFunctionsEmulator: vi.fn(),
	httpsCallable: vi.fn()
}));

// Mock environment variables
vi.mock('$env/static/public', () => ({
	PUBLIC_FIREBASE_API_KEY: 'test-api-key',
	PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
	PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
	PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
	PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef',
	PUBLIC_USE_EMULATORS: 'true',
	PUBLIC_FUNCTIONS_EMULATOR_URL: 'http://localhost:5001/test-project/us-central1'
}));

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true,
	building: false,
	version: '1.0.0'
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
	pushState: vi.fn(),
	replaceState: vi.fn()
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn()
	},
	navigating: {
		subscribe: vi.fn()
	},
	updated: {
		subscribe: vi.fn()
	}
}));

// Mock document if not available
if (typeof document === 'undefined') {
	Object.defineProperty(globalThis, 'document', {
		value: {
			cookie: '',
			createElement: vi.fn(),
			getElementById: vi.fn(),
			querySelectorAll: vi.fn(() => []),
			querySelector: vi.fn()
		},
		writable: true,
		configurable: true
	});
}

// Mock window if not available
if (typeof window === 'undefined') {
	Object.defineProperty(globalThis, 'window', {
		value: {
			location: {
				href: 'http://localhost:3000',
				origin: 'http://localhost:3000'
			},
			localStorage: {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn()
			},
			sessionStorage: {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(),
				clear: vi.fn()
			}
		},
		writable: true,
		configurable: true
	});
}

// Mock fetch globally
if (!globalThis.fetch) {
	globalThis.fetch = vi.fn();
}

// Set up DOM environment for tests
const setupDOM = () => {
	// Enhance document mock with better methods
	if (typeof document !== 'undefined') {
		const originalCreateElement = document.createElement.bind(document);
		document.createElement = vi.fn((tagName) => {
			const element = originalCreateElement(tagName);
			// Add common properties that tests expect
			Object.defineProperty(element, 'value', {
				get() { return this.getAttribute('value') || ''; },
				set(val) { this.setAttribute('value', val); },
				configurable: true
			});
			Object.defineProperty(element, 'textContent', {
				get() { return this._textContent || ''; },
				set(val) { this._textContent = val; },
				configurable: true
			});
			Object.defineProperty(element, 'type', {
				get() { return this.getAttribute('type') || ''; },
				set(val) { this.setAttribute('type', val); },
				configurable: true
			});
			Object.defineProperty(element, 'disabled', {
				get() { return this.hasAttribute('disabled'); },
				set(val) { 
					if (val) this.setAttribute('disabled', '');
					else this.removeAttribute('disabled');
				},
				configurable: true
			});
			Object.defineProperty(element, 'className', {
				get() { return this.getAttribute('class') || ''; },
				set(val) { this.setAttribute('class', val); },
				configurable: true
			});
			// Add classList support
			element.classList = {
				add: vi.fn((className) => {
					const current = element.className.split(' ').filter(c => c);
					if (!current.includes(className)) {
						current.push(className);
						element.className = current.join(' ');
					}
				}),
				remove: vi.fn((className) => {
					const current = element.className.split(' ').filter(c => c);
					element.className = current.filter(c => c !== className).join(' ');
				}),
				contains: vi.fn((className) => {
					return element.className.split(' ').includes(className);
				})
			};
			// Add focus/blur support
			element.focus = vi.fn();
			element.blur = vi.fn();
			return element;
		});
	}
};

// Mock screen utilities for component tests
const createMockScreen = () => {
	const mockElement = () => {
		const element = document?.createElement('div') || {
			getAttribute: vi.fn(),
			setAttribute: vi.fn(),
			hasAttribute: vi.fn(),
			removeAttribute: vi.fn(),
			querySelector: vi.fn(),
			querySelectorAll: vi.fn(() => []),
			textContent: '',
			value: '',
			type: 'text',
			disabled: false,
			className: '',
			classList: {
				add: vi.fn(),
				remove: vi.fn(),
				contains: vi.fn(() => false)
			},
			focus: vi.fn(),
			blur: vi.fn()
		};
		// Add common test expectations
		if (typeof element === 'object' && element !== null) {
			element.toBeInTheDocument = vi.fn(() => true);
			element.toHaveAttribute = vi.fn(() => true);
			element.toHaveClass = vi.fn(() => true);
			element.toHaveTextContent = vi.fn(() => true);
		}
		return element;
	};

	return {
		getByRole: vi.fn((role, options) => {
			const element = mockElement();
			element.role = role;
			if (options?.name) {
				if (typeof options.name === 'string') {
					element.textContent = options.name;
				} else if (options.name instanceof RegExp) {
					element.textContent = 'Mock Text';
				}
			}
			return element;
		}),
		getByText: vi.fn((text) => {
			const element = mockElement();
			element.textContent = typeof text === 'string' ? text : 'Mock Text';
			return element;
		}),
		getByLabelText: vi.fn((label) => {
			const element = mockElement();
			element.setAttribute('aria-label', typeof label === 'string' ? label : 'Mock Label');
			return element;
		}),
		queryByText: vi.fn(() => null),
		queryByRole: vi.fn(() => null),
		getAllByText: vi.fn(() => []),
		getAllByRole: vi.fn(() => [])
	};
};

// Set up DOM
setupDOM();

// Mock @vitest/browser/context to provide screen utilities
vi.mock('@vitest/browser/context', () => ({
	screen: createMockScreen(),
	fireEvent: {
		click: vi.fn(() => Promise.resolve()),
		input: vi.fn(() => Promise.resolve()),
		keyDown: vi.fn(() => Promise.resolve())
	},
	waitFor: vi.fn((callback) => Promise.resolve(callback())),
	within: vi.fn(() => createMockScreen())
}));