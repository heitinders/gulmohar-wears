import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {passGate} from './gate';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const routes = ['/fit', '/fit/start', '/fit/measure', '/fit/profile'];
const axeTags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

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


test.describe('the consent gate', () => {
  test('measuring without a gate token goes to the gate first', async ({page}) => {
    await page.goto('/fit/measure');
    await expect(page).toHaveURL(/\/fit\/start\?next=%2Ffit%2Fmeasure/);
    await expect(page.locator('main h1')).toHaveText('Before we measure');
    await page.goto('/fit/profile');
    await expect(page).toHaveURL(/\/fit\/start\?next=%2Ffit%2Fprofile/);
  });

  test('the intro sends Start my fit through the gate', async ({page}) => {
    await page.goto('/fit');
    await page.getByRole('link', {name: /Start my fit/}).click();
    await expect(page).toHaveURL(/\/fit\/start/);
  });

  test('a number too short for the chosen country is refused beside the field, naming the country', async ({page}) => {
    await page.goto('/fit/start');
    await expect(page.getByLabel('Country')).toHaveValue('IN');
    await page.getByLabel('Your name').fill('Simran');
    await page.getByLabel('Phone or WhatsApp number').fill('7400 1234');
    await page.getByRole('checkbox', {name: /I agree to Gulmohar Wears/}).check();
    await page.getByRole('button', {name: 'Continue'}).click();
    await expect(page.getByRole('alert').filter({hasText: "That doesn't look like a valid number for India."})).toBeVisible();
    await expect(page).toHaveURL(/\/fit\/start/);
    await page.getByLabel('Country').selectOption('GB');
    await page.getByLabel('Phone or WhatsApp number').fill('07400 1234');
    await page.getByRole('button', {name: 'Continue'}).click();
    await expect(page.getByRole('alert').filter({hasText: 'United Kingdom'})).toBeVisible();
  });

  test('consent and a name are required, and say so', async ({page}) => {
    await page.goto('/fit/start');
    await page.getByLabel('Phone or WhatsApp number').fill('98765 43210');
    await page.getByRole('button', {name: 'Continue'}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Tell us your name'})).toBeVisible();
    await page.getByLabel('Your name').fill('Simran');
    await page.getByRole('button', {name: 'Continue'}).click();
    await expect(page.getByRole('alert').filter({hasText: 'Please tick the box'})).toBeVisible();
  });

  test('the consent text links to the privacy section', async ({page}) => {
    await page.goto('/fit/start');
    await expect(page.getByText(/I agree to Gulmohar Wears keeping my name/)).toBeVisible();
    await expect(page.getByRole('link', {name: 'How we use your details'})).toHaveAttribute('href', '/privacy#find-your-fit');
  });

  test('the gate works from the keyboard alone and lands on measuring', async ({page}) => {
    await page.goto('/fit/start?next=%2Ffit%2Fmeasure');
    await page.getByLabel('Your name').focus();
    await page.keyboard.type('Simran');
    await page.keyboard.press('Tab'); // country
    await page.keyboard.press('Tab'); await page.keyboard.type('98765 43210');
    await page.keyboard.press('Tab'); await page.keyboard.press('Space');
    await expect(page.getByRole('checkbox', {name: /I agree/})).toBeChecked();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/fit\/measure/);
  });

  test('a returning phone is welcomed with its masked number and can switch person', async ({page}) => {
    await passGate(page);
    await page.goto('/fit/start');
    await expect(page.locator('main h1')).toHaveText('Welcome back, Simran.');
    await expect(page.getByText('+91 ••••••3210')).toBeVisible();
    await page.getByRole('button', {name: 'Not you? Use another number'}).click();
    await expect(page.getByLabel('Your name')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('gulmohar_fit_token_v1'))).toBeNull();
  });

  test('a tampered token is cleared and sends the phone back to the gate', async ({page}) => {
    await passGate(page);
    await page.evaluate(() => localStorage.setItem('gulmohar_fit_token_v1', 'AAAAAAAA.BBBBBBBB'));
    await page.goto('/fit/measure');
    await expect(page).toHaveURL(/\/fit\/start\?next=/);
    expect(await page.evaluate(() => localStorage.getItem('gulmohar_fit_token_v1'))).toBeNull();
  });

  test('the gate page passes axe at 390 and 1440', async ({page}) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({width, height: 900}); await page.goto('/fit/start');
      expect((await new AxeBuilder({page}).withTags(axeTags).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });
});

test.describe('measuring after the gate', () => {
  test.beforeEach(async ({page}) => { await passGate(page); });

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
});

test('the privacy page explains what Find your fit keeps, who sees photos and how to delete', async ({page}) => {
  await page.goto('/privacy#find-your-fit');
  const heading = page.locator('#find-your-fit');
  await expect(heading).toHaveText('Find your fit: what we keep');
  await expect(heading).toBeInViewport();
  const text = await page.locator('main').innerText();
  for (const phrase of ['name, phone number', 'consent', 'never stored', 'Gemini', 'paid plan', 'delete']) expect(text).toContain(phrase);
  expect(text).not.toMatch(/[—–]/);
});
