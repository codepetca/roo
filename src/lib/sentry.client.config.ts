import { browser } from "$app/environment";
import { init, replayIntegration } from "@sentry/sveltekit";

if (browser) {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_NODE_ENV || "development",
    tracesSampleRate:
      import.meta.env.VITE_NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate:
      import.meta.env.VITE_NODE_ENV === "production" ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    beforeSend(event) {
      // Filter out development errors or sensitive information
      if (import.meta.env.VITE_NODE_ENV === "development") {
        console.log("Sentry event:", event);
      }
      return event;
    },
    initialScope: {
      tags: {
        component: "client",
      },
    },
  });
}
