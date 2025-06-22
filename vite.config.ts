import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, loadEnv } from "vite";
import { sentrySvelteKit } from "@sentry/sveltekit";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProduction = mode === "production";

  return {
    plugins: [
      sentrySvelteKit({
        sourceMapsUploadOptions: {
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
        },
      }),
      sveltekit(),
    ],
    define: {
      "process.env.SUPABASE_URL": JSON.stringify(env.SUPABASE_URL),
      "process.env.SUPABASE_SERVICE_ROLE_KEY": JSON.stringify(
        env.SUPABASE_SERVICE_ROLE_KEY,
      ),
      "process.env.ANTHROPIC_API_KEY": JSON.stringify(env.ANTHROPIC_API_KEY),
      "process.env.SENTRY_DSN": JSON.stringify(env.SENTRY_DSN),
      "process.env.NODE_ENV": JSON.stringify(mode),
      "import.meta.env.VITE_SENTRY_DSN": JSON.stringify(env.VITE_SENTRY_DSN),
      "import.meta.env.VITE_NODE_ENV": JSON.stringify(mode),
    },
    build: {
      target: "es2020",
      minify: isProduction ? "esbuild" : false,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Only chunk client-side modules
            if (id.includes("node_modules")) {
              if (id.includes("@supabase/supabase-js")) {
                return "vendor-supabase";
              }
              if (id.includes("@anthropic-ai/sdk")) {
                return "vendor-anthropic";
              }
              if (id.includes("@codemirror/")) {
                return "vendor-codemirror";
              }
              if (id.includes("marked") || id.includes("dotenv")) {
                return "vendor-utils";
              }
              return "vendor";
            }
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        "@supabase/supabase-js",
        "@anthropic-ai/sdk",
        "codemirror",
        "marked",
      ],
    },
    server: {
      port: 5173,
      strictPort: false,
    },
    preview: {
      port: 4173,
      strictPort: false,
    },
  };
});
