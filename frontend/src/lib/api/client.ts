/**
 * HTTP Client Core - Base API communication functions
 * @module frontend/src/lib/api/client
 * @size ~100 lines
 * @exports apiRequest, typedApiRequest, callFunction, API_BASE_URL
 * @dependencies firebase/functions, zod, firebase config
 * @patterns Runtime validation, auth token injection, error handling
 */

import { httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { firebaseFunctions, firebaseAuth } from '../firebase';
import {
	PUBLIC_USE_EMULATORS,
	PUBLIC_FUNCTIONS_EMULATOR_URL,
	PUBLIC_FIREBASE_PROJECT_ID
} from '$env/static/public';
import { z } from 'zod';
import { safeValidateApiResponse, type ApiResponse } from '../schemas';

/**
 * Base URL for direct HTTP calls
 */
export const API_BASE_URL =
	PUBLIC_USE_EMULATORS === 'true'
		? PUBLIC_FUNCTIONS_EMULATOR_URL
		: `https://us-central1-${PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

/**
 * Get the current user's Firebase ID token for API authentication
 */
async function getAuthToken(): Promise<string | null> {
	if (!firebaseAuth.currentUser) {
		return null;
	}

	try {
		return await firebaseAuth.currentUser.getIdToken();
	} catch (error) {
		console.error('Failed to get auth token:', error);
		return null;
	}
}

/**
 * Generic API request function with authentication
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const token = await getAuthToken();

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string>)
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
		...options,
		headers
	});

	if (!response.ok) {
		throw new Error(`API request failed: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

/**
 * Type-safe API request with runtime validation
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @param schema - Zod schema for response validation
 */
export async function typedApiRequest<T>(
	endpoint: string,
	options: RequestInit,
	schema: z.ZodType<T>
): Promise<T> {
	const rawResponse = await apiRequest<ApiResponse<T>>(endpoint, options);
	
	// Handle wrapped API response format
	if (!rawResponse.success) {
		throw new Error(rawResponse.error || 'API request failed');
	}

	if (!rawResponse.data) {
		// Handle empty data responses (e.g., for arrays that should default to empty)
		if (schema instanceof z.ZodArray) {
			return [] as unknown as T;
		}
		throw new Error('No data in API response');
	}

	const validation = safeValidateApiResponse(schema, rawResponse.data);

	if (!validation.success) {
		console.error('API response validation failed:', validation.error);
		throw new Error(`API response validation failed: ${validation.error}`);
	}

	return validation.data as T;
}

/**
 * Firebase Function callable wrapper
 * @param functionName - Name of the Firebase Function
 * @param data - Data to send to the function
 */
export async function callFunction<TData = unknown, TResult = unknown>(
	functionName: string,
	data?: TData
): Promise<HttpsCallableResult<TResult>> {
	const callable = httpsCallable<TData, TResult>(firebaseFunctions, functionName);
	return callable(data);
}
