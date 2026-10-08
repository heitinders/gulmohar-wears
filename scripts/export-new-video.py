"""Export reviewed footage from the second ("new shoot") Drive folder, without audio, grading or reframing.

Appends to public/media/video-manifest.json; existing entries are kept.
Sources carry no rotation metadata. Both clips were filmed with the camera on its side and are turned 90 degrees
counter-clockwise (transpose=2), checked visually.
"""
import json
import subprocess
from io import BytesIO
from pathlib import Path
from PIL import Image

# id, source path (full inventory path), start, duration, widths, rotate to portrait
clips = [
    ('teal-hero', 'new shoot/C0016.MP4', 3.3, 6.4, (480, 720), True),
    ('workshop-border', 'new shoot/Workshop/C0181.MP4', 4.5, 6.0, (480, 720), True),
]
inventory = {item['path']: item['id'] for item in json.loads(Path('docs/drive-inventory-new.json').read_text())}
manifest_path = Path('public/media/video-manifest.json')
manifest = json.loads(manifest_path.read_text())

for name, source, start, duration, widths, rotate in clips:
    turn = 'transpose=2,' if rotate else ''
    outputs = []
    for width in widths:
        destination = Path(f'public/media/{name}-{width}.mp4')
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
            '-ss', str(start), '-i', f'raw-assets/{source}', '-t', str(duration),
            '-vf', f'{turn}scale={width}:-2,fps=25', '-an', '-c:v', 'libx264',
            '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            str(destination)], check=True)
        outputs.append({'src': f'/media/{destination.name}', 'width': width, 'bytes': destination.stat().st_size})
    poster = Path(f'public/media/{name}-poster.webp')
    frame = subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error',
        '-ss', str(start), '-i', f'raw-assets/{source}', '-frames:v', '1',
        '-vf', f'{turn}scale={max(widths)}:-2', '-f', 'image2pipe', '-c:v', 'png', '-'])
    image = Image.open(BytesIO(frame))
    image.save(poster, quality=86)
    processing = ('Portrait orientation restored, full frame retained, H.264 CRF26, 25fps, no colour changes.'
        if rotate else 'Landscape as recorded, full frame retained, H.264 CRF26, 25fps, no colour changes.')
    entry = {'id': name, 'source': source, 'driveId': inventory[source],
        'start': start, 'duration': duration, 'audio': False, 'processing': processing,
        'poster': f'/media/{poster.name}', 'posterWidth': image.width, 'posterHeight': image.height,
        'outputs': outputs}
    manifest = [m for m in manifest if m['id'] != name] + [entry]
    print(json.dumps(entry))
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
