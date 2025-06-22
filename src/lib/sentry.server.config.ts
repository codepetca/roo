import { init } from "@sentry/sveltekit";
import { dev } from "$app/environment";

init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  beforeSend(event) {
    // Filter out development errors or add custom logic
    if (dev) {
      console.log("Sentry server event:", event);
    }

    // Don't send certain errors in development
    if (dev && event.exception) {
      const error = event.exception.values?.[0];
      if (
        error?.type === "TypeError" &&
        error.value?.includes("fetch failed")
      ) {
        // Common development error - don't send to Sentry
        return null;
      }
    }

    return event;
  },
  initialScope: {
    tags: {
      component: "server",
    },
  },
});
