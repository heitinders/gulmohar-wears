import json,gdown,concurrent.futures
from pathlib import Path
rows=json.load(open('docs/drive-inventory.json'))
names={'DSC06967.ARW','DSC07025.ARW','DSC07018.ARW','DSC07024.ARW','DSC07053.ARW','DSC07041.ARW','DSC07046.ARW','DSC07051.ARW','C0094.MP4','C0104.MP4','C0028.MP4'}
selected=[r for r in rows if Path(r['path']).name in names]
def get(r):
 p=Path('raw-assets')/r['path'];p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():gdown.download(id=r['id'],output=str(p),quiet=True)
 print(r['path'],p.stat().st_size,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:list(ex.map(get,selected))
