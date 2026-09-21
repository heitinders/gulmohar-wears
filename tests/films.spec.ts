import {test, expect} from '@playwright/test';

test('hero plays silently, pauses offscreen, and remembers a manual pause', async ({page}) => {
  await page.setViewportSize({width:1440,height:1000});
  const downloads:string[]=[];
  page.on('request', request => {if(request.url().endsWith('.mp4')) downloads.push(request.url());});
  await page.goto('/');
  const hero=page.locator('[data-film="olive-hero"]');
  const media=hero.locator('video');
  await expect(hero.getByRole('button',{name:'Pause olive-gold hero film'})).toBeVisible();
  expect(await media.evaluate(v => ({muted:(v as HTMLVideoElement).muted,inline:(v as HTMLVideoElement).playsInline}))).toEqual({muted:true,inline:true});
  await expect(media).toHaveAttribute('src','/media/olive-hero-720.mp4');
  expect(downloads.every(url => url.includes('olive-hero'))).toBe(true);
  const fuchsia=page.locator('[data-film="fuchsia-walk"]');
  await fuchsia.scrollIntoViewIfNeeded();
  await expect.poll(() => media.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  await expect(fuchsia.getByRole('button',{name:'Pause fuchsia suit film'})).toBeVisible();
  await hero.scrollIntoViewIfNeeded();
  await hero.getByRole('button',{name:'Pause olive-gold hero film'}).click();
  await fuchsia.scrollIntoViewIfNeeded();await hero.scrollIntoViewIfNeeded();
  await expect(hero.getByRole('button',{name:'Play olive-gold hero film'})).toBeVisible();
  expect(await media.evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
});

for(const policy of ['reduced motion','data saving']) {
  test(`${policy} keeps all films as stills until requested`, async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    if(policy==='reduced motion') await page.emulateMedia({reducedMotion:'reduce'});
    else await page.addInitScript(() => Object.defineProperty(navigator,'connection',{value:Object.assign(new EventTarget(),{saveData:true,effectiveType:'4g'})}));
    const downloads:string[]=[];
    page.on('request',request => {if(request.url().endsWith('.mp4')) downloads.push(request.url());});
    await page.goto('/');
    for(const id of ['olive-hero','fuchsia-walk','olive-drape']){
      const film=page.locator(`[data-film="${id}"]`);await film.scrollIntoViewIfNeeded();
      await expect(film.locator('img')).toBeVisible();await expect(film.locator('video')).not.toHaveAttribute('src');
    }
    expect(downloads).toEqual([]);
    const hero=page.locator('[data-film="olive-hero"]');
    await hero.scrollIntoViewIfNeeded();await hero.getByRole('button',{name:'Play olive-gold hero film'}).click();
    await expect(hero.getByRole('button',{name:'Pause olive-gold hero film'})).toBeVisible();
    await expect(hero.locator('video')).toHaveAttribute('src','/media/olive-hero-480.mp4');
  });
}

test('failed video keeps the poster and ordering links usable', async ({page}) => {
  await page.route('**/olive-hero-*.mp4', route => route.abort());
  await page.goto('/');
  const hero=page.locator('[data-film="olive-hero"]');
  await expect(hero.getByRole('status')).toHaveText('Film unavailable. Showing a still.');
  await expect(hero.locator('img')).toBeVisible();
  expect(await hero.locator('img').evaluate(i => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole('link',{name:'Talk to us on WhatsApp',exact:true})).toHaveAttribute('href',/^https:\/\/wa.me\/918699841800/);
});

test('blocked autoplay can be started manually, and a new motion preference pauses it', async ({page}) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    let refused = false;
    HTMLMediaElement.prototype.play = function() {
      if(!refused) {refused=true;return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));}
      return original.call(this);
    };
  });
  await page.goto('/');
  const hero = page.locator('[data-film="olive-hero"]');
  await expect(hero.locator('video')).toHaveAttribute('src',/olive-hero/);
  await hero.getByRole('button',{name:'Play olive-gold hero film'}).click();
  await expect(hero.getByRole('button',{name:'Pause olive-gold hero film'})).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(hero.getByRole('button',{name:'Play olive-gold hero film'})).toBeVisible();
  expect(await hero.locator('video').evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
});
