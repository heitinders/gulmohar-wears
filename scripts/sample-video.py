import subprocess,json
from PIL import Image,ImageDraw
from pathlib import Path
clips=['2026-09-17/C0028.MP4','2026-09-18/C0094.MP4','2026-09-18/C0104.MP4']
sheet=Image.new('RGB',(1200,1860),'#f7f1e8');draw=ImageDraw.Draw(sheet)
for row,clip in enumerate(clips):
 duration=float(subprocess.check_output(['ffprobe','-v','quiet','-show_entries','format=duration','-of','csv=p=0','raw-assets/'+clip]))
 for col,stamp in enumerate([duration*.2,duration*.5,duration*.8]):
  dest=f'raw-assets/video-frames/{Path(clip).stem}-{int(stamp)}.png'
  subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(stamp),'-i','raw-assets/'+clip,'-frames:v','1','-vf','transpose=2,scale=380:-1',dest],check=True)
  im=Image.open(dest);im.thumbnail((380,570));sheet.paste(im,(col*400,row*620));draw.text((col*400+10,row*620+580),f'{clip} / {stamp:.1f}s',fill='black')
sheet.save('docs/contact-sheets/video-timestamps.jpg')
