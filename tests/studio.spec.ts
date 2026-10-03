import {test, expect, type Page} from '@playwright/test';
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
