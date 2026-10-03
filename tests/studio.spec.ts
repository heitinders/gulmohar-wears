import {test, expect, type Browser, type Page} from '@playwright/test';
import {heightOnlyDraft, passGate, PNG} from './gate';
import AxeBuilder from '@axe-core/playwright';
import {STUDIO_DEV_EMAIL, STUDIO_DEV_PASSWORD} from '../playwright.config';

const axeTags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

export async function signIn(page: Page) {
  await page.goto('/studio/login');
  await page.getByLabel('Email').fill(STUDIO_DEV_EMAIL);
  await page.getByLabel('Password').fill(STUDIO_DEV_PASSWORD);
  await page.getByRole('button', {name: 'Sign in'}).click();
  await expect(page).toHaveURL(/\/studio$/);
}

test.describe('studio sign in', () => {
  test('studio pages need a staff session', async ({page}) => {
    for (const path of ['/studio', '/studio/orders', '/studio/fit', '/studio/tailor', '/studio/import']) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/studio\/login/);
    }
  });

  test('a wrong password says so and stays on the login page', async ({page}) => {
    await page.goto('/studio/login');
    await page.getByLabel('Email').fill(STUDIO_DEV_EMAIL);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', {name: 'Sign in'}).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText('Email or password is not right.');
    await expect(page).toHaveURL(/\/studio\/login/);
  });

  test('staff sign in, see the studio navigation, and sign out', async ({page}) => {
    await signIn(page);
    const nav = page.getByRole('navigation', {name: 'Studio'});
    for (const name of ['Clients', 'Orders', 'Fit', 'Tailor', 'Import']) await expect(nav.getByRole('link', {name})).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    await page.getByRole('button', {name: 'Sign out'}).click();
    await expect(page).toHaveURL(/\/studio\/login/);
    await page.goto('/studio');
    await expect(page).toHaveURL(/\/studio\/login/);
  });

  test('the session cookie is http-only', async ({page, context}) => {
    await signIn(page);
    const cookie = (await context.cookies()).find(c => c.name === 'gw_studio_at');
    expect(cookie?.httpOnly).toBe(true); expect(cookie?.sameSite).toBe('Lax');
    expect(await page.evaluate(() => document.cookie)).not.toContain('gw_studio');
  });

  test('a session about to expire is renewed by the proxy and the page still loads', async ({page, context}) => {
    await signIn(page);
    const before = (await context.cookies()).find(c => c.name === 'gw_studio_at')!.value;
    await context.addCookies([{name: 'gw_studio_exp', value: '0', domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax'}]);
    await page.goto('/studio/orders');
    await expect(page).toHaveURL(/\/studio\/orders/);
    const jar = await context.cookies();
    expect(jar.find(c => c.name === 'gw_studio_at')!.value).not.toBe(before);
    expect(Number(jar.find(c => c.name === 'gw_studio_exp')!.value)).toBeGreaterThan(Date.now() / 1000);
  });

  test('a session whose refresh token is dead is signed out', async ({page, context}) => {
    await signIn(page);
    await context.addCookies([{name: 'gw_studio_exp', value: '0', domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax'}, {name: 'gw_studio_rt', value: 'dead', domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax'}]);
    await page.goto('/studio');
    await expect(page).toHaveURL(/\/studio\/login/);
  });

  test('studio pages are not indexed', async ({page}) => {
    await page.goto('/studio/login');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });

  test('the login page passes axe and has one h1', async ({page}) => {
    for (const width of [390, 1440]) {
      await page.setViewportSize({width, height: 900}); await page.goto('/studio/login');
      await expect(page.locator('main h1')).toHaveCount(1);
      expect((await new AxeBuilder({page}).withTags(axeTags).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });
});

/** Chooses the option whose text includes `text` (selectOption matches labels exactly). */
async function pick(page: Page, label: string, text: string) {
  const select = page.getByLabel(label);
  await select.selectOption((await select.locator('option', {hasText: text}).first().getAttribute('value'))!);
}

const uniquePhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

/** A customer in their own browser: gate, height-only draft, then the given choices, left long enough to sync. */
async function customer(browser: Browser, name: string, {relaxed = false, city = '', deadline = ''} = {}) {
  const context = await browser.newContext(); const page = await context.newPage();
  const phone = uniquePhone();
  await passGate(page, {name, phone});
  await heightOnlyDraft(page);
  if (relaxed) await page.getByRole('button', {name: 'Relaxed', exact: true}).click();
  if (city || deadline) {
    await page.getByText('Add order details').click();
    if (city) await page.getByLabel('Delivery city and country').fill(city);
    if (deadline) await page.getByLabel('Needed by').fill(deadline);
  }
  await page.waitForTimeout(1500); // the result step syncs choices after a short pause
  await context.close();
  return phone;
}

test.describe('studio clients and orders', () => {
  test('a customer appears with their choices and a WhatsApp link, and no measurements', async ({page, browser}) => {
    const name = `Asha ${Date.now()}`;
    const phone = await customer(browser, name, {relaxed: true, city: 'Leeds, UK', deadline: '2026-12-01'});
    await signIn(page);
    const row = page.locator('.client-row', {hasText: name});
    await expect(row).toContainText('Anarkali'); await expect(row).toContainText('Relaxed'); await expect(row).toContainText('Leeds, UK');
    await expect(row.getByRole('link', {name: /WhatsApp/})).toHaveAttribute('href', `https://wa.me/91${phone}`);
    await expect(row).not.toContainText(/Bust|Waist|Hip|in\b|cm\b/);
  });

  test('orders list only clients with a brief, soonest deadline first', async ({page, browser}) => {
    const stamp = Date.now();
    await customer(browser, `NoBrief ${stamp}`);
    await customer(browser, `Later ${stamp}`, {deadline: '2027-03-01'});
    await customer(browser, `Sooner ${stamp}`, {deadline: '2027-01-15'});
    await signIn(page);
    await page.getByRole('navigation', {name: 'Studio'}).getByRole('link', {name: 'Orders'}).click();
    await expect(page.locator('main h1')).toHaveText('Orders');
    const names = await page.locator('.client-row').allInnerTexts();
    const mine = names.filter(n => n.includes(String(stamp)));
    expect(mine.length).toBe(2);
    expect(mine[0]).toContain('Sooner'); expect(mine[1]).toContain('Later');
  });

  test('deleting a client asks first, then removes them', async ({page, browser}) => {
    const name = `Delete ${Date.now()}`;
    await customer(browser, name);
    await signIn(page);
    const row = page.locator('.client-row', {hasText: name});
    page.once('dialog', d => d.dismiss());
    await row.getByRole('button', {name: `Delete ${name}`}).click();
    await expect(row).toBeVisible();
    page.once('dialog', d => d.accept());
    await row.getByRole('button', {name: `Delete ${name}`}).click();
    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.client-row', {hasText: name})).toHaveCount(0);
  });

  test('clients and orders pass axe and fit at 390 and 1440', async ({page, browser}) => {
    await customer(browser, `Axe ${Date.now()}`, {city: 'Mohali'});
    await signIn(page);
    for (const path of ['/studio', '/studio/orders']) for (const width of [390, 1440]) {
      await page.setViewportSize({width, height: 900}); await page.goto(path);
      await expect(page.locator('main h1')).toHaveCount(1);
      expect((await new AxeBuilder({page}).withTags(axeTags).analyze()).violations, `${path} ${width}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} ${width}`).toBe(width);
    }
  });
});

/** A customer's draft code, as it appears at the end of their WhatsApp message. */
async function customerDraftCode(browser: Browser, name: string) {
  const context = await browser.newContext(); const page = await context.newPage();
  const phone = uniquePhone();
  await passGate(page, {name, phone}); await heightOnlyDraft(page);
  const href = (await page.getByRole('link', {name: 'Continue to WhatsApp'}).getAttribute('href'))!;
  await context.close();
  return {phone, code: new URL(href).searchParams.get('text')!.match(/Draft code: (\S+)/)![1]};
}

test.describe('studio fit, import and tailor', () => {
  test('in-shop measuring saves to this device for the chosen client, never to WhatsApp', async ({page, browser}) => {
    const name = `Shop ${Date.now()}`; const owner = `DeviceOwner ${Date.now()}`;
    await customer(browser, name);
    await passGate(page, {name: owner, phone: uniquePhone()}); // this studio device also holds a customer's gate token
    await signIn(page);
    await page.route('**/models/**', r => r.abort());
    await page.getByRole('navigation', {name: 'Studio'}).getByRole('link', {name: 'Fit'}).click();
    await pick(page, 'Client', name);
    await page.getByRole('button', {name: 'Start measuring'}).click();
    await expect(page.getByLabel(/Your name/)).toHaveValue(name);
    await page.getByRole('button', {name: /Sharara/}).click();
    await page.getByLabel(/^Height/).fill('63'); await page.getByLabel(/^Height/).blur();
    await page.getByRole('button', {name: 'Next: Photos'}).click();
    await expect(page).toHaveURL(/\/studio\/fit\?step=photos/);
    for (const shot of ['front', 'side']) { await page.getByLabel('Upload a photo').setInputFiles({name: `${shot}.png`, mimeType: 'image/png', buffer: PNG}); await page.getByRole('button', {name: 'Use this photo'}).click(); }
    await page.getByRole('button', {name: 'Use height only'}).click();
    await expect(page).toHaveURL(/\/studio\/fit\?step=result/);
    await expect(page.getByRole('link', {name: 'Continue to WhatsApp'})).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Save to this phone'})).toHaveCount(0);
    await page.getByRole('button', {name: `Save for ${name} on this device`}).click();
    await expect(page.locator('main').getByRole('status')).toContainText('Saved on this device');
    await page.waitForTimeout(1500);
    await page.goto('/studio');
    await expect(page.locator('.client-row', {hasText: name})).toContainText('On this device');
    await expect(page.locator('.client-row', {hasText: owner})).not.toContainText('Sharara');
  });

  test('a mangled draft code is refused and a real one attaches to the client on this device', async ({page, browser}) => {
    const name = `Import ${Date.now()}`;
    const {code} = await customerDraftCode(browser, name);
    await signIn(page);
    await page.goto('/studio/import');
    await pick(page, 'Client', name);
    await page.getByLabel('Draft code').fill(code.slice(0, -3) + 'zzz');
    await page.getByRole('button', {name: 'Import'}).click();
    await expect(page.locator('main').getByRole('alert')).toHaveText('This code looks incomplete. Ask the customer to resend it.');
    await page.getByLabel('Draft code').fill(`  ${code}  `);
    await page.getByRole('button', {name: 'Import'}).click();
    await expect(page.locator('main').getByRole('status')).toContainText(`Imported for ${name}`);
    await expect(page.locator('main').getByRole('status')).toContainText('Anarkali');
  });

  test('tailor corrections are kept on this device beside the draft', async ({page, browser}) => {
    const name = `Tailor ${Date.now()}`;
    const {code} = await customerDraftCode(browser, name);
    await signIn(page);
    await page.goto('/studio/import');
    await pick(page, 'Client', name);
    await page.getByLabel('Draft code').fill(code); await page.getByRole('button', {name: 'Import'}).click();
    await page.goto('/studio/tailor');
    await pick(page, 'Client on this device', name);
    const bust = page.locator('.tailor-row', {hasText: 'Bust'});
    await bust.getByLabel('Tape, inches').fill('34.5');
    await bust.getByRole('checkbox', {name: 'Verified'}).check();
    await page.getByRole('button', {name: 'Save corrections'}).click();
    await expect(page.locator('main').getByRole('status')).toContainText('Saved on this device');
    await page.reload();
    await pick(page, 'Client on this device', name);
    await expect(bust.getByLabel('Tape, inches')).toHaveValue('34.5');
    await expect(bust.getByRole('checkbox', {name: 'Verified'})).toBeChecked();
    await expect(bust).toContainText('tailor verified');
  });

  test('a tape value outside 4 to 80 inches is refused', async ({page, browser}) => {
    const name = `Range ${Date.now()}`;
    const {code} = await customerDraftCode(browser, name);
    await signIn(page);
    await page.goto('/studio/import');
    await pick(page, 'Client', name);
    await page.getByLabel('Draft code').fill(code); await page.getByRole('button', {name: 'Import'}).click();
    await page.goto('/studio/tailor');
    await pick(page, 'Client on this device', name);
    await page.locator('.tailor-row', {hasText: 'Bust'}).getByLabel('Tape, inches').fill('340');
    await page.getByRole('button', {name: 'Save corrections'}).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('between 4 and 80');
  });

  test('fit, tailor and import pass axe and fit at 390 and 1440', async ({page}) => {
    await signIn(page);
    for (const path of ['/studio/fit', '/studio/tailor', '/studio/import']) for (const width of [390, 1440]) {
      await page.setViewportSize({width, height: 900}); await page.goto(path);
      await expect(page.locator('main h1'), path).toHaveCount(1);
      expect((await new AxeBuilder({page}).withTags(axeTags).analyze()).violations, `${path} ${width}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} ${width}`).toBe(width);
    }
  });
});
