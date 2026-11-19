import { chromium, expect, test, type BrowserContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The real browser extension, loaded into Chromium, reading a shop page and opening the
 * Add sheet. Shop pages are served from the extractor's sample pages, so nothing goes online.
 */
const root = join(import.meta.dirname, '..');
const ext = join(root, 'dist', 'extension');
const samples = join(root, 'packages', 'extract', 'test', 'pages');

test.skip(({ isMobile }) => isMobile, 'extensions are desktop-only');
// One browser with the extension, shared by these tests in turn.
test.describe.configure({ mode: 'serial' });

let ctx: BrowserContext;
let extId = '';

test.beforeAll(async () => {
  execFileSync('node', [join(root, 'tools', 'build-extension.mjs'), 'http://localhost:4790/', '--test-host=https://*/*']);
  ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  await ctx.route('https://shop.test/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'jsonld-graph.html'), 'utf8') }));
  await ctx.route('https://shop.test/img/**', route => route.fulfill({ status: 404 }));
  // Find the extension's id from the extensions page.
  const page = await ctx.newPage();
  await page.goto('chrome://extensions');
  extId = await page.evaluate(async () => {
    const all = await (globalThis as unknown as { chrome: { developerPrivate: { getExtensionsInfo(): Promise<{ id: string; name: string }[]> } } }).chrome.developerPrivate.getExtensionsInfo();
    return all.find(e => e.name === 'Family wish lists')!.id;
  });
  await page.close();
});

test.afterAll(async () => { await ctx?.close(); });

test('the extension reads a shop page and opens the Add sheet filled in', async () => {
  // Set up a family in this browser first.
  const app = await ctx.newPage();
  await app.goto('http://localhost:4790/');
  await app.getByRole('button', { name: 'Start a new family' }).click();
  await app.getByLabel('Your first name').fill('Dad');
  await app.getByRole('button', { name: 'Start' }).click();
  await app.getByRole('button', { name: /Not now, just look around|Just use it in the browser/ }).click();

  const shop = await ctx.newPage();
  await shop.goto('https://shop.test/kites/rainbow');
  // The popup normally reads the active tab. Opened as a page, it's told which tab to read:
  // the shop, opened just before it. (Tab addresses are hidden from the extension on purpose.)
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=-1`);
  const shopTab = await popup.evaluate(async () => {
    const c = (globalThis as unknown as { chrome: { tabs: { getCurrent(): Promise<{ id: number; index: number }>; query(q: object): Promise<{ id: number; index: number }[]> } } }).chrome;
    const me = await c.tabs.getCurrent();
    const all = await c.tabs.query({});
    return all.find(t => t.index === me.index - 1)!.id;
  });
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=${shopTab}`);
  await expect(popup.getByRole('heading', { name: 'Add to my wish list' })).toBeVisible();
  await expect(popup.getByLabel('What is it?')).toHaveValue('Rainbow Stunt Kite');
  await expect(popup.getByText('Fancy Kites · $34.99')).toBeVisible();

  const opened = ctx.waitForEvent('page');
  await popup.getByRole('button', { name: 'Add to my wish list' }).click();
  const added = await opened;
  await added.waitForLoadState();
  await expect(added.getByLabel('What is it?')).toHaveValue('Rainbow Stunt Kite');
  await expect(added.getByLabel('Price')).toHaveValue('$34.99');
  await expect(added.getByLabel('Where to get it')).toHaveValue('Fancy Kites');
  await expect(added.getByLabel('Link (optional)')).toHaveValue('https://shop.test/kites/rainbow');
});

test('the size and color chosen on the page go into Notes', async () => {
  await ctx.route('https://northwind.test/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'shop-options.html'), 'utf8') }));
  const shop = await ctx.newPage();
  await shop.goto('https://northwind.test/sweater');
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=-1`);
  const shopTab = await popup.evaluate(async () => {
    const c = (globalThis as unknown as { chrome: { tabs: { getCurrent(): Promise<{ index: number }>; query(q: object): Promise<{ id: number; index: number }[]> } } }).chrome;
    const me = await c.tabs.getCurrent();
    return (await c.tabs.query({})).find(t => t.index === me.index - 1)!.id;
  });
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=${shopTab}`);
  await expect(popup.getByLabel('Notes')).toHaveValue('Size: L · Color: Forest green');
  const opened = ctx.waitForEvent('page');
  await popup.getByRole('button', { name: 'Add to my wish list' }).click();
  const added = await opened;
  await expect(added.getByLabel('Notes')).toHaveValue('Size: L · Color: Forest green');
  await expect(added.getByLabel('Price')).toHaveValue('$88');
});

test("on a cart, the extension says so instead of guessing", async () => {
  await ctx.route('https://www.amazon.com/gp/cart/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'amazon-cart.html'), 'utf8') }));
  const cart = await ctx.newPage();
  await cart.goto('https://www.amazon.com/gp/cart/view.html');
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=-1`);
  const cartTab = await popup.evaluate(async () => {
    const c = (globalThis as unknown as { chrome: { tabs: { getCurrent(): Promise<{ index: number }>; query(q: object): Promise<{ id: number; index: number }[]> } } }).chrome;
    const me = await c.tabs.getCurrent();
    return (await c.tabs.query({})).find(t => t.index === me.index - 1)!.id;
  });
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=${cartTab}`);
  await expect(popup.getByRole('heading', { name: 'This is your cart' })).toBeVisible();
  await expect(popup.getByText('null')).toHaveCount(0);
  await popup.getByRole('button', { name: 'Add this page anyway' }).click();
  await expect(popup.getByLabel('What is it?')).toHaveValue('');
  await expect(popup.getByText('null')).toHaveCount(0);
});

test('the extension imports an Amazon list into the app', async () => {
  await ctx.route('https://www.amazon.com/hz/wishlist/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'amazon-list.html'), 'utf8') }));
  await ctx.route('https://m.media-amazon.com/**', route => route.fulfill({ status: 404 }));
  const list = await ctx.newPage();
  await list.goto('https://www.amazon.com/hz/wishlist/ls/TEST1');
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=-1`);
  const listTab = await popup.evaluate(async () => {
    const c = (globalThis as unknown as { chrome: { tabs: { getCurrent(): Promise<{ index: number }>; query(q: object): Promise<{ id: number; index: number }[]> } } }).chrome;
    const me = await c.tabs.getCurrent();
    return (await c.tabs.query({})).find(t => t.index === me.index - 1)!.id;
  });
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=${listTab}`);
  await expect(popup.getByRole('heading', { name: 'Import this Amazon list' })).toBeVisible();

  const opened = ctx.waitForEvent('page');
  await popup.getByRole('button', { name: 'Import this list' }).click();
  // A real popup closes as soon as it loses focus: the import must carry on without it.
  await popup.close();
  const app = await opened;
  await expect(app.getByRole('heading', { name: 'Whose list is this?' })).toBeVisible({ timeout: 15_000 });
  await expect(app.getByText("“Lily's birthday”, 2 things")).toBeVisible();
});
