import { defineConfig } from "@playwright/test";

// The suite runs against the in-memory Find Your Fit backend and the fake try-on provider, so the whole journey
// is tested without Supabase or Gemini keys. Both are refused by the app in production.
export const STUDIO_DEV_EMAIL = "studio@example.com";
export const STUDIO_DEV_PASSWORD = "playwright-studio-password";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3001", channel: "chrome", headless: true },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001/styleguide",
    reuseExistingServer: true,
    env: {
      FIT_BACKEND: "memory",
      FIT_TOKEN_SECRET: "playwright-only-token-secret",
      FIT_DEV_GATE_LIMIT: "1000",
      STUDIO_DEV_EMAIL,
      STUDIO_DEV_PASSWORD,
      FIT_TRYON_ENABLED: "true",
      GEMINI_PAID_TIER_CONFIRMED: "true",
      FIT_TRYON_PROVIDER: "fake",
      FIT_TRYON_DAILY_CAP: "2",
    },
  },
});
