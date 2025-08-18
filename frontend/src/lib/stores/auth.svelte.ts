/**
 * Authentication store using Svelte 5 runes
 * Location: frontend/src/lib/stores/auth.svelte.ts
 */

import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	updateProfile,
	signOut,
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { firebaseAuth } from '../firebase';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { userService, type CreateProfileData } from '../services/user-service';

// User interface for our store
interface AuthUser {
	uid: string;
	email: string | null;
	displayName: string | null;
	role: 'teacher' | 'student';
	schoolEmail?: string | null;
}

// Global auth state using Svelte 5 runes
let user = $state<AuthUser | null>(null);
let loading = $state(true);
let error = $state<string | null>(null);
let initialized = false;

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

/**
 * Wait for Firebase Auth state to be fully ready for API calls
 * Ensures that currentUser is available and can generate valid tokens
 */
async function waitForAuthStateReady(user: User, maxWaitMs = 5000): Promise<boolean> {
	console.log('⏳ Waiting for auth state to be ready for API calls...');

	const startTime = Date.now();

	while (Date.now() - startTime < maxWaitMs) {
		// Check if Firebase Auth current user matches our user and can generate tokens
		if (firebaseAuth.currentUser?.uid === user.uid) {
			try {
				// Test token generation to ensure it's working
				await firebaseAuth.currentUser.getIdToken(false);
				console.log('✅ Auth state is ready - tokens can be generated');
				return true;
			} catch (tokenError) {
				console.debug('⏳ Auth state not ready yet - token generation failed:', tokenError);
			}
		}

		// Wait a bit before checking again
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	console.warn('⚠️ Auth state readiness timeout after', maxWaitMs, 'ms');
	return false;
}

// Note: ensureUserProfile function removed as it's not currently used
// Profile creation is handled during the signup flow

/**
 * Get user profile from Firestore
 */
async function getUserProfile(firebaseUser: User): Promise<AuthUser | null> {
	try {
		console.log('📡 Getting user profile via UserService for:', firebaseUser.email);

		const profile = await userService.getProfileWithFallback(firebaseUser);

		// Convert UserProfile to AuthUser format
		const authUser: AuthUser = {
			uid: profile.uid,
			email: profile.email,
			displayName: profile.displayName,
			role: profile.role,
			schoolEmail: profile.schoolEmail || null
		};

		console.log('✅ Retrieved user profile via UserService:', authUser);
		return authUser;
	} catch (error) {
		console.error('❌ Failed to get user profile via UserService:', error);
		return null;
	}
}

/**
 * Initialize auth state listener
 */
function initializeAuth() {
	if (!browser || initialized) return;

	initialized = true;
	console.log('Initializing auth state listener...');

	// Set up the auth state listener
	const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
		console.log(
			'🔄 Auth state changed:',
			firebaseUser ? `User logged in (${firebaseUser.email})` : 'User logged out'
		);
		error = null;

		try {
			if (firebaseUser) {
				loading = true;
				console.log('📡 Fetching user profile for:', firebaseUser.email);

				// Get user profile from Firestore (includes role) with retry logic
				let profile = null;
				const maxRetries = 3;

				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					profile = await getUserProfile(firebaseUser);

					if (profile) {
						console.log('✅ Profile fetched successfully on attempt', attempt);
						break;
					}

					if (attempt < maxRetries) {
						console.log(`⏳ Profile fetch attempt ${attempt} failed, retrying...`);
						// Wait before retry, with exponential backoff
						await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
					}
				}

				if (profile) {
					user = profile;
					await setAuthCookie(firebaseUser);
					console.log('✅ Auth state updated successfully:', {
						uid: profile.uid,
						role: profile.role
					});
				} else {
					console.error('❌ Failed to get user profile after all retries');
					error = 'Failed to load user profile. Please try signing in again.';
					user = null;
				}

				loading = false;
			} else {
				user = null;
				await setAuthCookie(null);
				loading = false;
				console.log('✅ User signed out successfully');
			}
		} catch (err) {
			console.error('❌ Auth state change error:', err);
			error = err instanceof Error ? err.message : 'Authentication error';
			user = null;
			loading = false;
		}
	});

	// Ensure we get an initial state callback
	// In some cases, onAuthStateChanged might not fire immediately
	setTimeout(() => {
		if (loading && !firebaseAuth.currentUser) {
			console.log('No user after timeout, setting loading to false');
			loading = false;
		}
	}, 1000);

	return unsubscribe;
}

/**
 * Sign in with email and password
 */
async function signIn(email: string, password: string): Promise<void> {
	error = null;
	loading = true;

	console.log('🔑 Starting sign in process for:', email);

	try {
		console.log('🔐 Attempting Firebase authentication...');
		const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
		console.log('✅ Firebase authentication successful:', {
			uid: result.user.uid,
			email: result.user.email
		});

		// Wait for auth state to be ready before making API calls
		console.log('⏳ Waiting for auth state to stabilize...');
		const authReady = await waitForAuthStateReady(result.user);

		if (!authReady) {
			console.error('❌ Auth state failed to stabilize within timeout');
			error = 'Authentication timeout. Please try signing in again.';
			return;
		}

		await setAuthCookie(result.user);
		console.log('🍪 Auth cookie set successfully');

		// Get user profile from Firestore (includes role)
		// Note: We rely on onAuthStateChanged to set the user state, but we need the profile
		// for immediate routing decisions
		console.log('📡 Fetching user profile for routing decisions...');
		const userProfile = await getUserProfile(result.user);

		if (!userProfile) {
			console.error('❌ User profile not found after sign in');
			error = 'User profile not found. Please contact support.';
			return;
		}

		console.log('✅ User profile loaded successfully:', {
			uid: userProfile.uid,
			role: userProfile.role,
			hasSchoolEmail: !!userProfile.schoolEmail
		});

		// Set the user state immediately for routing (onAuthStateChanged will also set it)
		user = userProfile;

		// Check if teacher needs to set school email
		if (userProfile.role === 'teacher' && !userProfile.schoolEmail) {
			console.log('🎓 Teacher needs to set school email, redirecting to onboarding...');
			await goto('/teacher/onboarding');
		} else {
			console.log('🎯 Redirecting to role-specific dashboard...');
			// Redirect to clean role-specific routes using (dashboard) route group
			if (userProfile.role === 'teacher') {
				await goto('/teacher');
			} else {
				await goto('/student');
			}
		}

		console.log('✅ Sign in process completed successfully');
	} catch (err: unknown) {
		console.error('❌ Sign in error:', err);

		// Enhanced error handling with more specific messages
		const authError = err as { code?: string; message?: string };

		if (authError.code === 'auth/invalid-credential') {
			error = 'Invalid email or password. Please check your credentials and try again.';
		} else if (authError.code === 'auth/user-not-found') {
			error = 'No account found with this email. Please create an account first.';
		} else if (authError.code === 'auth/wrong-password') {
			error = 'Incorrect password. Please try again.';
		} else if (authError.code === 'auth/too-many-requests') {
			error = 'Too many failed attempts. Please wait a moment and try again.';
		} else if (authError.code === 'auth/network-request-failed') {
			error = 'Network error. Please check your connection and try again.';
		} else {
			error = authError.message || 'Failed to sign in. Please try again.';
		}

		throw err;
	} finally {
		loading = false;
	}
}

/**
 * Create account with email and password
 */
async function createAccount(data: {
	email: string;
	password: string;
	displayName?: string;
	role: 'teacher' | 'student';
	schoolEmail?: string;
}): Promise<AuthUser> {
	error = null;
	loading = true;

	console.log('🆕 Starting account creation for:', data.email, 'role:', data.role);

	try {
		console.log('🔐 Creating Firebase user...');
		// Create user with Firebase Auth
		const userCredential = await createUserWithEmailAndPassword(
			firebaseAuth,
			data.email,
			data.password
		);
		const firebaseUser = userCredential.user;
		console.log('✅ Firebase user created:', { uid: firebaseUser.uid, email: firebaseUser.email });

		// Update display name if provided
		if (data.displayName) {
			console.log('📝 Updating display name...');
			await updateProfile(firebaseUser, { displayName: data.displayName });
			console.log('✅ Display name updated');
		}

		console.log('📡 Creating user profile via UserService...');
		// Create user profile using unified UserService
		const profileData: CreateProfileData = {
			uid: firebaseUser.uid,
			role: data.role,
			schoolEmail: data.schoolEmail,
			displayName: data.displayName
		};

		const createdProfile = await userService.createProfile(profileData);
		console.log('✅ Profile created via UserService:', createdProfile);

		// Set auth cookie
		console.log('🍪 Setting auth cookie...');
		await setAuthCookie(firebaseUser);

		// Get the complete user profile
		console.log('📡 Fetching complete user profile...');
		const newUser = await getUserProfile(firebaseUser);
		if (!newUser) {
			console.error('❌ Failed to retrieve created user profile');
			throw new Error('Failed to retrieve created user profile');
		}

		console.log('✅ Account creation completed successfully:', {
			uid: newUser.uid,
			role: newUser.role
		});
		user = newUser;
		return newUser;
	} catch (err: unknown) {
		console.error('❌ Account creation error:', err);
		const authError = err as { code?: string; message?: string };

		if (authError.code === 'auth/email-already-in-use') {
			error = 'An account with this email already exists. Try signing in instead.';
		} else if (authError.code === 'auth/invalid-email') {
			error = 'Please enter a valid email address';
		} else if (authError.code === 'auth/weak-password') {
			error = 'Password is too weak. Please choose a stronger password';
		} else if (authError.code === 'auth/network-request-failed') {
			error = 'Network error. Please check your connection and try again.';
		} else {
			error = authError.message || 'Failed to create account';
		}
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

/**
 * Manually set user state (for student authentication workaround)
 */
function setUser(authUser: AuthUser | null): void {
	user = authUser;
	loading = false;
	console.log('🔄 Auth store - User manually set:', authUser);
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
	createAccount,
	logOut,
	isTeacher,
	isAuthenticated,
	setUser
};
