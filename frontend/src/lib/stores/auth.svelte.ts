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

// Promise-based initialization for better synchronization
let initializationPromise: Promise<void> | null = null;

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
async function waitForAuthStateReady(user: User, maxWaitMs = 10000): Promise<boolean> {
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

		// Wait a bit before checking again (progressive backoff)
		const waitTime = Math.min(500, 50 + Math.floor((Date.now() - startTime) / 100));
		await new Promise((resolve) => setTimeout(resolve, waitTime));
	}

	console.warn('⚠️ Auth state readiness timeout after', maxWaitMs, 'ms');
	return false;
}

/**
 * Wait for auth store to be fully initialized
 * Returns a promise that resolves when auth state is determined
 */
async function waitForInitialization(): Promise<void> {
	if (initializationPromise) {
		return initializationPromise;
	}

	// If already initialized and not loading, return immediately
	if (initialized && !loading) {
		return Promise.resolve();
	}

	// Create and return initialization promise
	initializationPromise = new Promise((resolve) => {
		// If already done, resolve immediately
		if (initialized && !loading) {
			resolve();
			return;
		}

		let checkInterval: NodeJS.Timeout;
		let timeout: NodeJS.Timeout;

		const checkComplete = () => {
			if (initialized && !loading) {
				clearInterval(checkInterval);
				clearTimeout(timeout);
				resolve();
			}
		};

		// Check every 100ms
		checkInterval = setInterval(checkComplete, 100);

		// Timeout after 15 seconds
		timeout = setTimeout(() => {
			clearInterval(checkInterval);
			console.warn('⚠️ Auth initialization timeout after 15 seconds');
			resolve(); // Resolve anyway to prevent hanging
		}, 15000);

		// Initial check
		checkComplete();
	});

	return initializationPromise;
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
	console.log('🔄 Initializing auth state listener...');

	// Set up the auth state listener
	const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
		console.log(
			'🔄 Auth state changed:',
			firebaseUser ? `User logged in (${firebaseUser.email})` : 'User logged out'
		);
		error = null;

		try {
			if (firebaseUser) {
				console.log('📡 Fetching user profile for:', firebaseUser.email);

				// Wait for auth state to be ready before fetching profile
				const authReady = await waitForAuthStateReady(firebaseUser, 8000);
				if (!authReady) {
					console.warn('⚠️ Auth state not fully ready, proceeding anyway...');
				}

				// Get user profile from Firestore (includes role) with optimized retry logic
				let profile = null;
				const maxRetries = 3; // Reduced from 5 for faster failure detection

				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					try {
						profile = await getUserProfile(firebaseUser);
						if (profile) {
							console.log('✅ Profile fetched successfully on attempt', attempt);
							break;
						}
					} catch (profileError) {
						console.warn(`⚠️ Profile fetch attempt ${attempt} failed:`, profileError);
						
						// Differentiate between different error types for better handling
						const isNetworkError = profileError?.message?.includes('Failed to fetch') || 
							profileError?.message?.includes('network') ||
							profileError?.code === 'auth/network-request-failed';
						
						if (!isNetworkError && attempt === maxRetries) {
							console.error('❌ Non-network error, stopping retries:', profileError);
							break;
						}
					}

					if (attempt < maxRetries) {
						// Faster initial retry, then exponential backoff
						const retryDelay = attempt === 1 ? 200 : attempt * 400;
						console.log(`⏳ Retrying profile fetch in ${retryDelay}ms...`);
						await new Promise((resolve) => setTimeout(resolve, retryDelay));
					}
				}

				if (profile) {
					user = profile;
					await setAuthCookie(firebaseUser);
					console.log('✅ Auth state updated successfully:', {
						uid: profile.uid,
						role: profile.role,
						hasSchoolEmail: !!profile.schoolEmail,
						loadingComplete: true
					});

					// Handle navigation after successful authentication and profile loading
					// Only navigate if we're currently on the login page to avoid interrupting user navigation
					if (browser && window.location.pathname === '/login') {
						console.log('🧭 Determining navigation target based on user profile...');

						if (profile.role === 'teacher' && !profile.schoolEmail) {
							console.log('🎓 Teacher needs to set school email, redirecting to onboarding...');
							await goto('/teacher/onboarding');
						} else {
							console.log('🎯 Redirecting to role-specific dashboard...');
							if (profile.role === 'teacher') {
								await goto('/teacher');
							} else {
								await goto('/student');
							}
						}
					} else {
						console.log('📍 User not on login page, skipping navigation');
					}
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

	// Enhanced timeout handling with proper initialization completion
	setTimeout(() => {
		if (loading && !firebaseAuth.currentUser) {
			console.log('⚡ No user after timeout, completing initialization');
			loading = false;
		}
	}, 3000); // Increased timeout for better reliability

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
		const authReady = await waitForAuthStateReady(result.user, 12000);

		if (!authReady) {
			console.warn('⚠️ Auth state failed to stabilize within timeout, proceeding anyway...');
		}

		await setAuthCookie(result.user);
		console.log('🍪 Auth cookie set successfully');

		// Wait for the onAuthStateChanged to complete profile loading
		// This prevents race conditions between signIn and the auth listener
		console.log('⏳ Waiting for profile to be loaded by auth state listener...');

		let profileLoadAttempts = 0;
		const maxWaitTime = 10000; // 10 seconds
		const startWait = Date.now();

		while (Date.now() - startWait < maxWaitTime) {
			profileLoadAttempts++;

			// Check if the auth state listener has completed loading the profile
			if (user && user.uid === result.user.uid) {
				console.log('✅ Profile loaded by auth state listener on attempt', profileLoadAttempts);
				break;
			}

			// Progressive wait time
			const waitTime = Math.min(300, 50 * profileLoadAttempts);
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}

		// Fallback: if profile still not loaded, try to load it directly
		if (!user || user.uid !== result.user.uid) {
			console.log('📡 Profile not loaded by listener, fetching directly...');
			const userProfile = await getUserProfile(result.user);

			if (!userProfile) {
				console.error('❌ User profile not found after sign in');
				error = 'User profile not found. Please contact support.';
				return;
			}

			// Set the user state
			user = userProfile;
			console.log('✅ Profile loaded directly:', userProfile);
		}

		console.log('✅ User profile ready:', {
			uid: user.uid,
			role: user.role,
			hasSchoolEmail: !!user.schoolEmail
		});

		// Don't navigate here - let onAuthStateChanged handle navigation to avoid race conditions
		console.log(
			'✅ Sign in process completed successfully - auth state listener will handle navigation'
		);
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
	get initialized() {
		return initialized;
	},

	// Actions
	signIn,
	createAccount,
	logOut,
	isTeacher,
	isAuthenticated,
	setUser,
	waitForInitialization
};
