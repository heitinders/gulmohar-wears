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
