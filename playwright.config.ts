import { defineConfig, devices } from '@playwright/test';

const PORT = 4790;
const RELAY_PORT = 4791;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    // A local stand-in relay, so tests never touch public relays.
    { command: `node tools/fake-relay.mjs ${RELAY_PORT}`, port: RELAY_PORT, reuseExistingServer: !process.env.CI },
    {
      // Tests the real production build, service worker included, pointed at the stand-in relay.
      command: 'npm run build && npm run preview',
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_RELAYS: `ws://localhost:${RELAY_PORT}` },
    },
  ],
});
