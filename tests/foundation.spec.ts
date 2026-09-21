import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes=['/','/collections','/collections/lehengas','/products/olive-gold-suit','/products/fuchsia-suit','/products/blue-suit','/custom','/atelier','/journal','/journal/your-first-atelier-conversation','/contact','/shipping','/size-and-fit','/returns','/faq','/privacy','/terms'];

test('customer routes render without errors or horizontal overflow',async({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of routes){const response=await page.goto(route);expect(response?.status(),route).toBe(200);await expect(page.locator('main h1')).toHaveCount(1);for(const width of [390,430,768,1024,1440,1920]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${route} at ${width}`).toBe(width);}}
 expect(errors).toEqual([]);
});

test('mobile navigation supports keyboard dismissal and focus restoration',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'Open menu'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Close ×'})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.getByRole('button',{name:'Open menu'})).toBeFocused();
 await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Collections'}).click();await expect(page).toHaveURL(/\/collections$/);await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
});

test('matching garment views and contextual enquiry preserve the chosen look',async({page})=>{
 await page.goto('/products/olive-gold-suit');
 await page.getByRole('button',{name:'View neckline and sleeve detail'}).click();await expect(page.locator('.gallery-main img')).toHaveAttribute('alt',/neckline/);await expect(page.locator('.gallery-count')).toHaveText('3 / 4');await page.locator('.gallery-main img').evaluate(async im=>{await(im as HTMLImageElement).decode()});
 const direct=new URL((await page.getByRole('link',{name:'Enquire about this look'}).getAttribute('href'))!);expect(direct.searchParams.get('text')).toContain('Olive-gold embroidered suit');
 await expect(page.locator('video')).toHaveCount(0);await page.getByRole('button',{name:'Load the olive-gold garment film'}).click();await expect(page.locator('video')).toBeVisible();expect(await page.locator('video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 await page.getByRole('link',{name:'Make it your own'}).click();
 await page.locator('input[name="name"]').fill('Simran');await page.locator('select[name="occasion"]').selectOption('Wedding');await page.locator('input[name="destination"]').fill('Toronto, Canada');await page.locator('textarea[name="notes"]').fill('Silk & hand embroidery');await page.getByRole('button',{name:'Silk',exact:true}).click();await page.getByRole('button',{name:'Prepare my enquiry'}).click();
 const link=page.getByRole('link',{name:'Continue to WhatsApp'});const destination=new URL((await link.getAttribute('href'))!);expect(destination.origin+destination.pathname).toBe('https://wa.me/918699841800');expect(destination.searchParams.get('text')).toContain('Deliver to: Toronto, Canada');expect(destination.searchParams.get('text')).toContain('Notes: Silk & hand embroidery');expect(destination.searchParams.get('text')).toContain('Olive-gold embroidered suit');
 await page.locator('input[name="name"]').fill('Jaspreet');await expect(link).toHaveCount(0);
});

test('automated accessibility checks cover the main layouts on phone and desktop',async({page})=>{
 test.setTimeout(180000);
 for(const width of [390,1440]){await page.setViewportSize({width,height:900});for(const route of ['/','/collections','/products/olive-gold-suit','/custom','/atelier','/journal','/faq']){await page.goto(route);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations,`${route} at ${width}`).toEqual([]);}}
});

test('collection menu supports keyboard use, dismissal and garment navigation', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  const trigger=page.getByRole('button',{name:'Collections',exact:true});
  const panel=page.locator('#collection-menu');
  await trigger.focus();await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();await expect(trigger).toHaveAttribute('aria-expanded','true');
  const desktopScan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(desktopScan.violations).toEqual([]);
  await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();await expect(trigger).toBeFocused();
  await trigger.click();await page.mouse.click(12,850);await expect(panel).not.toBeVisible();
  await trigger.click();await panel.getByRole('link',{name:'Olive-gold embroidered suit Olive gold'}).click();
  await expect(page).toHaveURL(/\/products\/olive-gold-suit$/);await expect(panel).not.toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Open menu'}).click();
  const mobileScan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(mobileScan.violations).toEqual([]);
});
