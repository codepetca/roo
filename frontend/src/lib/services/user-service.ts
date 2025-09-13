/**
 * User Service - Simplified interface for user data operations
 * Location: frontend/src/lib/services/user-service.ts
 *
 * Provides user data access via manual refresh pattern:
 * - HTTP API endpoints (profile management)
 * - Firebase Functions Callable (profile creation)
 * - No real-time listeners (manual refresh only)
 */

import type { User as FirebaseUser } from 'firebase/auth';
import { apiRequest, callFunction } from '../api/client';
import {
	validateCreateProfileData,
	userProfileSchema,
	type UserProfile,
	type CreateProfileData
} from '../data/validation';

// UserProfile and CreateProfileData types now imported from validation.ts

/**
 * Simplified service for user data operations (manual refresh only)
 */
export class UserService {
	private static instance: UserService;
	private profileRequestCache = new Map<string, Promise<UserProfile>>();

	static getInstance(): UserService {
		if (!UserService.instance) {
			UserService.instance = new UserService();
		}
		return UserService.instance;
	}

	/**
	 * Get user profile via HTTP API with request deduplication
	 * Uses the /api/users/profile endpoint
	 * @param firebaseUser - Firebase user object for token
	 * @returns User profile data
	 */
	async getUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
		const userId = firebaseUser.uid;
		
		// Check if we already have a pending request for this user
		const existingRequest = this.profileRequestCache.get(userId);
		if (existingRequest) {
			console.debug('📡 UserService: Using cached profile request for:', firebaseUser.email);
			return existingRequest;
		}

		console.debug('📡 UserService: Fetching profile via API for:', firebaseUser.email);

		// Create and cache the request promise
		const requestPromise = this._fetchProfileFromAPI();
		this.profileRequestCache.set(userId, requestPromise);

		try {
			const profile = await requestPromise;
			// Clear cache after successful completion
			this.profileRequestCache.delete(userId);
			return profile;
		} catch (error) {
			// Clear cache on error to allow retry
			this.profileRequestCache.delete(userId);
			throw error;
		}
	}

	/**
	 * Internal method to fetch profile from API
	 * @returns User profile data
	 * @private
	 */
	private async _fetchProfileFromAPI(): Promise<UserProfile> {
		try {
			// Direct API call - backend now returns normalized data
			const response = await apiRequest('/users/profile', { method: 'GET' });

			// Extract data from API response wrapper format
			if (!response || typeof response !== 'object' || !('success' in response)) {
				throw new Error('Invalid API response format');
			}

			if (!response.success) {
				const error = response.error || 'API request failed';
				throw new Error(error);
			}

			if (!response.data) {
				throw new Error('API response missing data field');
			}

			// Validate with schema - backend should provide normalized data
			const validatedProfile = userProfileSchema.parse(response.data);

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
			console.debug('🔧 UserService: Creating profile via Firebase Callable:', validatedInput);

			// Call Firebase Function directly - no DataAdapter needed
			const result = await callFunction('createProfileForExistingUser', validatedInput);

			// Extract data directly from callable result
			const profileData = result.data;

			if (!profileData || !profileData.profile) {
				throw new Error('Invalid response from profile creation function');
			}

			// Validate the returned profile
			const validatedProfile = userProfileSchema.parse(profileData.profile);

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
	 * Update school email via API
	 * @param schoolEmail - New school email
	 * @returns Updated data
	 */
	async updateSchoolEmail(schoolEmail: string): Promise<{ success: boolean; schoolEmail: string }> {
		try {
			console.debug('📝 UserService: Updating school email via API');

			// Direct API call - backend returns normalized data
			const response = await apiRequest('/users/school-email', {
				method: 'PUT',
				body: JSON.stringify({ schoolEmail }),
				headers: { 'Content-Type': 'application/json' }
			});

			// Extract data from API response wrapper format
			if (!response || typeof response !== 'object' || !('success' in response)) {
				throw new Error('Invalid API response format');
			}

			if (!response.success) {
				const error = response.error || 'API request failed';
				throw new Error(error);
			}

			console.debug('✅ UserService: School email updated successfully');
			return {
				success: response.success,
				schoolEmail: response.schoolEmail || schoolEmail
			};
		} catch (error) {
			console.error('❌ UserService: Failed to update school email:', error);
			throw error;
		}
	}

	/**
	 * Get user profile (API only - no fallback needed since backend is now reliable)
	 * @param firebaseUser - Firebase user object
	 * @returns User profile
	 */
	async getProfileWithFallback(firebaseUser: FirebaseUser): Promise<UserProfile> {
		// With normalized backend, we only need the API endpoint
		return await this.getUserProfile(firebaseUser);
	}
}

// Export singleton instance
export const userService = UserService.getInstance();
