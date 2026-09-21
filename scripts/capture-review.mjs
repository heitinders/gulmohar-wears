import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});
await mkdir('screenshots/after',{recursive:true});
const report=[];
for(const width of [390,430,768,1024,1440,1920]){
 const page=await browser.newPage({viewport:{width,height:width<768?844:1000},deviceScaleFactor:1});
 for(const [name,route] of [['home','/'],...([390,1440].includes(width)?[['collections','/collections'],['product','/products/olive-gold-suit'],['custom','/custom'],['atelier','/atelier'],['journal','/journal']]:[])]){
  await page.goto((process.env.REVIEW_URL||'http://localhost:3002')+route);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{document.documentElement.style.scrollBehavior='auto';for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,70))}await Promise.all([...document.images].filter(im=>im.getClientRects().length).map(im=>Promise.race([im.decode().catch(()=>{}),new Promise(r=>setTimeout(r,5000))])));scrollTo(0,0)});
  report.push({route,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),images:await page.evaluate(()=>[...document.images].filter(im=>im.getClientRects().length).map(im=>({src:im.currentSrc,loaded:im.complete&&im.naturalWidth>0}))),fonts:await page.evaluate(()=>({body:getComputedStyle(document.body).fontFamily,heading:getComputedStyle(document.querySelector('h1')).fontFamily}))});
  await page.screenshot({path:`screenshots/after/${name}-${width}-opening.png`});await page.screenshot({path:`screenshots/after/${name}-${width}-full.png`,fullPage:true});
  if(name==='home'&&[390,1440].includes(width)){for(const section of ['.current-edit','.collection-index','.closer-look','.personal-process'])await page.locator(section).screenshot({style:'.site-header{visibility:hidden}.skip-link{visibility:hidden}',path:`screenshots/after/${section.slice(1)}-${width}.png`});}
  if(name==='custom')await page.locator('.brief-section').screenshot({style:'.site-header{visibility:hidden}.skip-link{visibility:hidden}',path:`screenshots/after/form-${width}.png`});
 }
 await page.close();
}
await writeFile('docs/render-review.json',JSON.stringify(report,null,2));await browser.close();
