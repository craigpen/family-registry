import { devices, expect, test } from '@playwright/test';
import { addPersonAndGetLink, startFamily } from './helpers.ts';

test.skip(({ isMobile }) => isMobile, 'runs its own phone');

/*
 * Android, with the app installed: Chrome takes a moment to say so. The setup step must not pop
 * up meanwhile (it used to, on every open, only to say "The app is installed").
 */
test('with the Android app installed, opening the site never pops up the setup step', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const link = await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');

  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript(() => {
    (navigator as Navigator & { getInstalledRelatedApps?: unknown }).getInstalledRelatedApps =
      () => new Promise(resolve => setTimeout(() => resolve([{ platform: 'play', id: 'app.familyregistry.helper' }]), 1200));
  });
  const mom = await ctx.newPage();
  await mom.goto(link);
  await expect(mom.getByRole('heading', { name: 'Welcome Mom!' })).toBeVisible({ timeout: 15_000 });
  await mom.getByRole('button', { name: "Let's go" }).click();
  await mom.getByRole('button', { name: 'Skip for now' }).click();
  // Already set up: on to the how-to, past it, home.
  const skip = mom.getByRole('button', { name: 'Skip', exact: true });
  const cont = mom.getByRole('button', { name: 'Continue' });
  await skip.or(cont).first().click();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(mom.locator('h1', { hasText: 'Hi Mom' })).toBeVisible();

  // Open it again, twice: no setup step either time.
  for (let i = 0; i < 2; i++) {
    await mom.reload();
    await expect(mom.locator('h1', { hasText: 'Hi Mom' })).toBeVisible();
    await mom.waitForTimeout(2500);
    await expect(mom.getByRole('dialog')).toHaveCount(0);
  }
  await ctx.close();
});
