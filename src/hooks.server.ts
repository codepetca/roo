import "$lib/sentry.server.config";
import { handleErrorWithSentry, sentryHandle } from "@sentry/sveltekit";
import { sequence } from "@sveltejs/kit/hooks";
import * as Sentry from "@sentry/sveltekit";
import type { HandleServerError } from "@sveltejs/kit";

const myErrorHandler: HandleServerError = ({
  error,
  event,
  status,
  message,
}) => {
  console.error(
    "Server error:",
    error,
    "Event:",
    event,
    "Status:",
    status,
    "Message:",
    message,
  );

  // Capture additional context for server errors and 404s
  const extra: Record<string, any> = {
    url: event.url.toString(),
    route: event.route?.id,
    method: event.request.method,
    userAgent: event.request.headers.get('user-agent'),
    status: status,
    message: message,
  };

  // Add auth context if available
  const authHeader = event.request.headers.get('authorization');
  if (authHeader) {
    extra.hasAuth = true;
  }

  // Capture 404s in Sentry with proper context
  if (status === 404) {
    Sentry.captureException(new Error(`Server 404: ${event.url.pathname}`), {
      tags: {
        error_type: 'server_404',
        status_code: '404',
        method: event.request.method
      },
      extra
    });
  } else if (error) {
    // For other server errors, add server context
    Sentry.captureException(error, {
      tags: {
        error_type: 'server_error',
        status_code: status?.toString()
      },
      extra
    });
  }
};

export const handleError = handleErrorWithSentry(myErrorHandler);

export const handle = sequence(sentryHandle());
