import "$lib/sentry.client.config";
import { handleErrorWithSentry } from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";

const myErrorHandler: HandleClientError = ({ error, event }) => {
  console.error("Client error:", error, event);
};

export const handleError = handleErrorWithSentry(myErrorHandler);
