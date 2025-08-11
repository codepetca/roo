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
		console.warn('No authenticated user found for API request');
		return null;
	}

	try {
		const token = await firebaseAuth.currentUser.getIdToken();
		console.debug('Auth token obtained for API request', { uid: firebaseAuth.currentUser.uid });
		return token;
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

	const fullUrl = `${API_BASE_URL}/api${endpoint}`;
	console.debug('API Request:', { method: options.method || 'GET', url: fullUrl, hasAuth: !!token });

	const response = await fetch(fullUrl, {
		...options,
		headers
	});

	if (!response.ok) {
		// Enhanced error reporting with HTTP details
		const url = `${API_BASE_URL}/api${endpoint}`;
		
		try {
			const errorData = await response.json();
			const errorMessage =
				errorData.message || errorData.error || response.statusText || 'Unknown error';
			
			// Include HTTP status and URL in error for debugging
			throw new Error(`${response.status} ${errorMessage} (${options.method || 'GET'} ${url})`);
		} catch (parseError) {
			// If we can't parse the error response, include full context
			throw new Error(`${response.status} ${response.statusText || 'Network Error'} (${options.method || 'GET'} ${url})`);
		}
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

	// Add detailed logging for debugging validation issues
	console.debug('Raw API response data:', JSON.stringify(rawResponse.data, null, 2));
	console.debug('Validating against schema:', schema._def);

	const validation = safeValidateApiResponse(schema, rawResponse.data);

	if (!validation.success) {
		console.error('🚨 API RESPONSE VALIDATION FAILED 🚨');
		console.error('Endpoint:', endpoint);
		console.error('Method:', options.method || 'GET');
		console.error('Schema expected:', schema._def);
		console.error('Response data:', JSON.stringify(rawResponse.data, null, 2));
		console.error('Validation errors:', validation.error);
		console.error('Detailed error format:', JSON.stringify(validation.error, null, 2));
		
		// Create more descriptive error message
		const errorDetails = validation.error.issues ? validation.error.issues.map(issue => 
			`Path: ${issue.path.join('.')}, Expected: ${issue.expected}, Received: ${issue.received}, Message: ${issue.message}`
		).join('; ') : validation.error;
		
		// Also log to browser alert for E2E tests
		if (typeof window !== 'undefined') {
			window.console.warn('VALIDATION FAILED - CHECK CONSOLE FOR DETAILS');
		}
		
		throw new Error(`API response validation failed: ${errorDetails}`);
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
