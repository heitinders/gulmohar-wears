import {expect, type Page} from '@playwright/test';

/** Passes the consent gate through the real UI, as a customer would. Each test gets a fresh browser context. */
export async function passGate(page: Page, {name = 'Simran', phone = '98765 43210', next = '/fit/measure'} = {}) {
  await page.goto(`/fit/start?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByLabel('Phone or WhatsApp number').fill(phone);
  await page.getByRole('checkbox', {name: /I agree to Gulmohar Wears/}).check();
  await page.getByRole('button', {name: 'Continue'}).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[?]/g, '\\?')));
}

export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** From the style step to a height-only draft: the pose model is blocked, so the flow offers height only. */
export async function heightOnlyDraft(page: Page) {
  await page.route('**/models/**', r => r.abort()); // the pose model cannot load, so the flow must offer height only
  await page.goto('/fit/measure');
  await page.getByRole('button', {name: /Anarkali/}).click();
  await page.getByLabel(/^Height/).fill('64'); await page.getByLabel(/^Height/).blur();
  await page.getByRole('button', {name: 'Next: Photos'}).click();
  await expect(page).toHaveURL(/step=photos/);
  for (const shot of ['front', 'side']) {
    await page.getByLabel('Upload a photo').setInputFiles({name: `${shot}.png`, mimeType: 'image/png', buffer: PNG});
    await page.getByRole('button', {name: 'Use this photo'}).click();
  }
  await page.getByRole('button', {name: 'Use height only'}).click();
  await expect(page).toHaveURL(/step=result/);
}
