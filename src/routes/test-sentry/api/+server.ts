import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  console.log('API route called - throwing test error...');
  throw new Error('Manual Sentry Test - Server Error');
};