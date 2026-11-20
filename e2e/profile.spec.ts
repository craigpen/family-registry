import { expect, test, type Page } from '@playwright/test';
import { addPersonAndGetLink, leaveSetup, leaveWelcome, openOnNewDevice, picture, startFamily } from './helpers.ts';

/*
 * Faces: each person's photo and birthday, in their own profile event.
 * Set by the person (first-time About you, or Settings), or by an organizer or helper.
 */

/** The photo inside a face (or a People row), once it has one. */
const photoIn = (page: Page, name: RegExp) => page.getByRole('button', { name }).locator('.avatar img');

test('a new person adds a photo and birthday in About you, and the family sees both', async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const link = await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');

  const mom = await openOnNewDevice(browser, link);
  await expect(mom.getByRole('heading', { name: 'Welcome Mom!' })).toBeVisible();
  await mom.getByRole('button', { name: "Let's go" }).click();
  await expect(mom.getByRole('heading', { name: 'A little about you' })).toBeVisible();
  await mom.locator('.face-picker input[type=file]').first().setInputFiles(await picture(mom));
  await expect(mom.locator('.face-picker .avatar img')).toHaveAttribute('src', /^data:image\/(webp|jpeg)/);
  await expect(mom.getByRole('button', { name: 'Remove photo' })).toBeVisible();
  await mom.getByLabel('Birthday month').selectOption('April');
  await mom.getByLabel('Birthday day').selectOption('1');
  await mom.getByRole('button', { name: 'Done' }).click();
  await leaveSetup(mom);
  await expect(mom.getByRole('heading', { name: 'Hi Mom' })).toBeVisible();

  // Dad sees her face on the family screen, on the People screen, and her birthday on her list.
  await dad.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(photoIn(dad, /Mom/)).toBeVisible({ timeout: 15_000 });
  // Small enough for every device: around 8 KB.
  expect((await photoIn(dad, /Mom/).getAttribute('src'))!.length).toBeLessThan(16_000);
  await dad.getByRole('button', { name: 'People', exact: true }).click();
  await expect(photoIn(dad, /Mom/)).toBeVisible();
  await dad.getByRole('button', { name: 'Back', exact: true }).click();
  await dad.getByRole('button', { name: /Mom/ }).click();
  await expect(dad.getByText('Birthday Apr 1')).toBeVisible();

  // Mom's own face, in Settings: removing it has an Undo, not a question.
  await mom.getByRole('button', { name: 'Settings' }).click();
  await expect(mom.locator('.face-picker .avatar img')).toBeVisible();
  await mom.getByRole('button', { name: 'Remove photo' }).click();
  await expect(mom.getByRole('status')).toContainText('Photo removed');
  await mom.getByRole('status').getByRole('button', { name: 'Undo' }).click();
  await expect(mom.locator('.face-picker .avatar img')).toBeVisible();

  // About you shows once per device: not again after a reload.
  await mom.reload();
  await expect(mom.getByRole('heading', { name: 'Hi Mom' })).toBeVisible();
  await expect(mom.getByRole('heading', { name: 'A little about you' })).toHaveCount(0);
  await mom.context().close();
});

test("the organizer sets a child's photo, and the family sees it", async ({ page: dad, browser }) => {
  await startFamily(dad, 'Dad');
  const link = await addPersonAndGetLink(dad, 'Mom');
  await dad.keyboard.press('Escape');
  await dad.getByRole('button', { name: 'Add someone' }).click();
  await dad.getByLabel('Their name').fill('Pip');
  await dad.getByRole('button', { name: /They won't use the app/ }).click();
  await dad.getByRole('button', { name: 'Add Pip' }).click();
  await expect(dad.getByRole('status')).toContainText('You manage their list');

  // From Pip's list: tap the face.
  await dad.getByRole('button', { name: 'Back', exact: true }).click();
  await dad.getByRole('button', { name: /Pip/ }).click();
  await dad.getByRole('button', { name: "Change Pip's photo and birthday" }).click();
  await dad.locator('.face-picker input[type=file]').first().setInputFiles(await picture(dad, '#C44E3A'));
  await expect(dad.getByRole('dialog').locator('.face-picker .avatar img')).toBeVisible();
  await dad.getByRole('button', { name: 'Save' }).click();
  await expect(dad.getByRole('status')).toContainText('Saved');
  await expect(dad.locator('.phead .avatar img')).toBeVisible();

  const mom = await openOnNewDevice(browser, link);
  await leaveWelcome(mom);
  await expect(photoIn(mom, /Pip/)).toBeVisible({ timeout: 15_000 });
  // Mom isn't Pip's helper or an organizer, so Pip's face isn't hers to change.
  await mom.getByRole('button', { name: /Pip/ }).click();
  await expect(mom.getByRole('button', { name: "Change Pip's photo and birthday" })).toHaveCount(0);
  await mom.context().close();
});
