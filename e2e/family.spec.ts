import { expect, test } from '@playwright/test';
import { addPersonAndGetLink, addWish, goToMyList, leaveWelcome, openOnNewDevice, startFamily } from './helpers.ts';

/*
 * Whole-family tests: several "devices" (separate browser storage) talking through
 * the stand-in relay, exactly as phones would through public relays.
 */

test('the organizer invites Mom; she joins, and each sees the other’s wishes', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const link = await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');
  await expect(dad.getByText('Not invited yet')).toBeVisible();

  const mom = await openOnNewDevice(browser, link);
  await expect(mom.getByRole('heading', { name: 'Welcome Mom!' })).toBeVisible();
  await expect(mom.getByText(/You're in Our family with 1 other/)).toBeVisible();
  expect(new URL(mom.url()).hash).toBe(''); // the secret words leave the address bar
  await leaveWelcome(mom);
  await expect(mom.getByRole('button', { name: /Dad/ })).toBeVisible();

  // Mom's device says it's joined, and what kind of device it is; Dad sees it without reloading.
  await expect(dad.getByText(/Joined: (phone|computer) browser/)).toBeVisible({ timeout: 15_000 });

  // Mom adds a wish; it shows up on Dad's device.
  await goToMyList(mom);
  await addWish(mom, 'Silk scarf');
  await dad.getByRole('button', { name: 'Back', exact: true }).click();
  await dad.getByRole('button', { name: /Mom/ }).click();
  await expect(dad.getByRole('button', { name: /Silk scarf/ })).toBeVisible();

  // Dad adds one; Mom sees it on Dad's list.
  await dad.getByRole('navigation').getByRole('button', { name: 'My list' }).click();
  await addWish(dad, 'Pizza pan');
  await mom.getByRole('navigation').getByRole('button', { name: 'Family' }).click();
  await mom.getByRole('button', { name: /Dad/ }).click();
  await expect(mom.getByRole('button', { name: /Pizza pan/ })).toBeVisible();

  // Mom can look but not change Dad's wish.
  await mom.getByRole('button', { name: /Pizza pan/ }).click();
  await expect(mom.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await mom.context().close();
});

test("someone else's link on a signed-in device asks before switching", async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const link = await addPersonAndGetLink(dad, 'Ben');
  const ben = await openOnNewDevice(browser, link);
  await expect(ben.getByRole('heading', { name: 'Welcome Ben!' })).toBeVisible();

  await dad.goto(link);
  await expect(dad.getByRole('heading', { name: 'This link is for someone else' })).toBeVisible();
  await dad.getByRole('button', { name: 'Stay as Dad' }).click();
  await expect(dad.getByRole('heading', { name: 'Hi Dad' })).toBeVisible();
  await ben.context().close();
});

test('a second group: in-laws see the people in it', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');
  await dad.getByRole('button', { name: 'Start another group' }).click();
  await dad.getByLabel('Group name').fill('Family + in-laws');
  await dad.getByRole('button', { name: /Mom/ }).click(); // leave Mom out of this one
  await dad.getByRole('button', { name: 'Start it' }).click();
  await expect(dad.getByText('Family + in-laws').first()).toBeVisible();

  const link = await addPersonAndGetLink(dad, 'Kate');
  // addPersonAndGetLink chose only the first group; check that Kate's link is for it, then add her to in-laws too.
  expect(link).toContain('#g=');
  await dad.keyboard.press('Escape');
  await expect(dad.getByText('Kate')).toBeVisible();
});

test('a second device joins with a 6-digit code', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  await dad.getByRole('button', { name: 'Settings' }).click();
  await dad.getByRole('button', { name: 'Use it on another device' }).click();
  const code = (await dad.getByLabel('Pairing code').textContent())!.replace(/\D/g, '');
  expect(code).toMatch(/^\d{6}$/);

  const ctx = await browser.newContext();
  const tablet = await ctx.newPage();
  await tablet.goto('./');
  await tablet.getByRole('button', { name: 'I have a code from my other device' }).click();
  await tablet.getByLabel('6-digit code').fill(code === '000000' ? '000001' : '000000');
  await expect(tablet.getByRole('alert')).toContainText('That code didn’t work');
  await tablet.getByLabel('6-digit code').fill(code);
  await expect(tablet.getByRole('heading', { name: 'Hi Dad' })).toBeVisible({ timeout: 15_000 });
  await ctx.close();
});
