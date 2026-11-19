/// <reference types="vitest/config" />
import { copyFileSync, readFileSync } from 'node:fs';
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

// The iOS Shortcut's script: the shared extract.js plus a few lines that build the /add link.
// Published at <site>/shortcut.js so it can be copied straight into the Shortcut on an iPhone.
const shortcutScript = (): Plugin => ({
  name: 'shortcut-script',
  apply: 'build',
  generateBundle() {
    const extract = readFileSync(resolve(import.meta.dirname, '../packages/extract/extract.js'), 'utf8');
    const appUrl = process.env.APP_URL ?? `https://craigpen.github.io${base}`;
    this.emitFile({ type: 'asset', fileName: 'shortcut.js', source: `${extract}
;(function () {
  // Family wish lists: iOS Shortcut ("Run JavaScript on Web Page"). See shortcut/README.md.
  var r = FamilyRegistryExtract.extract(document, location.href);
  var p = new URLSearchParams();
  p.set('url', r.url);
  if (r.title) p.set('title', r.title);
  r.images.slice(0, 3).forEach(function (i) { p.append('image', i); });
  if (r.price) p.set('price', r.price);
  if (r.site) p.set('site', r.site);
  if (r.notes) p.set('notes', r.notes);
  completion(${JSON.stringify(appUrl)} + 'add#' + p.toString());
})();
` });
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
        background_color: '#F3F6FA',
        theme_color: '#F3F6FA',
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
        // Real files, not app pages: let them through instead of answering with the app.
        navigateFallbackDenylist: [/\/downloads\//, /\/shortcut\.js$/, /\/privacy(\.html)?$/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
    spaFallback(),
    shortcutScript(),
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
