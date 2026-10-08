"""Fetch small Drive thumbnails for the uncatalogued folders and build contact sheets.

Reads docs/drive-inventory-new.json, saves raw-assets/drive-previews/<id>.jpg (skips
existing files), writes docs/asset-preview-index-new.json and contact sheets named
docs/contact-sheets/new-<folder-slug>-<kind>-NN.jpg (24 per sheet, 6 x 4).
Never downloads the full RAW, JPG or MP4 files: only the w400 thumbnail endpoint.
"""
import concurrent.futures
import io
import json
import re
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw

rows = json.load(open('docs/drive-inventory-new.json'))
out = Path('raw-assets/drive-previews')
out.mkdir(parents=True, exist_ok=True)
Path('docs/contact-sheets').mkdir(parents=True, exist_ok=True)


def get(row):
    p = out / (row['id'] + '.jpg')
    if p.exists():
        return {**row, 'preview': str(p), 'status': 'ok'}
    last = ''
    for attempt in range(3):
        try:
            r = requests.get('https://drive.google.com/thumbnail',
                             params={'id': row['id'], 'sz': 'w400'}, timeout=40)
            r.raise_for_status()
            if not r.headers.get('content-type', '').startswith('image/'):
                raise ValueError('not an image: ' + r.headers.get('content-type', '?'))
            im = Image.open(io.BytesIO(r.content))
            im.convert('RGB').save(p, quality=86)
            return {**row, 'preview': str(p), 'status': 'ok'}
        except Exception as e:  # record the reason, retry briefly
            last = f'{type(e).__name__}: {e}'
            time.sleep(1.5 * (attempt + 1))
    return {**row, 'status': 'failed', 'reason': last}


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
    result = list(ex.map(get, rows))
json.dump(result, open('docs/asset-preview-index-new.json', 'w'), indent=2)


def slug(folder):
    return re.sub(r'[^a-z0-9]+', '-', folder.lower()).strip('-')


groups = {}
for r in result:
    kind = r['name'].rsplit('.', 1)[-1].lower()
    groups.setdefault((r['folder'], kind), []).append(r)

for (folder, kind), selected in sorted(groups.items()):
    selected.sort(key=lambda r: r['name'])
    for start in range(0, len(selected), 24):
        sheet = Image.new('RGB', (1440, 1680), '#f6f1e7')
        draw = ImageDraw.Draw(sheet)
        for i, r in enumerate(selected[start:start + 24]):
            x = (i % 6) * 240
            y = (i // 6) * 420
            if r['status'] == 'ok':
                im = Image.open(r['preview'])
                im.thumbnail((232, 365))
                sheet.paste(im, (x + (240 - im.width) // 2, y))
            else:
                draw.text((x + 8, y + 180), 'NO PREVIEW', fill='#a00')
            draw.text((x + 8, y + 375), r['path'], fill='black')
        name = f'docs/contact-sheets/new-{slug(folder)}-{kind}-{start // 24 + 1:02}.jpg'
        sheet.save(name, quality=90)
        print(name, flush=True)

failed = [r for r in result if r['status'] != 'ok']
print('SUCCESS', len(result) - len(failed), 'FAIL', len(failed))
for r in failed:
    print('FAILED', r['path'], r['id'], r.get('reason'))
