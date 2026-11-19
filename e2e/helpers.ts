import { expect, type Browser, type Page } from '@playwright/test';

/** Starts a new family as its organizer and lands on the Family screen. */
export async function startFamily(page: Page, name = 'Dad') {
  await page.goto('./');
  await page.getByRole('button', { name: 'Start a new family' }).click();
  await page.getByLabel('Your first name').fill(name);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: `Welcome, ${name}!` })).toBeVisible();
  await page.getByRole('button', { name: /Not now, just look around|Just use it in the browser/ }).click();
  await expect(page.getByRole('heading', { name: `Hi, ${name}` })).toBeVisible();
}

export async function goToMyList(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: 'My list' }).click();
  await expect(page.getByRole('heading', { name: 'My list' })).toBeVisible();
}

export async function addWish(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add a wish' }).click();
  await page.getByLabel('What is it?').fill(title);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText('Added');
}

/** As the organizer: add someone and return the invite message's link. */
export async function addPersonAndGetLink(page: Page, name: string): Promise<string> {
  const addSomeone = page.getByRole('button', { name: 'Add someone' });
  const people = page.getByRole('button', { name: 'People', exact: true });
  await addSomeone.or(people).first().waitFor();
  if (await people.isVisible()) await people.click();
  await addSomeone.click();
  await page.getByLabel('Their name').fill(name);
  await page.getByRole('button', { name: `Add ${name}` }).click();
  const msg = page.getByLabel('Invite message');
  await expect(msg).toContainText('#g=');
  const text = await msg.inputValue();
  return text.match(/https?:\/\/\S+#g=\S+/)![0];
}

/** Opens a link on a separate "device" (its own browser storage). */
export async function openOnNewDevice(browser: Browser, link: string): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(link);
  return page;
}
