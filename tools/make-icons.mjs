// Renders app/public/icon.svg to the PNG icons the manifest and iOS need.
//   node tools/make-icons.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const pub = new URL('../app/public/', import.meta.url);
const svg = readFileSync(new URL('icon.svg', pub), 'utf8');
const sizes = [
  ['icon-192.png', 192, false], ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, fullBleed] of sizes) {
  // Maskable and Apple icons get cropped by the OS, so draw them full-bleed with padding.
  const inner = fullBleed ? svg.replace('rx="112"', 'rx="0"') : svg;
  const scale = fullBleed ? 0.82 : 1;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${fullBleed ? '#CF4339' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${size * scale}px;height:${size * scale}px">${inner.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: new URL(name, pub).pathname.replace(/^\/([A-Z]:)/, '$1'), omitBackground: !fullBleed });
  console.log(name);
}
await browser.close();
