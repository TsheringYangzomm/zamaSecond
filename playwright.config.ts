import { defineConfig, devices } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", testMatch: /smoke\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    { name: "webkit", testMatch: /smoke\.spec\.ts/, use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "e2e-anon-key",
      VITE_PUBLIC_SITE_URL: process.env.VITE_PUBLIC_SITE_URL || "http://127.0.0.1:4173",
      VITE_EMAILJS_PUBLIC_KEY: process.env.VITE_EMAILJS_PUBLIC_KEY || "e2e-public-key",
      VITE_EMAILJS_SERVICE_ID: process.env.VITE_EMAILJS_SERVICE_ID || "e2e-service",
      VITE_EMAILJS_TEMPLATE_ID: process.env.VITE_EMAILJS_TEMPLATE_ID || "e2e-contact-template",
      VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID: process.env.VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID || "e2e-autoreply-template",
    },
  },
});
