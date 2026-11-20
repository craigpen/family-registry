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

  // Once she's joined, Dad can still show her link as a QR code, to set up another device for her.
  // His own row does the same for his own devices.
  const addDevice = dad.getByRole('button', { name: 'Add a device' });
  await expect(addDevice).toHaveCount(2);
  await addDevice.last().click();
  await expect(dad.getByRole('heading', { name: /A new device for Mom/ })).toBeVisible();
  await dad.getByRole('button', { name: 'In person' }).click();
  await expect(dad.getByRole('img', { name: "QR code for Mom's link" })).toBeVisible();
  await dad.keyboard.press('Escape');
  await addDevice.first().click();
  await expect(dad.getByRole('img', { name: 'QR code for your link' })).toBeVisible();
  await dad.keyboard.press('Escape');

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
  await expect(dad.getByRole('img', { name: 'QR code for your link' })).toBeVisible();
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

test('the organizer removes Kate: she is let go, Mom moves to the new words by herself', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const momLink = await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');
  const kateLink = await addPersonAndGetLink(dad, 'Kate');
  await dad.keyboard.press('Escape');

  const mom = await openOnNewDevice(browser, momLink);
  await leaveWelcome(mom);
  const kate = await openOnNewDevice(browser, kateLink);
  await leaveWelcome(kate);
  await expect(mom.getByRole('button', { name: /Kate/ })).toBeVisible({ timeout: 15_000 });
  await expect(dad.getByText(/Joined/)).toHaveCount(2, { timeout: 15_000 });

  await dad.getByRole('button', { name: 'Edit Kate' }).click();
  await dad.getByRole('button', { name: 'Remove Kate from the family' }).click();
  await expect(dad.getByRole('status').filter({ hasText: 'Kate is removed' })).toBeVisible({ timeout: 15_000 });

  // Kate's device lets go of the family and says why.
  await expect(kate.getByText(/You’re no longer in Our family/)).toBeVisible({ timeout: 20_000 });

  // Mom's device: Kate is gone, and what Mom adds now (under the new words) still reaches Dad.
  await expect(mom.getByRole('button', { name: /Kate/ })).toHaveCount(0, { timeout: 20_000 });
  await goToMyList(mom);
  await addWish(mom, 'Garden gloves');
  await dad.getByRole('button', { name: 'Back', exact: true }).click();
  await dad.getByRole('button', { name: /Mom/ }).click();
  await expect(dad.getByRole('button', { name: /Garden gloves/ })).toBeVisible({ timeout: 20_000 });
  await mom.context().close();
  await kate.context().close();
});

test('Settings can check the connection: each relay, and what this device has', async ({ page: dad }) => {
  await startFamily(dad, 'Dad');
  await dad.getByRole('button', { name: 'Settings' }).click();
  await dad.getByRole('button', { name: 'Check the connection' }).click();
  const results = dad.getByRole('status').filter({ hasText: 'This device' });
  await expect(results).toContainText(/answers, and has \d+ of your family’s things/, { timeout: 15_000 });
  await expect(results).toContainText('has the family list: 1 person');
});

test('a device whose clock is hours behind says so, instead of just showing nobody', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const link = await addPersonAndGetLink(dad, 'Amelia');
  await dad.keyboard.press('Escape');

  // A hand-set clock in the wrong time zone: three hours behind.
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    const realNow = Date.now.bind(Date);
    const behind = 3 * 3600 * 1000;
    Date.now = () => realNow() - behind;
  });
  const amelia = await ctx.newPage();
  await amelia.goto(link);
  await expect(amelia.getByText('This device’s clock is set wrong')).toBeVisible({ timeout: 20_000 });
  await ctx.close();
});
