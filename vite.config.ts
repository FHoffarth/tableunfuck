import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths, so the same build works both at
  // debother.github.io/tableunfuck/ and at a custom domain root.
  // Safe here because the app is a single page with no client-side routing.
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
