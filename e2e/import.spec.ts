import { expect, test, type Page } from '@playwright/test';
import { addPersonAndGetLink, startFamily } from './helpers.ts';

/* What the browser extension hands to /import after reading an Amazon list. */
const list = {
  source: 'amazon',
  name: "Lily's birthday",
  url: 'https://www.amazon.com/hz/wishlist/ls/TEST1',
  items: [
    { asin: 'B0PAINTS01', title: 'Watercolor Paint Set, 36 colors', url: 'https://www.amazon.com/dp/B0PAINTS01', image: '', price: '$24.99', highest: true, notes: 'The one with the metal tin' },
    { asin: 'B0PLUSH002', title: 'Giant hamster plush', url: 'https://www.amazon.com/dp/B0PLUSH002', image: '', price: '', highest: false, notes: 'Would like 2' },
  ],
};

/** Acts as the extension does: waits for the page to say it's ready, then posts the list. */
const handOver = (page: Page) => page.evaluate(l => {
  const send = () => window.postMessage({ type: 'family-registry/import', list: l }, location.origin);
  window.addEventListener('message', e => { if (e.data?.type === 'family-registry/import-ready') send(); });
  send();
}, list);

test("importing an Amazon list onto a child's list, as secret ideas, without duplicates", async ({ page }) => {
  await startFamily(page, 'Dad');
  await addPersonAndGetLink(page, 'Lily');
  await page.keyboard.press('Escape');

  await page.goto('./import');
  await expect(page.getByText('Waiting for the list')).toBeVisible();
  await handOver(page);

  await expect(page.getByRole('heading', { name: 'Whose list is this?' })).toBeVisible();
  // "Lily's birthday" suggests Lily; Dad isn't her helper, so they become secret ideas.
  await expect(page.getByRole('button', { name: /Lily/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/They become secret ideas for Lily/)).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('button', { name: 'Import 2 things' })).toBeVisible();
  await page.getByRole('button', { name: 'Import 2 things' }).click();
  await expect(page.getByRole('status')).toContainText('Imported 2 things');
  await expect(page.getByText('Secret ideas for Lily')).toBeVisible();
  const paints = page.getByRole('button', { name: /Watercolor Paint Set/ });
  await expect(paints).toContainText('$24.99');
  await paints.click();
  await expect(page.getByText('The one with the metal tin')).toBeVisible();
  await page.keyboard.press('Escape');

  // Import the same list again: it goes straight to Lily, and nothing is added twice.
  await page.goto('./import');
  await handOver(page);
  await expect(page.getByRole('button', { name: /Lily/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Already on the list')).toHaveCount(2);
  await expect(page.getByRole('button', { name: /^Import/ })).toBeDisabled();
});

test('importing onto your own list', async ({ page }) => {
  await startFamily(page, 'Dad');
  await page.goto('./import');
  await page.evaluate(l => {
    const send = () => window.postMessage({ type: 'family-registry/import', list: { ...l, name: 'My wish list' } }, location.origin);
    window.addEventListener('message', e => { if (e.data?.type === 'family-registry/import-ready') send(); });
    send();
  }, list);
  await expect(page.getByRole('button', { name: 'Me' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /Giant hamster plush/ }).click(); // untick one
  await page.getByRole('button', { name: 'Import 1 thing' }).click();
  await expect(page.getByRole('heading', { name: 'My list' })).toBeVisible();
  const paints = page.getByRole('button', { name: /Watercolor Paint Set/ });
  await expect(paints).toBeVisible();
  await expect(paints.locator('.heart')).toBeVisible(); // "highest" became Really want
  await expect(page.getByRole('button', { name: /Giant hamster plush/ })).toHaveCount(0);
});

test('the Add sheet offers the pictures a helper found', async ({ page }) => {
  await startFamily(page, 'Dad');
  const px = (c: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="${c}"/></svg>`)}`;
  const p = new URLSearchParams({ url: 'https://shop.test/kite', title: 'Rainbow kite', price: '$34.99', site: 'Fancy Kites' });
  p.append('image', px('red'));
  p.append('image', px('blue'));
  await page.goto('./add#' + p.toString());
  await expect(page.getByLabel('What is it?')).toHaveValue('Rainbow kite');
  await expect(page.getByRole('button', { name: 'Picture 1' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Picture 2' }).click();
  await expect(page.getByRole('button', { name: 'Picture 2' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'My list' }).click();
  await expect(page.getByRole('button', { name: /Rainbow kite/ }).locator('img')).toHaveAttribute('src', /blue/);
});
