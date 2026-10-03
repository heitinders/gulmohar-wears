import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFileSync} from 'node:fs';
import {heightOnlyDraft, passGate} from './gate';

// Runs against the fake provider (playwright.config.ts), which returns the catalogue photo, and a cap of 2 a day.
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const PHOTO = readFileSync(new URL('../public/media/dsc06967-1600.jpg', import.meta.url));
const BIG = readFileSync(new URL('../public/media/dsc06967-2400.webp', import.meta.url));
const uniquePhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

async function makePreview(page: Page, look = /Olive-gold/) {
  await page.getByRole('button', {name: look}).click();
  await page.getByLabel('Your photo').setInputFiles({name: 'me.jpg', mimeType: 'image/jpeg', buffer: PHOTO});
  await page.getByRole('button', {name: 'Make my preview'}).click();
}

test.describe('try-on', () => {
  test('try-on needs the gate first', async ({page}) => {
    await page.goto('/fit/try-on');
    await expect(page).toHaveURL(/\/fit\/start\?next=%2Ffit%2Ftry-on/);
  });

  test('a preview always carries the AI label and leads to an order on WhatsApp', async ({page}) => {
    await passGate(page, {name: 'Meher', phone: uniquePhone(), next: '/fit/try-on'});
    await expect(page.locator('main h1')).toHaveText('Try a look on');
    await expect(page.getByRole('button', {name: 'Make my preview'})).toBeDisabled();
    await makePreview(page);
    const preview = page.locator('.tryon-preview');
    await expect(preview.locator('img')).toBeVisible();
    await expect(preview).toContainText('AI preview, not a photograph of the garment');
    const label = await preview.locator('.tryon-label').boundingBox(); const img = await preview.locator('img').boundingBox();
    expect(label && img && label.y >= img.y && label.y + label.height <= img.y + img.height + 60).toBeTruthy();
    await page.getByRole('button', {name: 'I like this'}).click();
    await page.getByRole('radio', {name: 'Ready size'}).check();
    await page.getByLabel('Size', {exact: true}).selectOption('M');
    const href = (await page.getByRole('link', {name: /Order on WhatsApp/}).getAttribute('href'))!;
    const text = new URL(href).searchParams.get('text')!;
    expect(text).toContain('Meher'); expect(text).toContain('Olive-gold embroidered suit'); expect(text).toContain('Ready size: M'); expect(text).toContain('AI preview');
    await page.getByRole('radio', {name: 'Made to measure'}).check();
    expect(new URL((await page.getByRole('link', {name: /Order on WhatsApp/}).getAttribute('href'))!).searchParams.get('text')).toContain('Made to measure');
  });

  test('the photo is re-encoded to a JPEG of at most 1600px before upload, and nothing else rides along', async ({page}) => {
    // Chromium does not hand multipart bodies with files to Playwright, so the page records what it sends.
    await page.addInitScript(() => {
      const send = window.fetch;
      window.fetch = async (input, init) => {
        if (String(input).endsWith('/api/fit/try-on') && init?.body instanceof FormData) {
          const person = init.body.get('person') as Blob; const bitmap = await createImageBitmap(person);
          (window as unknown as {upload: unknown}).upload = {keys: [...init.body.keys()], type: person.type, width: bitmap.width, height: bitmap.height};
        }
        return send(input, init);
      };
    });
    await passGate(page, {name: 'Noor', phone: uniquePhone(), next: '/fit/try-on'});
    await page.getByRole('button', {name: /Olive-gold/}).click();
    await page.getByLabel('Your photo').setInputFiles({name: 'me.webp', mimeType: 'image/webp', buffer: BIG});
    await page.getByRole('button', {name: 'Make my preview'}).click();
    await expect(page.locator('.tryon-preview img')).toBeVisible();
    const upload = await page.evaluate(() => (window as unknown as {upload: {keys: string[]; type: string; width: number; height: number}}).upload);
    expect(upload.keys.sort()).toEqual(['look', 'person', 'token']);
    expect(upload.type).toBe('image/jpeg');
    expect(Math.max(upload.width, upload.height)).toBe(1600);
  });

  test('report this preview says thank you', async ({page}) => {
    await passGate(page, {name: 'Rano', phone: uniquePhone(), next: '/fit/try-on'});
    await makePreview(page);
    await page.getByRole('button', {name: 'Report this preview'}).click();
    await expect(page.locator('main').getByRole('status')).toContainText('Thank you');
  });

  test('after the daily previews are used, the customer is pointed to WhatsApp', async ({page}) => {
    await passGate(page, {name: 'Kiran', phone: uniquePhone(), next: '/fit/try-on'});
    await makePreview(page);
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', {name: 'Try another look'}).click();
      await makePreview(page, /Blue/);
    }
    await expect(page.locator('main').getByRole('alert')).toContainText("You've used today's previews. Message us on WhatsApp and we'll help.");
    await expect(page.locator('main').getByRole('alert').getByRole('link', {name: /WhatsApp/})).toHaveAttribute('href', /wa\.me\/918699841800/);
  });

  test('a vendor failure offers a retry and says it did not count', async ({page}) => {
    await passGate(page, {name: 'Jas', phone: uniquePhone(), next: '/fit/try-on'});
    await page.route('**/api/fit/try-on', r => r.request().method() === 'POST' ? r.fulfill({status: 504, json: {error: 'timeout'}}) : r.continue());
    await makePreview(page);
    await expect(page.locator('main').getByRole('alert')).toContainText("didn't count");
    await page.unroute('**/api/fit/try-on');
    await page.getByRole('button', {name: 'Try again'}).click();
    await expect(page.locator('.tryon-preview img')).toBeVisible();
  });

  test('the draft result links to try-on when it is available', async ({page}) => {
    await passGate(page, {name: 'Harleen', phone: uniquePhone()});
    await heightOnlyDraft(page);
    await page.getByRole('link', {name: 'Try a look on'}).click();
    await expect(page).toHaveURL(/\/fit\/try-on/);
  });

  test('try-on passes axe, has one h1 and fits at 390 and 1440', async ({page}) => {
    await passGate(page, {name: 'Axe', phone: uniquePhone(), next: '/fit/try-on'});
    for (const width of [390, 1440]) {
      await page.setViewportSize({width, height: 900}); await page.goto('/fit/try-on');
      await expect(page.locator('main h1')).toHaveCount(1);
      expect((await new AxeBuilder({page}).withTags(axeTags).analyze()).violations, `picker ${width}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    await makePreview(page);
    await expect(page.locator('.tryon-preview img')).toBeVisible();
    expect((await new AxeBuilder({page}).withTags(axeTags).analyze()).violations, 'preview').toEqual([]);
  });
});
