/**
 * Authentication store using Svelte 5 runes
 * Location: frontend/src/lib/stores/auth.svelte.ts
 */

import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseAuth } from '../firebase';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { API_BASE_URL } from '../api';

// User interface for our store
interface AuthUser {
	uid: string;
	email: string | null;
	displayName: string | null;
	role: 'teacher' | 'student';
}

// Global auth state using Svelte 5 runes
let user = $state<AuthUser | null>(null);
let loading = $state(true);
let error = $state<string | null>(null);

/**
 * Set auth token in cookies for server-side verification
 */
async function setAuthCookie(user: User | null) {
	if (!browser) return;

	try {
		if (user) {
			const token = await user.getIdToken();
			document.cookie = `auth-token=${token}; path=/; max-age=3600; SameSite=Strict`;
		} else {
			document.cookie = 'auth-token=; path=/; max-age=0';
		}
	} catch (err) {
		console.error('Failed to set auth cookie:', err);
	}
}

// Note: ensureUserProfile function removed as it's not currently used
// Profile creation is handled during the signup flow

/**
 * Get user profile from Firestore
 */
async function getUserProfile(firebaseUser: User): Promise<AuthUser | null> {
	try {
		const token = await firebaseUser.getIdToken();

		const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			console.error('Failed to get user profile - user needs to complete onboarding');
			return null;
		}

		const data = await response.json();

		if (data.success && data.data) {
			return {
				uid: firebaseUser.uid,
				email: firebaseUser.email,
				displayName: firebaseUser.displayName,
				role: data.data.role
			};
		}

		console.error('Invalid user profile data received');
		return null;
	} catch (error) {
		console.error('Error getting user profile:', error);
		return null;
	}
}

/**
 * Initialize auth state listener
 */
function initializeAuth() {
	if (!browser) return;

	onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
		loading = true;
		error = null;

		try {
			if (firebaseUser) {
				// Get user profile from Firestore (includes role)
				user = await getUserProfile(firebaseUser);
				await setAuthCookie(firebaseUser);
			} else {
				user = null;
				await setAuthCookie(null);
			}
		} catch (err) {
			console.error('Auth state change error:', err);
			error = err instanceof Error ? err.message : 'Authentication error';
			user = null;
		} finally {
			loading = false;
		}
	});
}

/**
 * Sign in with email and password
 */
async function signIn(email: string, password: string): Promise<void> {
	error = null;
	loading = true;

	try {
		const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
		await setAuthCookie(result.user);

		// Get user profile from Firestore (includes role)
		user = await getUserProfile(result.user);

		if (!user) {
			error = 'User profile not found. Please contact support.';
			return;
		}

		// Redirect to dashboard
		await goto('/dashboard');
	} catch (err: unknown) {
		console.error('Sign in error:', err);
		error = (err as Error)?.message || 'Failed to sign in';
		throw err;
	} finally {
		loading = false;
	}
}

/**
 * Sign out current user
 */
async function logOut(): Promise<void> {
	error = null;
	loading = true;

	try {
		await signOut(firebaseAuth);
		user = null;
		await setAuthCookie(null);

		// Redirect to login
		await goto('/login');
	} catch (err: unknown) {
		console.error('Sign out error:', err);
		error = (err as Error)?.message || 'Failed to sign out';
		throw err;
	} finally {
		loading = false;
	}
}

/**
 * Check if current user is a teacher
 */
function isTeacher(): boolean {
	return user?.role === 'teacher';
}

/**
 * Check if current user is authenticated
 */
function isAuthenticated(): boolean {
	return user !== null;
}

// Initialize auth when module loads
if (browser) {
	initializeAuth();
}

// Export reactive properties and actions (Svelte 5 style with closures)
export const auth = {
	// Reactive state accessed via getters to maintain reactivity
	get user() {
		return user;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},

	// Actions
	signIn,
	logOut,
	isTeacher,
	isAuthenticated
};
