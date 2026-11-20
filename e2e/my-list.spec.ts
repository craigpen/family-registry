import { expect, test } from '@playwright/test';
import { addWish, goToMyList, startFamily } from './helpers.ts';

test('add a wish and find it again after reloading', async ({ page }) => {
  await startFamily(page);
  await goToMyList(page);
  await page.getByRole('button', { name: 'Add your first wish' }).click();
  await page.getByLabel('What is it?').fill('Cast-iron pizza pan');
  await page.getByLabel('Price').fill('$39.95');
  await page.getByRole('button', { name: 'I really want this' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('status')).toContainText('Added to your list');
  await expect(page.getByRole('button', { name: /Cast-iron pizza pan/ })).toContainText('$39.95');

  await page.reload();
  await goToMyList(page);
  await expect(page.getByRole('button', { name: /Cast-iron pizza pan/ })).toBeVisible();
});

test('a pasted link fills in the title and shop', async ({ page }) => {
  await startFamily(page);
  await goToMyList(page);
  await page.getByRole('button', { name: 'Add a wish' }).click();
  await page.getByLabel('Link (optional)').fill('https://www.amazon.com/LEGO-Botanical-Bonsai-Tree/dp/B08YP7KXQW');
  await expect(page.getByLabel('What is it?')).toHaveValue('LEGO Botanical Bonsai Tree');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /LEGO Botanical Bonsai Tree/ })).toContainText('Amazon');
});

test('remove with undo, edit, and mark as received', async ({ page }) => {
  await startFamily(page);
  await goToMyList(page);
  for (const title of ['Wool socks', 'Mystery novel']) {
    await addWish(page, title);
    await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
  }

  await page.getByRole('button', { name: /Wool socks/ }).click();
  await page.getByRole('button', { name: 'Remove from my list' }).click();
  await expect(page.getByRole('button', { name: /Wool socks/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /Wool socks/ })).toBeVisible();

  await page.getByRole('button', { name: /Wool socks/ }).click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('What is it?').fill('Wool hiking socks (L)');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('heading', { name: 'Wool hiking socks (L)' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: /Mystery novel/ }).click();
  await page.getByRole('button', { name: 'I got it' }).click();
  await expect(page.getByRole('status')).toContainText('Moved to Received');
  await expect(page.getByRole('button', { name: /Mystery novel/ })).toBeHidden();
  await page.getByText('Received', { exact: true }).click();
  await expect(page.getByRole('button', { name: /Mystery novel/ })).toBeVisible();
});

test('a link shared to the app opens the Add sheet filled in', async ({ page }) => {
  await startFamily(page);
  await page.goto('./add?text=' + encodeURIComponent('Check out this kite https://www.etsy.com/listing/123456789/rainbow-stunt-kite'));
  await expect(page.getByLabel('What is it?')).toHaveValue('Rainbow Stunt Kite');
  await expect(page.getByLabel('Link (optional)')).toHaveValue('https://www.etsy.com/listing/123456789/rainbow-stunt-kite');
});

test('works with no connection once installed', async ({ page, context }) => {
  await startFamily(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await goToMyList(page);
  await addWish(page, 'Garden kneeler');
  await expect(page.getByRole('button', { name: /Garden kneeler/ })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await goToMyList(page);
  await expect(page.getByRole('button', { name: /Garden kneeler/ })).toBeVisible();
  await addWish(page, 'Seed catalog');
  await expect(page.getByRole('button', { name: /Seed catalog/ })).toBeVisible();
  await expect(page.getByText(/No connection/)).toBeVisible();
});

test('larger text setting sticks', async ({ page }) => {
  await startFamily(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Larger text' }).click();
  await expect(page.locator('html')).toHaveClass(/large/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/large/);
});

test('a tip goes away with Got it and stays away', async ({ page }) => {
  await startFamily(page);
  await goToMyList(page);
  const tip = page.getByText('You\'ll never see who\'s getting something on your list.');
  await expect(tip).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(tip).toBeHidden();
  await page.reload();
  await goToMyList(page);
  await expect(page.getByRole('heading', { name: 'My list' })).toBeVisible();
  await expect(tip).toBeHidden();
});

test('the setup guide shows steps for the device it is opened on', async ({ page, isMobile }) => {
  await page.goto('./help');
  await expect(page.getByRole('heading', { name: 'Getting set up' })).toBeVisible();
  await expect(page.getByRole('button', { name: isMobile ? 'Android' : 'Computer' })).toHaveAttribute('aria-pressed', 'true');
  if (!isMobile) {
    // On a computer: the gift button comes first; a tab or an installed window are under Other ways.
    await expect(page.getByText('Recommended')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The wish list extension' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'In a browser tab' })).toBeHidden();
    await page.getByText('Other ways', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'In a browser tab' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'As its own window' })).toBeVisible();
  }
  await page.getByRole('button', { name: 'iPhone or iPad' }).click();
  await expect(page.getByText('Add to Home Screen').first()).toBeVisible();
  // Whoever builds the Shortcut copies its script in one tap.
  await page.getByText('Other ways: adding from shops, faster').click();
  await expect(page.getByRole('button', { name: 'Copy the Shortcut script' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get Add to wish list' })).toHaveAttribute('href', /^https:\/\/www\.icloud\.com\/shortcuts\//);
});

test("long shop names: one tap shortens them all, with Undo", async ({ page }) => {
  await startFamily(page);
  await goToMyList(page);
  const long = 'DJI Neo, Mini Drone with 4K UHD Camera for Adults, 135g Self Flying Drone that Follows You, Palm Takeoff';
  await page.goto('./add#' + new URLSearchParams({ url: 'https://shop.test/dji', title: long }).toString());
  // Shortened as it arrives, with the long one a click away in Edit if wanted.
  await expect(page.getByLabel('What is it?')).toHaveValue('DJI Neo');
  await page.getByLabel('What is it?').fill(long);
  await expect(page.getByRole('button', { name: 'Shorten to “DJI Neo”' })).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await goToMyList(page);
  await page.getByRole('button', { name: 'Shorten', exact: true }).click();
  await expect(page.getByRole('button', { name: /^DJI Neo/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Palm Takeoff/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /Palm Takeoff/ })).toBeVisible();
});
