import { defineConfig, devices } from '@playwright/test';

// E2E_PORT lets two checkouts run their tests at once (each needs its own app and relay ports).
const PORT = Number(process.env.E2E_PORT ?? 4790);
const RELAY_PORT = PORT + 1;

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
      command: `npm run build && cd app && npx vite preview --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // The start link's code in tests is "e2e" (this is its SHA-256).
      env: { VITE_RELAYS: `ws://localhost:${RELAY_PORT}`, VITE_START_HASH: '6d8749c4fe00b757c1bc1c376a99f31d1bd38b422d44f5b6aa2d6a6c5e975cba' },
    },
  ],
});
