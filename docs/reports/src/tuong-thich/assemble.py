# Inlines screenshots (JPEG), the ERD (PNG) and the constraint-graph SVG into report.html.
import base64, io, os, re, sys
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(here, '..', '..', '..', '..'))
src = open(os.path.join(here, 'report.src.html'), encoding='utf-8').read()

def jpeg(path, width):
    im = Image.open(path).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'JPEG', quality=86, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

def png(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()

# Crops of the 1920x1080 @2x screenshots (boxes in CSS pixels) so the PDF shows the part being discussed.
CROPS = {'admin-schema-crop': ('admin-schema', (250, 0, 1905, 1080)),
         'builder-crop': ('builder-conflict', (330, 130, 1590, 1080)),
         'picker-crop': ('picker-dim', (1360, 0, 1920, 782))}
for name, (source, box) in CROPS.items():
    Image.open(f'{here}/shots/{source}.png').crop(tuple(v * 2 for v in box)).save(f'{here}/shots/{name}.png')

imgs = {
    'admin-schema': lambda: jpeg(f'{here}/shots/admin-schema-crop.png', 2000),
    'builder-conflict': lambda: jpeg(f'{here}/shots/builder-crop.png', 2000),
    'picker-dim': lambda: jpeg(f'{here}/shots/picker-crop.png', 1100),
    'erd': lambda: png(f'{REPO}/docs/reports/erd-co-so-du-lieu.png'),
}
src = re.sub(r'\{\{img:([a-z-]+)\}\}', lambda m: imgs[m.group(1)](), src)
svg = open(os.path.join(here, 'graph.svg'), encoding='utf-8').read()
src = src.replace('{{svg:graph}}', svg)
out = os.path.join(here, 'report.html')
open(out, 'w', encoding='utf-8').write(src)
print(out, len(src) // 1024, 'KB')
