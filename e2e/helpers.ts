import { expect, type Browser, type Page } from '@playwright/test';

/** Starts a new family as its organizer and lands on the Family screen. */
export async function startFamily(page: Page, name = 'Dad') {
  await page.goto('./#start=e2e');
  await page.getByLabel('Your first name').fill(name);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('heading', { name: `Welcome ${name}!` })).toBeVisible();
  await leaveWelcome(page);
  await expect(page.getByRole('heading', { name: `Hi ${name}` })).toBeVisible();
}

/**
 * From the welcome greeting to the app: skipping the one-time About you step, not setting up
 * this device, and skipping the how-to. For tests that don't care about any of them.
 */
export async function leaveWelcome(page: Page) {
  await page.getByRole('button', { name: "Let's go" }).click();
  await expect(page.getByRole('heading', { name: 'A little about you' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await leaveSetup(page);
}

/**
 * Past this device's setup step (Not now) and the one-time how-to (Skip). The setup step doesn't
 * show where there's nothing to set up (the gift button is already installed).
 */
export async function leaveSetup(page: Page) {
  const notNow = page.getByRole('button', { name: 'Not now' });
  const skip = page.getByRole('button', { name: 'Skip', exact: true });
  await notNow.or(skip).first().waitFor();
  if (await notNow.isVisible()) await notNow.click();
  await skip.click();
}

/** A picture to use as a face photo: a solid square, as PNG bytes (drawn in the page, so no files are needed). */
export async function picture(page: Page, color = '#3A7D5C'): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const b64 = await page.evaluate(c => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = c; ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#F4D9A0'; ctx.beginPath(); ctx.arc(200, 140, 80, 0, Math.PI * 2); ctx.fill();
    return canvas.toDataURL('image/png').split(',')[1]!;
  }, color);
  return { name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
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
