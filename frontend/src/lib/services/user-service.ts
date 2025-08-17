/**
 * User Service - Unified interface for user data operations
 * Location: frontend/src/lib/services/user-service.ts
 *
 * Provides consistent user data access regardless of source:
 * - HTTP API endpoints (profile management)
 * - Firebase Functions Callable (profile creation)
 * - Real-time Firestore listeners (profile updates)
 * - Direct Firestore operations (when needed)
 */

import {
	doc,
	getDoc,
	setDoc,
	onSnapshot,
	serverTimestamp,
	type Unsubscribe
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { firestore } from '../firebase';
import { apiRequest } from '../api/client';
import { DataAdapter } from '../data/adapters';
import {
	validateCreateProfileData,
	userProfileSchema,
	type UserProfile,
	type CreateProfileData
} from '../data/validation';

// UserProfile and CreateProfileData types now imported from validation.ts

/**
 * Unified service for user data operations
 */
export class UserService {
	private static instance: UserService;
	private listeners: Map<string, Unsubscribe> = new Map();

	static getInstance(): UserService {
		if (!UserService.instance) {
			UserService.instance = new UserService();
		}
		return UserService.instance;
	}

	/**
	 * Get user profile via HTTP API
	 * Uses the /api/users/profile endpoint
	 * @param firebaseUser - Firebase user object for token
	 * @returns User profile data
	 */
	async getUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
		try {
			console.debug('📡 UserService: Fetching profile via API for:', firebaseUser.email);

			// Use raw apiRequest and let DataAdapter handle validation
			const response = await apiRequest('/users/profile', { method: 'GET' });

			// DataAdapter handles extraction, normalization, and validation
			const validatedProfile = DataAdapter.fromApiResponse(response, userProfileSchema);

			console.debug(
				'✅ UserService: Profile fetched and validated successfully:',
				validatedProfile
			);
			return validatedProfile;
		} catch (error) {
			console.error('❌ UserService: Failed to fetch profile via API:', error);
			throw error;
		}
	}

	/**
	 * Create user profile via Firebase Functions Callable
	 * Uses the createProfileForExistingUser function
	 * @param data - Profile creation data
	 * @returns Created user profile
	 */
	async createProfile(data: CreateProfileData): Promise<UserProfile> {
		try {
			// Validate input data
			const validatedInput = validateCreateProfileData(data);
			console.debug('🔧 UserService: Creating profile via direct Firestore write:', validatedInput);

			// Create profile with current timestamp
			const now = new Date();
			const profileData: UserProfile = {
				...validatedInput,
				email: `${validatedInput.uid}@example.com`, // Generate email if not provided
				displayName: validatedInput.displayName || 'New User',
				createdAt: now,
				updatedAt: now,
				version: 1,
				isLatest: true
			};

			// Write to Firestore
			const docRef = doc(firestore, 'users', validatedInput.uid);
			await setDoc(docRef, {
				...profileData,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			});

			// Validate final profile data
			const validatedProfile = validateUserProfile(profileData);

			console.debug(
				'✅ UserService: Profile created and validated successfully:',
				validatedProfile
			);
			return validatedProfile;
		} catch (error) {
			console.error('❌ UserService: Failed to create profile via callable:', error);
			throw error;
		}
	}

	/**
	 * Get user profile via direct Firestore access
	 * For cases where API might not be available
	 * @param uid - User ID
	 * @returns User profile or null if not found
	 */
	async getUserProfileDirect(uid: string): Promise<UserProfile | null> {
		try {
			console.debug('📄 UserService: Fetching profile via direct Firestore:', uid);

			const docRef = doc(firestore, 'users', uid);
			const docSnap = await getDoc(docRef);

			// Check if document exists before processing
			if (!docSnap.exists()) {
				console.debug('⚠️ UserService: Profile not found:', uid);
				return null;
			}

			// DataAdapter handles normalization and validation
			const validatedProfile = DataAdapter.fromFirestoreDoc(docSnap, userProfileSchema);

			console.debug('✅ UserService: Profile fetched and validated directly:', validatedProfile);
			return validatedProfile;
		} catch (error) {
			console.error('❌ UserService: Failed to fetch profile directly:', error);
			throw error;
		}
	}

	/**
	 * Subscribe to real-time user profile updates
	 * @param uid - User ID
	 * @param callback - Function called when profile changes
	 * @returns Unsubscribe function
	 */
	subscribeToProfile(uid: string, callback: (profile: UserProfile | null) => void): Unsubscribe {
		console.debug('🔊 UserService: Starting real-time profile listener:', uid);

		// Unsubscribe from existing listener for this user
		this.unsubscribeFromProfile(uid);

		const docRef = doc(firestore, 'users', uid);

		const unsubscribe = onSnapshot(
			docRef,
			(snapshot) => {
				try {
					if (!snapshot.exists()) {
						console.debug('⚠️ UserService: Profile deleted or not found:', uid);
						callback(null);
						return;
					}

					// DataAdapter handles normalization and validation
					const validatedProfile = DataAdapter.fromFirestoreDoc(snapshot, userProfileSchema);
					console.debug(
						'📨 UserService: Profile updated and validated via listener:',
						validatedProfile
					);
					callback(validatedProfile);
				} catch (validationError) {
					console.error('❌ UserService: Real-time profile validation failed:', validationError);
					callback(null);
				}
			},
			(error) => {
				console.error('❌ UserService: Profile listener error:', error);
				callback(null);
			}
		);

		// Store unsubscribe function
		this.listeners.set(`profile-${uid}`, unsubscribe);

		return unsubscribe;
	}

	/**
	 * Update school email via API
	 * @param schoolEmail - New school email
	 * @returns Updated data
	 */
	async updateSchoolEmail(schoolEmail: string): Promise<{ success: boolean; schoolEmail: string }> {
		try {
			console.debug('📝 UserService: Updating school email via API');

			// Use raw apiRequest and let DataAdapter handle response
			const response = await apiRequest('/users/school-email', {
				method: 'PUT',
				body: JSON.stringify({ schoolEmail }),
				headers: { 'Content-Type': 'application/json' }
			});

			// DataAdapter handles extraction without schema (simple data)
			const result = DataAdapter.fromApiResponse(response);

			console.debug('✅ UserService: School email updated successfully');
			return result;
		} catch (error) {
			console.error('❌ UserService: Failed to update school email:', error);
			throw error;
		}
	}

	/**
	 * Unsubscribe from profile updates for a specific user
	 * @param uid - User ID
	 */
	unsubscribeFromProfile(uid: string): void {
		const key = `profile-${uid}`;
		const unsubscribe = this.listeners.get(key);

		if (unsubscribe) {
			console.debug('🔇 UserService: Unsubscribing from profile updates:', uid);
			unsubscribe();
			this.listeners.delete(key);
		}
	}

	/**
	 * Unsubscribe from all active listeners
	 */
	unsubscribeAll(): void {
		console.debug('🔇 UserService: Unsubscribing from all listeners:', this.listeners.size);

		this.listeners.forEach((unsubscribe, key) => {
			console.debug('🔇 UserService: Unsubscribing:', key);
			unsubscribe();
		});

		this.listeners.clear();
	}

	/**
	 * Get active listener count (for debugging)
	 */
	getActiveListenerCount(): number {
		return this.listeners.size;
	}

	/**
	 * Get list of active listener keys (for debugging)
	 */
	getActiveListeners(): string[] {
		return Array.from(this.listeners.keys());
	}

	/**
	 * Unified profile fetch with fallback strategies
	 * Tries API first, falls back to direct Firestore if needed
	 * @param firebaseUser - Firebase user object
	 * @returns User profile
	 */
	async getProfileWithFallback(firebaseUser: FirebaseUser): Promise<UserProfile> {
		try {
			// Primary: Try API endpoint
			return await this.getUserProfile(firebaseUser);
		} catch (apiError) {
			console.warn('⚠️ UserService: API failed, trying direct Firestore:', apiError);

			try {
				// Fallback: Direct Firestore access
				const profile = await this.getUserProfileDirect(firebaseUser.uid);
				if (profile) {
					return profile;
				}
				throw new Error('Profile not found in Firestore');
			} catch (firestoreError) {
				console.error('❌ UserService: All profile fetch methods failed');
				throw new Error(
					`Profile fetch failed: API (${apiError.message}), Firestore (${firestoreError.message})`
				);
			}
		}
	}
}

// Export singleton instance
export const userService = UserService.getInstance();
