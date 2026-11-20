import { expect, test } from '@playwright/test';
import { addPersonAndGetLink, startFamily } from './helpers.ts';

// Until the app opens to everyone, only the start link (#start=<code>) offers to start a family.
test('without the start link, nobody can start a new family', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'I lost my link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a new family' })).toHaveCount(0);

  await page.goto('./#start=not-the-code');
  await page.reload();
  await expect(page.getByRole('button', { name: 'I lost my link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a new family' })).toHaveCount(0);
});

test('the start link goes straight to starting a family, then leaves the address bar', async ({ page }) => {
  await page.goto('./#start=e2e');
  await page.getByLabel('Your first name').fill('Dad');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome Dad!' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
});

test('I lost my link: the organizer types the number on screen, and that device signs in', async ({ page, browser }) => {
  await startFamily(page);
  await addPersonAndGetLink(page, 'Mom');

  const ctx = await browser.newContext();
  const mom = await ctx.newPage();
  await mom.goto('./');
  await expect(mom.getByRole('button', { name: 'I have my words' })).toHaveCount(0);
  await mom.getByRole('button', { name: 'I lost my link' }).click();
  const number = (await mom.getByLabel('Your number').textContent())!.replace(/\D/g, '');
  expect(number).toHaveLength(6);

  await page.getByRole('button', { name: 'They lost their link' }).click();
  await page.getByLabel('Their number').fill(number);
  await page.getByRole('button', { name: 'Sign them in' }).click();
  await expect(page.getByRole('status')).toContainText('Mom’s device is signing in');

  await expect(mom.getByRole('heading', { name: 'Hi Mom' })).toBeVisible({ timeout: 30_000 });
  await ctx.close();
});
