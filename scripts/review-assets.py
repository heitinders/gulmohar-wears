import json,requests,io,concurrent.futures
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
rows=json.load(open('docs/drive-inventory.json'))
out=Path('raw-assets/drive-previews');out.mkdir(parents=True,exist_ok=True)
def get(row):
 p=out/(row['id']+'.jpg')
 try:
  if not p.exists():
   r=requests.get('https://drive.google.com/thumbnail',params={'id':row['id'],'sz':'w400'},timeout=40);r.raise_for_status()
   im=Image.open(io.BytesIO(r.content));im.convert('RGB').save(p,quality=86)
  return {**row,'preview':str(p),'status':'ok'}
 except Exception as e:return {**row,'status':'failed','reason':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
 result=list(ex.map(get,rows))
json.dump(result,open('docs/asset-preview-index.json','w'),indent=2)
for kind in ['ARW','MP4']:
 selected=[r for r in result if r['path'].endswith(kind)]
 for start in range(0,len(selected),24):
  sheet=Image.new('RGB',(1440,1680),'#f6f1e7');draw=ImageDraw.Draw(sheet)
  for i,r in enumerate(selected[start:start+24]):
   x=(i%6)*240;y=(i//6)*420
   if r['status']=='ok':
    im=Image.open(r['preview']);im.thumbnail((232,365));sheet.paste(im,(x+(240-im.width)//2,y))
   draw.text((x+8,y+375),r['path'],fill='black')
  name=f'docs/contact-sheets/drive-{kind.lower()}-{start//24+1:02}.jpg';sheet.save(name,quality=90);print(name,flush=True)
print('SUCCESS',sum(r['status']=='ok' for r in result),'FAIL',sum(r['status']!='ok' for r in result))
