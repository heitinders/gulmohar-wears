import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3001", channel: "chrome", headless: true },
  webServer: { command: "npm run dev", url: "http://localhost:3001/styleguide", reuseExistingServer: true },
});
