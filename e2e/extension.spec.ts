import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The real browser extension, loaded into Chromium: adding from a shop page without leaving
 * it, the whole app in the side panel, and importing an Amazon list into the side panel.
 * Shop pages come from the extractor's sample pages, so nothing goes online.
 */
const root = join(import.meta.dirname, '..');
const ext = join(root, 'dist', 'extension');
const samples = join(root, 'packages', 'extract', 'test', 'pages');
const APP = 'http://localhost:4790/';

test.skip(({ isMobile }) => isMobile, 'extensions are desktop-only');
// One browser with the extension, shared by these tests in turn.
test.describe.configure({ mode: 'serial' });

let ctx: BrowserContext;
let extId = '';

type Chrome = { chrome: { tabs: { getCurrent(): Promise<{ index: number }>; query(q: object): Promise<{ id: number; index: number }[]> } } };

/**
 * The popup normally reads the active tab. Opened as a page, it's told which tab to read:
 * the one just before it. (Tab addresses are hidden from the extension on purpose.)
 */
async function popupFor(url: string): Promise<Page> {
  const shop = await ctx.newPage();
  await shop.goto(url);
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=-1`);
  const tabId = await popup.evaluate(async () => {
    const c = (globalThis as unknown as Chrome).chrome;
    const me = await c.tabs.getCurrent();
    return (await c.tabs.query({})).find(t => t.index === me.index - 1)!.id;
  });
  await popup.goto(`chrome-extension://${extId}/popup.html?tab=${tabId}`);
  return popup;
}

async function myListHas(title: string | RegExp) {
  const app = await ctx.newPage();
  await app.goto(APP);
  await app.getByRole('navigation').getByRole('button', { name: 'My list' }).click();
  await expect(app.getByRole('button', { name: title })).toBeVisible();
  return app;
}

test.beforeAll(async () => {
  execFileSync('node', [join(root, 'tools', 'build-extension.mjs'), APP, '--test-host=https://*/*']);
  ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  await ctx.route('https://shop.test/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'jsonld-graph.html'), 'utf8') }));
  await ctx.route('https://northwind.test/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'shop-options.html'), 'utf8') }));
  await ctx.route('https://www.amazon.com/gp/cart/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'amazon-cart.html'), 'utf8') }));
  await ctx.route('https://www.amazon.com/hz/wishlist/**', route => route.fulfill({ contentType: 'text/html', body: readFileSync(join(samples, 'amazon-list.html'), 'utf8') }));
  await ctx.route(/https:\/\/(shop\.test\/img|m\.media-amazon\.com|cdn\.fancykites\.test|northwind\.test\/sweater\.jpg)/, route => route.fulfill({ status: 404 }));
  const page = await ctx.newPage();
  await page.goto('chrome://extensions');
  extId = await page.evaluate(async () => {
    const all = await (globalThis as unknown as { chrome: { developerPrivate: { getExtensionsInfo(): Promise<{ id: string; name: string }[]> } } }).chrome.developerPrivate.getExtensionsInfo();
    return all.find(e => e.name === 'Family wish lists')!.id;
  });
  await page.close();
});

test.afterAll(async () => { await ctx?.close(); });

test('Chrome loads the extension with no errors or warnings', async () => {
  const page = await ctx.newPage();
  await page.goto('chrome://extensions');
  const info = await page.evaluate(async () => {
    type Info = { name: string; installWarnings: string[]; manifestErrors: { message: string }[]; runtimeErrors: { message: string }[] };
    const all = await (globalThis as unknown as { chrome: { developerPrivate: { getExtensionsInfo(): Promise<Info[]> } } }).chrome.developerPrivate.getExtensionsInfo();
    const e = all.find(x => x.name === 'Family wish lists')!;
    return [...e.installWarnings, ...e.manifestErrors.map(m => m.message)];
  });
  expect(info).toEqual([]);
  await page.close();
});

test('before signing in, the popup finishes in the Add sheet', async () => {
  const popup = await popupFor('https://shop.test/kites/rainbow');
  await expect(popup.getByLabel('What is it?')).toHaveValue('Rainbow Stunt Kite');
  // The first visit in a new browser is slow while the site loads behind the scenes.
  await expect(popup.getByText(/Not signed in on this computer yet/)).toBeVisible({ timeout: 20_000 });
  const opened = ctx.waitForEvent('page');
  await popup.getByRole('button', { name: 'Add to my wish list' }).click();
  const added = await opened;
  // Signed out, the wish list asks you to sign in first (and keeps the item to add after).
  await expect(added.getByRole('heading', { name: 'Family wish lists' })).toBeVisible();
  await added.close();
});

test('signed in: the popup adds in place, and it shows up in the app', async () => {
  // Sign in on the website in this browser; the extension shares it.
  const app = await ctx.newPage();
  await app.goto(APP);
  await app.getByRole('button', { name: 'Start a new family' }).click();
  await app.getByLabel('Your first name').fill('Dad');
  await app.getByRole('button', { name: 'Start' }).click();
  await app.getByRole('button', { name: /Not now, just look around|Just use it in the browser/ }).click();
  await app.getByRole('button', { name: 'People', exact: true }).click();
  await app.getByRole('button', { name: 'Add someone' }).click();
  await app.getByLabel('Their name').fill('Lily');
  await app.getByRole('button', { name: 'Add Lily' }).click();
  await expect(app.getByLabel('Invite message')).toBeVisible(); // Lily is saved
  await app.close();

  const popup = await popupFor('https://shop.test/kites/rainbow');
  await expect(popup.getByRole('heading', { name: 'Add to a wish list' })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Me' })).toHaveAttribute('aria-pressed', 'true');
  await popup.getByRole('button', { name: 'Add to my list' }).click();
  await expect(popup.getByRole('heading', { name: 'Added to your list' })).toBeVisible();
  await (await myListHas(/Rainbow Stunt Kite/)).close();
});

test('the size and color chosen on the page go into Notes, and a secret idea goes to the right person', async () => {
  const popup = await popupFor('https://northwind.test/sweater');
  await expect(popup.getByLabel('Notes')).toHaveValue('Size: L · Color: Forest green');
  await popup.getByRole('button', { name: 'Lily' }).click();
  await expect(popup.getByText(/A secret idea for Lily/)).toBeVisible();
  await popup.getByRole('button', { name: 'Add as a secret idea for Lily' }).click();
  await expect(popup.getByRole('heading', { name: 'Added as a secret idea for Lily' })).toBeVisible();

  const app = await ctx.newPage();
  await app.goto(APP);
  await app.getByRole('button', { name: /Lily/ }).click();
  await expect(app.getByText('Secret ideas for Lily')).toBeVisible();
  await app.getByRole('button', { name: /Merino crew sweater/ }).click();
  await expect(app.getByText('Size: L · Color: Forest green')).toBeVisible();
  await app.close();
});

test('on a cart, the extension says so instead of guessing', async () => {
  const popup = await popupFor('https://www.amazon.com/gp/cart/view.html');
  await expect(popup.getByRole('heading', { name: 'This is your cart' })).toBeVisible();
  await expect(popup.getByText('null')).toHaveCount(0);
  await popup.getByRole('button', { name: 'Add this page anyway' }).click();
  await expect(popup.getByLabel('What is it?')).toHaveValue('');
});

test('the side panel is the whole app, already signed in', async () => {
  const panel = await ctx.newPage();
  await panel.goto(`chrome-extension://${extId}/sidepanel.html`);
  await expect(panel.frameLocator('#app').getByRole('heading', { name: 'Hi, Dad' })).toBeVisible();
  await panel.close();
});

test('an Amazon list is loaded in the background and reviewed in the side panel', async () => {
  // Stand in for the side panel the popup opens (Playwright can't see the real one).
  const panel = await ctx.newPage();
  await panel.goto(`chrome-extension://${extId}/sidepanel.html?view=import`);
  await expect(panel.frameLocator('#app').getByText('Waiting for the list')).toBeVisible();

  const popup = await popupFor('https://www.amazon.com/hz/wishlist/ls/TEST1');
  await expect(popup.getByRole('heading', { name: 'Import this Amazon list' })).toBeVisible();
  await popup.getByRole('button', { name: 'Import this list' }).click();
  // A real popup closes as soon as it loses focus: the import must carry on without it.
  await popup.close();

  const app = panel.frameLocator('#app');
  await expect(app.getByRole('heading', { name: 'Whose list is this?' })).toBeVisible({ timeout: 15_000 });
  await expect(app.getByText("“Lily's birthday”, 2 things")).toBeVisible();
  await expect(app.getByRole('button', { name: /Lily/ })).toHaveAttribute('aria-pressed', 'true');
});

test("in the side panel, + offers the shop page you're on", async () => {
  const shop = await ctx.newPage();
  await shop.goto('https://shop.test/kites/rainbow');
  const panel = await ctx.newPage();
  await panel.goto(`chrome-extension://${extId}/sidepanel.html`);
  const shopTab = await panel.evaluate(async () => {
    const c = (globalThis as unknown as Chrome).chrome;
    const me = await c.tabs.getCurrent();
    return (await c.tabs.query({})).find(t => t.index === me.index - 1)!.id;
  });
  // Stand in for the real side panel, which sits beside the shop's tab.
  await panel.goto(`chrome-extension://${extId}/sidepanel.html?tab=${shopTab}`);
  const app = panel.frameLocator('#app');
  await app.getByRole('button', { name: 'Add a wish' }).click();
  await expect(app.getByLabel('What is it?')).toHaveValue('Rainbow Stunt Kite');
  await expect(app.getByLabel('Price')).toHaveValue('$34.99');
  await expect(app.getByText(/From the page you're on \(Fancy Kites\)/)).toBeVisible();
  await app.getByRole('button', { name: 'Add something else' }).click();
  await expect(app.getByLabel('What is it?')).toHaveValue('');
  await panel.close();
  await shop.close();
});
