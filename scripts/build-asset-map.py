import json,html
from pathlib import Path
manifest=json.loads(Path('public/media/manifest.json').read_text())
roles={
'dsc06962':('Fuchsia product gallery: border and hem','Shows the decorated dupatta edge and trouser hem.','Full portrait in gallery on both sizes.'),
'dsc06963':('Collection index; Fuchsia gallery; Atelier','Seated view makes the drape readable. Atelier caption identifies a campaign photograph, not workshop evidence.','Gallery retains full frame; index 4:5 desktop, 80×112 phone, focal 50% 40%.'),
'dsc06967':('Home current edit; collection listing; Fuchsia gallery; related looks','Strong full-length fuchsia silhouette and trailing dupatta.','4:5 editorial crop at 50% 65%; gallery full 2:3 portrait. Hem retained.'),
'dsc06973':('Fuchsia gallery: neckline and cuff','Closer embroidery and sleeve reference matching the fuchsia outfit.','Full portrait, no decorative overlay.'),
'dsc07018':('Blue gallery: seated drape','A wider seated view of the same blue suit.','Full portrait at all widths.'),
'dsc07024':('Blue gallery and Journal whole-outfit article: embroidery detail','Shows front, sleeve and trouser detail for this blue outfit.','Full portrait at all widths.'),
'dsc07025':('Home current edit; Blue gallery; listings; related looks','A quieter blue companion to the saturated fuchsia spread.','3:4 editorial at 50% 48%; gallery full portrait; Journal 4:5.'),
'dsc07041':('Home closer look; Olive-gold gallery','Wider seated partner to the neckline detail, preserves the dupatta drape.','2:3 portrait on both sizes.'),
'dsc07046':('Home closer look; Olive-gold gallery','Dedicated close photograph of embroidered neckline and sleeves, not a crop of the hero.','Desktop fills detail chapter; phone 440px-high crop at 50% 30%; gallery full portrait.'),
'dsc07051':('Wedding wear collection-index preview','Strong seated portrait matching the olive-gold outfit.','4:5 preview on desktop; narrow visible mobile thumbnail.'),
'dsc07053':('Home opening; Olive-gold gallery; listings; typography studies','Best complete standing silhouette with face, sleeves and hem readable.','2:3 hero on phone; near-original portrait on desktop. Gallery full portrait.'),
'dsc07072':('Custom opening','An alternative setting gives the custom chapter intimacy without implying this is a workshop.','3:4 Custom crop; article 4:3 desktop, 4:5 mobile, focus 50% 38%.'),
'dsc07085':('Journal first-conversation article and listing','A complementary lifestyle frame gives the planning article its own visual setting.','Listing 4:5; article 4:3 desktop and 4:5 phone, focus 50% 38%.'),
'dsc07089':('Home opening detail; Olive-gold gallery','Clear embroidered surface and cuffs complement DSC07053. Same outfit, a separate photograph.','Narrow hero detail at 48% 50%, upper two-thirds of companion column. Gallery full portrait.')}
intro='''# Media plan and visual asset map

Verified public Drive inventory: **255 files, 141 ARW stills and 114 MP4 clips**, in the two supplied September shoot folders. All 255 previews were obtained and reviewed in 11 labelled contact sheets. Three selected videos were downloaded and sampled at 20%, 50% and 80% with timestamps. Fourteen selected stills were decoded from full Sony RAW files, including matching originals already in the supplied local Downloads folder. No generated or stock garment imagery.

Open [the visual asset map](docs/asset-map.html) for side-by-side thumbnails and roles. [The manifest](public/media/manifest.json) records original path, Drive ID, dimensions, processing and byte sizes. Contact sheets are in docs/contact-sheets; original inventory is docs/drive-inventory.json.

## Processing and delivery

LibRaw/rawpy camera white balance and sRGB, with auto exposure; no warm colour filter, hue changes, retouching of clothing or embroidery synthesis. Source photographs are 4024×6024. Responsive derivatives use AVIF and WebP at 320, 480, 640, 800, 1080, 1600 and 2400 pixels, plus a 1600px JPEG fallback. Explicit dimensions reserve space; native picture sources choose resolution. Below-fold photography is lazy loaded. Originals stay outside public/. An output-size inventory is included in the manifest.

## Motion

2026-09-18/C0094.MP4, 19.68 seconds, supplies the olive-gold product film. The selected portion starts at 3.0 seconds and lasts 8 seconds. Rotated counter-clockwise to restore the camera's intended portrait orientation, scaled to 720×1280, H.264, CRF 24, no audio, faststart. Public output: `/media/olive-motion.mp4` (3.2 MB), with `/media/olive-motion-poster.webp`. It loads only on request, uses controls and does not autoplay. The original is not bundled.

Unused motion candidates: 2026-09-17/C0028.MP4 (9 seconds, fuchsia) and 2026-09-18/C0104.MP4 (5.2 seconds, olive-gold). Both reviewed at three labelled timestamps in docs/contact-sheets/video-timestamps.jpg. C0094 was selected for a more sustained view of dupatta movement. The other clips are retained locally, not downloaded by site visitors.

## Matching and meaningful gaps

The final galleries contain three visually matched outfits: fuchsia, blue and olive-gold. Clothing colour, neckline, repeated motifs, dupatta and trouser treatment were compared across selected frames. Descriptive colour names are not claimed to be official product names. No uncertain cross-outfit matches are included.

No verified lehenga, workshop, maker-at-work or customer-worn images were identified. Lehengas use a clearly described custom-enquiry page without a fabricated image. The Atelier page identifies its image as an outfit from the edit. No material-composition or handwork inference is made from the images. Confirm fabric, technique, prices, available options and timing with the business.

## Unused strong still candidates

![Unused candidates](docs/contact-sheets/unused-candidates.jpg)

- DSC07058: alternate full olive-gold silhouette. DSC07053 has a more open pose and was preferred for the campaign.
- DSC07080: seated olive-gold lifestyle portrait. Strong alternate, but the red background light adds a competing colour.
- DSC07086: wider seated lifestyle composition with dupatta. Useful for a later story; DSC07085 already provides this setting in Journal.

These are selection previews only, not public storefront images.

## Still selections

'''
rows=[];cards=[]
for m in manifest:
 id=m['id'];role,reason,crop=roles[id];source=m['original'];url=f'https://drive.google.com/file/d/{m["driveId"]}/view'
 avif=next(o for o in m['outputs'] if o['path'].endswith('-1080.avif'))
 rows.append(f'| [{source}]({url}) | {role} | {crop} | `/media/{id}-{{width}}.{{avif,webp}}` |')
 cards.append(f'<article><img src="../public/media/{id}-640.webp" alt="{html.escape(source)}"><div><small>{html.escape(source)}</small><h2>{html.escape(role)}</h2><p>{html.escape(reason)}</p><p><b>Crop:</b> {html.escape(crop)}</p><p>1080px AVIF: {avif["bytes"]/1024:.0f} KiB</p><a href="{url}">Supplied Drive original</a><code>/media/{id}-{{width}}.{{avif,webp}}</code></div></article>')
Path('MEDIA-PLAN.md').write_text(intro+'| Source | Role | Crop | Output |\n|---|---|---|---|\n'+'\n'.join(rows)+'\n')
Path('docs/asset-map.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Gulmohar supplied asset map</title><style>body{font:15px/1.6 system-ui;background:#f4f0e7;color:#362426;margin:0;padding:4vw}h1{font:48px Georgia}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}article{display:grid;grid-template-columns:35% 1fr;gap:24px;border-top:1px solid #b9aa9b;padding-top:24px}img{width:100%;height:auto}h2{font:24px/1.2 Georgia}code{display:block;overflow-wrap:anywhere;font-size:11px;margin-top:12px}a{color:#8b2e20}header{max-width:800px;margin-bottom:48px}@media(max-width:800px){main{grid-template-columns:1fr}}small{font-size:11px}</style><header><h1>Gulmohar. The supplied asset map.</h1><p>255 source files inventoried. Fourteen selected RAW photographs developed. Three actual outfits, with complete views and matching details. Every photograph below is from the client shoot.</p><p>See MEDIA-PLAN.md for processing, motion selection, unused candidates and media gaps. The Latin navigation wordmark is provisional; the supplied Gurmukhi artwork is kept intact.</p></header><main>'''+''.join(cards)+'''</main><h2>Unused strong candidates</h2><p>DSC07058: alternate standing silhouette. DSC07080: closer seated lifestyle view. DSC07086: wider seated composition. The final edit favours DSC07053 for its open pose and DSC07085 for the Journal, avoiding repetitive frames.</p><img style="max-width:960px" src="contact-sheets/unused-candidates.jpg" alt="Three unused but useful supplied outfit photographs"><h2>Motion and gaps</h2><p>C0094.MP4, 3–11 seconds, supplies the optional olive-gold product film. C0028.MP4 and C0104.MP4 were sampled but remain unused. No workshop or photographed lehenga is represented by this shoot selection.</p><img style="max-width:1100px" src="contact-sheets/video-timestamps.jpg" alt="Three timestamped frames from each of three shortlisted videos"></html>''')
