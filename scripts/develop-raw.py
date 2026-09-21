import rawpy,json
from pathlib import Path
from PIL import Image
names=['DSC06963','DSC06967','DSC06973','DSC06962','DSC07018','DSC07024','DSC07025','DSC07041','DSC07046','DSC07051','DSC07053','DSC07072','DSC07085','DSC07089']
out=Path('raw-assets/developed');out.mkdir(parents=True,exist_ok=True)
for name in names:
 matches=list(Path('raw-assets').glob('**/'+name+'.ARW'))
 p=matches[0] if matches else Path('/Users/heitindersingh/Downloads')/(name+'.ARW')
 dest=out/(name+'.jpg')
 if not p.exists(): print('MISSING',p,flush=True);continue
 if dest.exists():continue
 with rawpy.imread(str(p)) as raw:
  rgb=raw.postprocess(use_camera_wb=True,output_color=rawpy.ColorSpace.sRGB,no_auto_bright=False,output_bps=8)
  im=Image.fromarray(rgb)
  print(name,im.size,flush=True)
  im.save(dest,quality=96,subsampling=0)
