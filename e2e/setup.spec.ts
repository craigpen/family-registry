import { expect, test, type Browser } from '@playwright/test';
import { addPersonAndGetLink, startFamily } from './helpers.ts';

/*
 * Getting set up on a device: one path picked for the device, and a green check the app sets
 * itself. Here: Firefox on Windows is sent to Edge; when Edge signs in with the link, Firefox's
 * step turns green. Browsers are told apart by their user agent, so both run in Chromium.
 */

const FIREFOX_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';
const EDGE_WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';

test.skip(({ isMobile }) => isMobile, 'computer browsers');

async function openAs(browser: Browser, userAgent: string, link: string) {
  const ctx = await browser.newContext({ userAgent });
  const page = await ctx.newPage();
  await page.goto(link);
  return page;
}

test('Firefox is sent to Edge, turns green when Edge signs in, then shows the how-to once', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const link = await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');

  const firefox = await openAs(browser, FIREFOX_WINDOWS, link);
  await firefox.getByRole('button', { name: "Let's go" }).click();
  await firefox.getByRole('button', { name: 'Skip for now' }).click();
  await expect(firefox.getByRole('heading', { name: 'Open it in Edge' })).toBeVisible();
  await expect(firefox.getByText('This turns green by itself once it\'s done.')).toBeVisible();
  await expect(firefox.getByRole('button', { name: 'Not now' })).toBeVisible();

  // Mom pastes her link into Edge. She's been set up already, so Edge skips About you and the how-to.
  const edge = await openAs(browser, EDGE_WINDOWS, link);
  await expect(firefox.getByRole('status').filter({ hasText: 'You\'re signed in on Edge' })).toBeVisible({ timeout: 15_000 });
  await edge.getByRole('button', { name: "Let's go" }).click();
  await expect(edge.getByRole('heading', { name: 'Add the wish list extension' })).toBeVisible();
  await edge.getByRole('button', { name: 'Not now' }).click();
  await expect(edge.getByRole('heading', { name: 'Hi Mom' })).toBeVisible();

  // Back in Firefox: Continue, then four pictures of how it works, once.
  await firefox.getByRole('button', { name: 'Continue' }).click();
  await expect(firefox.getByRole('heading', { name: 'Your wish list' })).toBeVisible();
  await firefox.getByRole('button', { name: 'Next' }).click();
  await expect(firefox.getByRole('heading', { name: 'Everyone else\'s' })).toBeVisible();
  await firefox.getByRole('button', { name: 'Next' }).click();
  await expect(firefox.getByRole('heading', { name: 'Pick something to get' })).toBeVisible();
  await firefox.getByRole('button', { name: 'Next' }).click();
  await expect(firefox.getByRole('heading', { name: 'After the big day' })).toBeVisible();
  await firefox.getByRole('button', { name: 'See the family' }).click();
  await expect(firefox.getByRole('heading', { name: 'Hi Mom' })).toBeVisible();

  // Settings shows this computer as set up, and another device is one button away.
  await firefox.getByRole('button', { name: 'Settings' }).click();
  await expect(firefox.getByRole('button', { name: /This computer.*Set up/ })).toBeVisible();
  await firefox.getByRole('button', { name: 'Use it on another device' }).click();
  await expect(firefox.getByLabel('Pairing code')).toHaveText(/^\d{3} \d{3}$/);
  await expect(firefox.getByRole('button', { name: 'Copy my link' })).toBeVisible();

  // Dad, as organizer, sees where Mom is set up.
  await expect(dad.getByText('Joined: computer browser')).toBeVisible({ timeout: 15_000 });
});
