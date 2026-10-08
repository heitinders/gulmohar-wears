// Export the reviewed camera JPEGs from the second ("new shoot") Drive folder.
// Appends to public/media/manifest.json; existing entries are kept untouched.
import sharp from 'sharp';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';

const selected=['DSC07114','DSC07098','DSC07102','DSC07096','DSC07104','DSC07106'];
const widths=[320,480,640,800,1080,1600,2400];
await mkdir('public/media',{recursive:true});
const inventory=JSON.parse(await readFile('docs/drive-inventory-new.json','utf8'));
const manifestPath='public/media/manifest.json';
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));

for(const stem of selected){
 const original=`new shoot/${stem}.JPG`;
 const source=inventory.find(r=>r.path===original);
 if(!source)throw new Error(`Missing from inventory: ${original}`);
 const input=path.join('raw-assets',original);
 const id=stem.toLowerCase();
 // rotate() with no argument applies EXIF orientation, then strips the tag.
 const {info}=await sharp(input).rotate().toBuffer({resolveWithObject:true});
 const outputs=[];
 for(const width of widths){
  for(const format of ['webp','avif']){
   const name=`${id}-${width}.${format}`;const dest=`public/media/${name}`;
   if(!await stat(dest).catch(()=>null)){
    const image=sharp(input).rotate().resize({width,withoutEnlargement:true});
    if(format==='webp')await image.webp({quality:84,effort:4}).toFile(dest);
    else await image.avif({quality:60,effort:3}).toFile(dest);
   }
   outputs.push({path:`/media/${name}`,width,bytes:(await stat(dest)).size});
  }
 }
 await sharp(input).rotate().resize({width:1600}).jpeg({quality:88}).toFile(`public/media/${id}-1600.jpg`);
 const tiny=await sharp(input).rotate().resize(20).jpeg({quality:50}).toBuffer();
 const entry={id,original,driveId:source.id,width:info.width,height:info.height,
  processing:'Camera JPEG, EXIF orientation applied, resized only; no colour changes',
  outputs,blurDataURL:`data:image/jpeg;base64,${tiny.toString('base64')}`};
 const at=manifest.findIndex(m=>m.id===id);
 if(at>=0)manifest[at]=entry;else manifest.push(entry);
 console.log(id,info.width,info.height,'exported');
}
await writeFile(manifestPath,JSON.stringify(manifest,null,2));
