import { expect, test, type Page } from '@playwright/test';

async function startFamily(page: Page, name = 'Dad') {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start a new family' }).click();
  await page.getByLabel('Your first name').fill(name);
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByRole('heading', { name: 'My list' })).toBeVisible();
}

test('start a family, add a wish, and find it again after reloading', async ({ page }) => {
  await startFamily(page);
  await page.getByRole('button', { name: 'Add your first wish' }).click();
  await page.getByLabel('What is it?').fill('Cast-iron pizza pan');
  await page.getByLabel('Price').fill('$39.95');
  await page.getByRole('button', { name: 'I really want this' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('status')).toContainText('Added to your list');
  const card = page.getByRole('button', { name: /Cast-iron pizza pan/ });
  await expect(card).toContainText('$39.95');

  await page.reload();
  await expect(page.getByRole('button', { name: /Cast-iron pizza pan/ })).toBeVisible();
});

test('a pasted link fills in the title and shop', async ({ page }) => {
  await startFamily(page);
  await page.getByRole('button', { name: 'Add a wish' }).click();
  await page.getByLabel('Link (optional)').fill('https://www.amazon.com/LEGO-Botanical-Bonsai-Tree/dp/B08YP7KXQW');
  await expect(page.getByLabel('What is it?')).toHaveValue('LEGO Botanical Bonsai Tree');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /LEGO Botanical Bonsai Tree/ })).toContainText('Amazon');
});

test('remove with undo, edit, and mark as received', async ({ page }) => {
  await startFamily(page);
  for (const title of ['Wool socks', 'Mystery novel']) {
    await page.getByRole('button', { name: 'Add a wish' }).click();
    await page.getByLabel('What is it?').fill(title);
    await page.getByRole('button', { name: 'Save' }).click();
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
  await expect(page.getByText('Received', { exact: true })).toBeVisible();
  // It leaves the wish list and waits, folded away, under Received.
  await expect(page.getByRole('button', { name: /Mystery novel/ })).toBeHidden();
  await page.getByText('Received', { exact: true }).click();
  await expect(page.getByRole('button', { name: /Mystery novel/ })).toBeVisible();
});

test('a personal link signs you in on another device', async ({ page, browser }) => {
  await startFamily(page, 'Mom');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.getByRole('button', { name: 'Show my words' }).click();
  const words = (await page.getByLabel('Your words').textContent())!.trim().split(/\s+/);
  expect(words).toHaveLength(16);

  const other = await browser.newContext();
  const page2 = await other.newPage();
  const link = `./#g=${words.slice(0, 6).join('-')}&m=${words.slice(6, 12).join('-')}&o=${words.slice(12).join('-')}`;
  await page2.goto(link);
  await expect(page2.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
  // The secret words leave the address bar once saved.
  expect(new URL(page2.url()).hash).toBe('');
  await other.close();
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
  await page.getByRole('button', { name: 'Add your first wish' }).click();
  await page.getByLabel('What is it?').fill('Garden kneeler');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /Garden kneeler/ })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: /Garden kneeler/ })).toBeVisible();
  await page.getByRole('button', { name: 'Add a wish' }).click();
  await page.getByLabel('What is it?').fill('Seed catalogue');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /Seed catalogue/ })).toBeVisible();
});

test('larger text setting sticks', async ({ page }) => {
  await startFamily(page);
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.getByRole('button', { name: 'Larger text' }).click();
  await expect(page.locator('html')).toHaveClass(/large/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/large/);
});
