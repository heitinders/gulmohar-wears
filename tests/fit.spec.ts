import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const routes = ['/fit', '/fit/measure', '/fit/profile'];

async function heightOnlyDraft(page: Page) {
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

test('fit routes render one h1 without horizontal overflow', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const route of routes) { await page.goto(route); await expect(page.locator('main h1')).toHaveCount(1); for (const width of [390, 430, 768, 1024, 1440]) { await page.setViewportSize({width, height: 900}); expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}`).toBe(width); } }
  expect(errors).toEqual([]);
});

test('the measuring shell hides the site chrome and the tape rail tracks the step', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844}); await page.goto('/fit/measure');
  await expect(page.locator('.site-header')).toBeHidden(); await expect(page.locator('.floating-contacts')).toBeHidden();
  await expect(page.locator('.tape-steps li[aria-current=step]')).toHaveText(/01Style/);
  await page.emulateMedia({reducedMotion: 'reduce'});
  expect(await page.locator('.tape-progress').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
});

test('height is validated beside the field and style cards work from the keyboard', async ({page}) => {
  await page.goto('/fit/measure');
  await page.getByLabel(/^Height/).fill('640'); await page.getByLabel(/^Height/).blur();
  await expect(page.getByRole('alert').filter({hasText: 'between 47 and 87'})).toBeVisible();
  const sharara = page.getByRole('button', {name: /Sharara/}); await sharara.focus(); await page.keyboard.press('Space');
  await expect(sharara).toHaveAttribute('aria-pressed', 'true');
});

test('height-only draft reaches WhatsApp with inches first and the DRAFT code', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await heightOnlyDraft(page);
  await expect(page.getByText('DRAFT, TAILOR TO VERIFY')).toBeVisible();
  await expect(page.locator('.ledger-row').first()).toContainText('from height');
  await expect(page.locator('.ledger-group').nth(1)).toHaveText('Bottom (under Anarkali)');
  const href = (await page.getByRole('link', {name: 'Continue to WhatsApp'}).getAttribute('href'))!;
  const text = new URL(href).searchParams.get('text')!;
  expect(new URL(href).origin + new URL(href).pathname).toBe('https://wa.me/918699841800');
  expect(text).toContain('Photos: height only'); expect(text).toContain('Anarkali length:'); expect(text).toMatch(/Draft code: GW1\./); expect(text).not.toMatch(/[—–]/);
});

test('tape calibration validates and recolours the bust row', async ({page}) => {
  await heightOnlyDraft(page);
  await page.getByLabel(/Tape measure/).fill('10'); await page.getByRole('button', {name: 'Apply tape'}).click();
  await expect(page.getByRole('alert').filter({hasText: 'between 16 and 63'})).toBeVisible();
  await page.getByLabel(/Tape measure/).fill('34'); await page.getByRole('button', {name: 'Apply tape'}).click();
  const bust = page.locator('.ledger-row', {hasText: 'Bust'}).first();
  await expect(bust).toContainText('34'); await expect(bust).toContainText('your tape'); await expect(bust.locator('.conf')).toHaveAttribute('data-level', 'high');
});

test('saving keeps the draft on this phone and the profile page can reopen it', async ({page}) => {
  await heightOnlyDraft(page);
  await page.getByRole('button', {name: 'Save to this phone'}).click();
  await expect(page.getByRole('status')).toContainText('Saved in this browser only');
  await page.goto('/fit/profile');
  await expect(page.locator('.profile-card')).toHaveCount(1);
  await page.getByRole('link', {name: 'Use saved measures'}).click();
  await expect(page).toHaveURL(/step=result/); await expect(page.locator('.ledger-row')).toHaveCount(13);
});

test('the camera step keeps its actions above the fold at 390 by 844', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('blocked', 'NotAllowedError')); });
  await page.goto('/fit/measure');
  await page.getByRole('button', {name: /Anarkali/}).click();
  await page.getByLabel(/^Height/).fill('64'); await page.getByLabel(/^Height/).blur();
  await page.getByRole('button', {name: 'Next: Photos'}).click();
  await expect(page.getByText('Camera not available.')).toBeVisible();
  for (const name of ['Take photo', 'Upload instead']) { const box = (await page.getByRole('button', {name}).boundingBox())!; expect(box.y + box.height, name).toBeLessThanOrEqual(844); }
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(844);
});

test('a reopened photo profile keeps its confidence through tape and clear, and a missing value shows n/a', async ({page}) => {
  await heightOnlyDraft(page);
  await page.getByRole('button', {name: 'Save to this phone'}).click();
  await expect(page.getByRole('status')).toContainText('Saved in this browser only');
  // Turn the saved draft into a photo profile as it would be stored, with one corrupt value.
  await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('gulmohar_fit_profile_v1')!);
    const p = list[0];
    for (const m of [p.measures, p.rawMeasures]) { m.mode = 'landmarks'; for (const k of Object.keys(m.sources)) m.sources[k] = 'landmark+side'; m.neck = null; }
    for (const c of [p.confidence, p.rawConfidence]) for (const k of Object.keys(c)) c[k] = 86;
    localStorage.setItem('gulmohar_fit_profile_v1', JSON.stringify(list));
  });
  await page.goto('/fit/profile'); await page.getByRole('link', {name: 'Use saved measures'}).click();
  await expect(page).toHaveURL(/step=result/);
  const row = (name: string) => page.locator('.ledger-row', {hasText: name}).first();
  await expect(row('Neck')).toContainText('n/a');
  await page.getByLabel(/Tape measure/).fill('34'); await page.getByRole('button', {name: 'Apply tape'}).click();
  await expect(row('Bust')).toContainText('confidence 90%'); await expect(row('Shoulder')).toContainText('confidence 86%');
  await page.getByRole('button', {name: 'Clear'}).click();
  await expect(row('Bust')).toContainText('confidence 86%'); await expect(row('Shoulder')).toContainText('confidence 86%');
});

test('accessibility checks on the fit routes', async ({page}) => {
  test.setTimeout(120000);
  for (const width of [390, 1440]) { await page.setViewportSize({width, height: 900}); for (const route of routes) { await page.goto(route); const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(result.violations, `${route} at ${width}`).toEqual([]); } }
  await heightOnlyDraft(page);
  const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(result.violations).toEqual([]);
});
