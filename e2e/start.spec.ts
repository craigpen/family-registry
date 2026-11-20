import { expect, test } from '@playwright/test';

// Until the app opens to everyone, only the start link (#start=<code>) offers to start a family.
test('without the start link, nobody can start a new family', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'I have my words' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a new family' })).toHaveCount(0);

  await page.goto('./#start=not-the-code');
  await page.reload();
  await expect(page.getByRole('button', { name: 'I have my words' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a new family' })).toHaveCount(0);
});

test('the start link goes straight to starting a family, then leaves the address bar', async ({ page }) => {
  await page.goto('./#start=e2e');
  await page.getByLabel('Your first name').fill('Dad');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome Dad!' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
});
