import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        // jsdom's localStorage is per-origin; the default about:blank has
        // no origin and exposes `undefined` for window.localStorage.
        // Setting a real URL unblocks it for tests that persist state.
        url: "http://localhost/",
      },
    },
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
