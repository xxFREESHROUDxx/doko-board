import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    // Lives under src/ so tsconfig.app.json type-checks it with everything else.
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    // Deliberately not UTC. Due dates are stored at UTC midnight but "today" is
    // the viewer's local day, and in a UTC runner those coincide — hiding every
    // local-vs-UTC bug the date helpers exist to prevent.
    env: { TZ: "America/Los_Angeles" },
  },
});
