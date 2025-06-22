import "$lib/sentry.client.config";
import { handleErrorWithSentry } from "@sentry/sveltekit";
import * as Sentry from "@sentry/sveltekit";
import type { HandleClientError } from "@sveltejs/kit";

const myErrorHandler: HandleClientError = ({ error, event, status, message }) => {
  console.error("Client error:", error, event);
  
  // Capture additional context for navigation errors and 404s
  const extra: Record<string, any> = {
    url: event.url?.toString(),
    route: event.route?.id,
    status: status,
    message: message,
  };

  // Add user context if available
  if (typeof window !== 'undefined') {
    const authData = localStorage.getItem('supabase.auth.token');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        extra.userId = parsed.user?.id;
        extra.userEmail = parsed.user?.email;
      } catch {
        // Ignore parsing errors
      }
    }
  }

  // Capture 404s and navigation errors in Sentry
  if (status === 404) {
    Sentry.captureException(new Error(`404 Not Found: ${event.url?.pathname}`), {
      tags: {
        error_type: 'navigation_error',
        status_code: '404'
      },
      extra
    });
  } else if (error) {
    // For other errors, add navigation context
    Sentry.captureException(error, {
      tags: {
        error_type: 'client_error'
      },
      extra
    });
  }
};

export const handleError = handleErrorWithSentry(myErrorHandler);
