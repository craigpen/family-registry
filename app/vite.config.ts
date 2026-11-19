/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the site under /<repo>/. Set BASE_PATH=/family-registry/ there.
const base = process.env.BASE_PATH ?? '/';

// GitHub Pages has no rewrites, so /add (the share target) would 404 on first visit.
// Serving index.html as 404.html makes every path load the app.
const spaFallback = (): Plugin => ({
  name: 'spa-404',
  apply: 'build',
  closeBundle() {
    const dist = resolve(import.meta.dirname, 'dist');
    copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
  },
});

// In development, run the stand-in relay alongside the dev server (see app/.env.development).
const devRelay = (): Plugin => ({
  name: 'dev-relay',
  apply: 'serve',
  async configureServer() {
    if (process.env.VITEST) return;
    // @ts-expect-error plain JS tool script
    const { startRelay } = await import('../tools/fake-relay.mjs');
    startRelay(4791);
  },
});

export default defineConfig({
  base,
  // ~175 KB gzipped (React, Dexie, the Nostr crypto libraries), cached offline after the first visit.
  build: { chunkSizeWarningLimit: 700 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Family Registry',
        short_name: 'Wish lists',
        description: 'Our family wish lists, for Christmas and birthdays.',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#FBF6EE',
        theme_color: '#FBF6EE',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        // Android's Share menu: shared links arrive at /add?url=…&title=…&text=…
        share_target: { action: `${base}add`, method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
    spaFallback(),
    devRelay(),
  ],
  test: {
    name: 'app',
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    testTimeout: 30_000,
  },
});
