// This is just a very simple API route that throws an example error.
// Feel free to delete this file and the entire sentry route.

import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
  throw new Error("Sentry Example API Route Error");
};
