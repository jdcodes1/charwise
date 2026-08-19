import { defineConfig } from "@playwright/test";

// A dedicated port, not Vite's default 5173: that one is routinely occupied by
// another project's dev server, and `reuseExistingServer` would then point the
// suite at somebody else's app instead of failing honestly.
const PORT = 5273;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
});
