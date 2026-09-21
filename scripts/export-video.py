"""Export the reviewed Drive footage, without audio, grading or reframing."""
import json
import subprocess
from io import BytesIO
from pathlib import Path
from PIL import Image

clips = [
    ('olive-hero', '2026-09-18/C0094.MP4', 10.5, 8),
    ('fuchsia-walk', '2026-09-17/C0028.MP4', 1, 6),
    ('olive-drape', '2026-09-18/C0104.MP4', 0.3, 4.5),
]
inventory = {item['path']: item['id'] for item in json.loads(Path('docs/drive-inventory.json').read_text())}
manifest = []
for name, source, start, duration in clips:
    outputs = []
    for width in (480, 720):
        destination = Path(f'public/media/{name}-{width}.mp4')
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
            '-ss', str(start), '-i', f'raw-assets/{source}', '-t', str(duration),
            '-vf', f'transpose=2,scale={width}:-2,fps=25', '-an', '-c:v', 'libx264',
            '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            str(destination)], check=True)
        outputs.append({'src': f'/media/{destination.name}', 'width': width, 'bytes': destination.stat().st_size})
    poster = Path(f'public/media/{name}-poster.webp')
    frame = subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error',
        '-ss', str(start), '-i', f'raw-assets/{source}', '-frames:v', '1',
        '-vf', 'transpose=2,scale=720:-2', '-f', 'image2pipe', '-c:v', 'png', '-'])
    Image.open(BytesIO(frame)).save(poster, quality=86)
    manifest.append({'id': name, 'source': source, 'driveId': inventory[source],
        'start': start, 'duration': duration, 'audio': False, 'processing':
        'Portrait orientation restored, full frame retained, H.264 CRF26, 25fps, no colour changes.',
        'poster': f'/media/{poster.name}', 'outputs': outputs})
Path('public/media/video-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
