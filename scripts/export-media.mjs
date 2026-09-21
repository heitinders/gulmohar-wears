import sharp from 'sharp';
import {readdir,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
await mkdir('public/media',{recursive:true});
const inventory=JSON.parse(await readFile('docs/drive-inventory.json','utf8'));const manifest=[];
for(const file of await readdir('raw-assets/developed')) {
 if(!file.endsWith('.jpg'))continue;
 const stem=path.basename(file,'.jpg');const source=inventory.find(r=>r.path.endsWith(stem+'.ARW'));
 const input=`raw-assets/developed/${file}`;const meta=await sharp(input).metadata();const outputs=[];
 for(const width of [320,480,640,800,1080,1600,2400]) {
  for(const format of ['webp','avif']) {
   const name=`${stem.toLowerCase()}-${width}.${format}`;
   if(!await stat(`public/media/${name}`).catch(()=>null)){
   const image=sharp(input).resize({width,withoutEnlargement:true});
   if(format==='webp')await image.webp({quality:84,effort:4}).toFile(`public/media/${name}`);
   else await image.avif({quality:60,effort:3}).toFile(`public/media/${name}`);
   }
   outputs.push({path:`/media/${name}`,width,bytes:(await stat(`public/media/${name}`)).size});
  }
 }
 await sharp(input).resize({width:1600}).jpeg({quality:88}).toFile(`public/media/${stem.toLowerCase()}-1600.jpg`);
 const tiny=await sharp(input).resize(20).jpeg({quality:50}).toBuffer();
 manifest.push({id:stem.toLowerCase(),original:source?.path,driveId:source?.id,width:meta.width,height:meta.height,processing:'LibRaw via rawpy, camera white balance, sRGB, auto exposure; no hue or saturation grading',outputs,blurDataURL:`data:image/jpeg;base64,${tiny.toString('base64')}`});
 console.log(stem,'exported');
}
await writeFile('public/media/manifest.json',JSON.stringify(manifest,null,2));
