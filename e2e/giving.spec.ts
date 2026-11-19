import { expect, test, type Page } from '@playwright/test';
import { addPersonAndGetLink, addWish, goToMyList, openOnNewDevice, startFamily } from './helpers.ts';

/** Every replaceable slot this device's database holds (to prove what it never received). */
const slots = (page: Page) => page.evaluate(() => new Promise<string[]>((resolve, reject) => {
  const req = indexedDB.open('family-registry');
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const get = req.result.transaction('events').objectStore('events').getAll();
    get.onsuccess = () => resolve((get.result as { slot: string }[]).map(e => e.slot));
  };
}));

async function join(page: Page) {
  await page.getByRole('button', { name: /Not now, just look around|Just use it in the browser/ }).click();
}

test("I'll get this: the family sees it, the recipient's device never gets it", async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const momLink = await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');
  const lilyLink = await addPersonAndGetLink(dad, 'Lily');
  await dad.keyboard.press('Escape');

  const lily = await openOnNewDevice(browser, lilyLink);
  await join(lily);
  await goToMyList(lily);
  await addWish(lily, 'Watercolor paints');

  const mom = await openOnNewDevice(browser, momLink);
  await join(mom);
  await mom.getByRole('button', { name: /Lily/ }).click();
  await mom.getByRole('button', { name: /Watercolor paints/ }).click();
  await mom.getByRole('button', { name: "I'll get this" }).click();
  await expect(mom.getByRole('status')).toContainText("You're getting the Watercolor paints");
  await expect(mom.getByRole('button', { name: /Watercolor paints/ })).toContainText("You're getting this");

  // Dad sees Mom has it.
  await dad.getByRole('button', { name: 'Back', exact: true }).click();
  await dad.getByRole('button', { name: /Lily/ }).click();
  await expect(dad.getByRole('button', { name: /Watercolor paints/ })).toContainText('Mom is getting this');
  await dad.getByRole('button', { name: /Watercolor paints/ }).click();
  await expect(dad.getByRole('button', { name: "I'll get this" })).toHaveCount(0);
  await dad.keyboard.press('Escape');

  // Mom buys it.
  await mom.getByRole('button', { name: /Watercolor paints/ }).click();
  await mom.getByRole('button', { name: 'I got it' }).click();
  await expect(dad.getByRole('button', { name: /Watercolor paints/ })).toContainText('Mom got this');

  // Lily sees nothing of it, and her device never received a claim.
  await lily.reload();
  await goToMyList(lily);
  await expect(lily.getByRole('button', { name: /Watercolor paints/ })).not.toContainText(/getting|Bought/);
  expect((await slots(lily)).filter(s => s.includes(':claim:'))).toEqual([]);
  await mom.context().close();
  await lily.context().close();
});

test('secret ideas: everyone sees them except the person they are for', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const lilyLink = await addPersonAndGetLink(dad, 'Lily');
  await dad.keyboard.press('Escape');
  await dad.getByRole('button', { name: 'Back', exact: true }).click();

  await dad.getByRole('button', { name: /Lily/ }).click();
  await dad.getByRole('button', { name: 'Add a secret idea for Lily' }).click();
  await expect(dad.getByText("Lily won't see this. Everyone else will.")).toBeVisible();
  await dad.getByLabel('What is it?').fill('Horse riding lesson');
  await dad.getByRole('button', { name: 'Save' }).click();
  await expect(dad.getByText('Secret ideas for Lily')).toBeVisible();
  await expect(dad.getByRole('button', { name: /Horse riding lesson/ })).toContainText('Up for grabs');

  const lily = await openOnNewDevice(browser, lilyLink);
  await join(lily);
  await goToMyList(lily);
  await addWish(lily, 'Sketchbook');
  await expect(lily.getByText('Horse riding lesson')).toHaveCount(0);
  // Her device holds exactly one item, her own: the secret idea never arrived.
  expect((await slots(lily)).filter(s => s.includes(':item:'))).toHaveLength(1);
  await lily.context().close();
});

test("a child who doesn't use the app: a helper keeps their list", async ({ page: dad }) => {
  await startFamily(dad, 'Dad');
  await dad.getByRole('button', { name: 'People', exact: true }).click();
  await dad.getByRole('button', { name: 'Add someone' }).click();
  await dad.getByLabel('Their name').fill('Nora');
  await dad.getByRole('button', { name: /They won't use the app/ }).click();
  await dad.getByRole('button', { name: 'Add Nora' }).click();
  await expect(dad.getByText('Managed by you')).toBeVisible();

  await dad.getByRole('button', { name: 'Back', exact: true }).click();
  await dad.getByRole('button', { name: /Nora/ }).click();
  await dad.getByRole('button', { name: "Add to Nora's list" }).click();
  await dad.getByLabel('What is it?').fill('Soft rabbit');
  await dad.getByRole('button', { name: 'Save' }).click();
  await expect(dad.getByRole('button', { name: /Soft rabbit/ })).toBeVisible();
});
