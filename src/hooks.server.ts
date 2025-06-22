import "$lib/sentry.server.config";
import { handleErrorWithSentry, sentryHandle } from "@sentry/sveltekit";
import { sequence } from "@sveltejs/kit/hooks";
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
};

export const handleError = handleErrorWithSentry(myErrorHandler);

export const handle = sequence(sentryHandle());
