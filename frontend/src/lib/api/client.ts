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
import { safeValidateApiResponse } from '../schemas';

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
		console.warn('⚠️ No authenticated user found for API request');
		return null;
	}

	try {
		// Force refresh token to ensure it's not expired
		const token = await firebaseAuth.currentUser.getIdToken(true);
		console.debug('✅ Auth token obtained for API request', {
			uid: firebaseAuth.currentUser.uid,
			email: firebaseAuth.currentUser.email,
			tokenLength: token.length
		});
		return token;
	} catch (error) {
		console.error('❌ Failed to get auth token:', error);
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
	console.log('🌐 API Request:', {
		method: options.method || 'GET',
		url: fullUrl,
		hasAuth: !!token,
		headers: Object.keys(headers),
		useEmulators: PUBLIC_USE_EMULATORS,
		baseUrl: API_BASE_URL
	});

	const response = await fetch(fullUrl, {
		...options,
		headers
	});

	console.log('📡 API Response:', {
		status: response.status,
		statusText: response.statusText,
		ok: response.ok,
		url: fullUrl
	});

	// Always parse JSON response first
	let data;
	try {
		data = await response.json();
		console.log('📦 Response data preview:', {
			success: data.success,
			hasData: !!data.data,
			dataType: typeof data.data,
			error: data.error
		});
	} catch (parseError) {
		console.error('❌ Failed to parse response JSON:', parseError);
		// If JSON parsing fails, it's likely a real network error or invalid response
		if (!response.ok) {
			const url = `${API_BASE_URL}/api${endpoint}`;
			throw new Error(
				`${response.status} ${response.statusText || 'Network Error'} (${options.method || 'GET'} ${url})`
			);
		}
		throw parseError;
	}

	// For non-200 responses, throw an error that includes both status and parsed response
	if (!response.ok) {
		const url = `${API_BASE_URL}/api${endpoint}`;
		const errorMessage = data.message || data.error || response.statusText || 'Unknown error';

		console.error('❌ API Error Response:', {
			status: response.status,
			statusText: response.statusText,
			errorMessage,
			data
		});

		// Create error with status info but also attach the parsed response
		const error = new Error(
			`${response.status} ${errorMessage} (${options.method || 'GET'} ${url})`
		);
		(error as any).status = response.status;
		(error as any).response = data;
		throw error;
	}

	console.log('✅ API request successful');
	return data;
}

/**
 * Type-safe API request with runtime validation (no wrapper format)
 * @param endpoint - API endpoint path
 * @param options - Fetch options
 * @param schema - Zod schema for response validation
 */
export async function typedApiRequest<T>(
	endpoint: string,
	options: RequestInit,
	schema: z.ZodType<T>
): Promise<T> {
	const rawResponse = await apiRequest<T>(endpoint, options);

	// Enhanced debugging for response structure
	console.log('🔍 Raw response from backend:', {
		endpoint,
		method: options.method || 'GET',
		dataType: typeof rawResponse,
		rawResponse: JSON.stringify(rawResponse, null, 2)
	});

	// Extract data from API response wrapper if present
	// Handle both wrapped ({ success: true, data: {...} }) and direct responses
	let dataToValidate = rawResponse;
	let isApiWrapper = false;

	if (
		rawResponse &&
		typeof rawResponse === 'object' &&
		'success' in rawResponse &&
		'data' in rawResponse
	) {
		// API response wrapper format
		console.debug('🔧 Detected API wrapper format, extracting data field');
		isApiWrapper = true;
		dataToValidate = (rawResponse as any).data;

		// Handle API errors from wrapper
		if (!(rawResponse as any).success) {
			const error = (rawResponse as any).error || 'API request failed';
			throw new Error(error);
		}

		// For array endpoints: convert null to empty array
		if (dataToValidate === null && schema._def.typeName === 'ZodArray') {
			console.debug('🔧 Converting null array response to empty array');
			dataToValidate = [];
		}
	}

	// Add detailed logging for debugging validation issues
	console.debug('Data to validate:', JSON.stringify(dataToValidate, null, 2));
	console.debug('Schema type:', schema._def.typeName);
	console.debug('Is API wrapper:', isApiWrapper);

	const validation = safeValidateApiResponse(schema, dataToValidate);

	if (!validation.success) {
		console.error('🚨 API RESPONSE VALIDATION FAILED 🚨');
		console.error('Endpoint:', endpoint);
		console.error('Method:', options.method || 'GET');
		console.error('Schema expected:', schema._def);
		console.error('Response data:', JSON.stringify(rawResponse, null, 2));
		console.error('Validation errors:', validation.error);
		console.error('Detailed error format:', JSON.stringify(validation.error, null, 2));

		// Create more descriptive error message
		const errorDetails = validation.error.issues
			? validation.error.issues
					.map(
						(issue) =>
							`Path: ${issue.path.join('.')}, Expected: ${issue.expected}, Received: ${issue.received}, Message: ${issue.message}`
					)
					.join('; ')
			: validation.error;

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
