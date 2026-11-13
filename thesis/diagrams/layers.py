# Draws layered package diagrams (stacked layers, packages in a row, arrows between layers) as SVG.
# Usage: python3 layers.py <out-dir>
import os, sys
from xml.sax.saxutils import escape

FONT = "'Times New Roman', Times, serif"
W = 640
PAD = 16
BOX_H = 44
LAYER_GAP = 34


def pkg(x, y, w, h, label):
    tab_w = min(46, w * 0.35)
    lines = label.split('\n')
    out = [f'<path d="M{x},{y + 8} v-8 h{tab_w} v8" fill="#eef1f5" stroke="#111" stroke-width="1.1"/>',
           f'<rect x="{x}" y="{y + 8}" width="{w}" height="{h - 8}" fill="#eef1f5" stroke="#111" stroke-width="1.1"/>']
    for i, l in enumerate(lines):
        ty = y + 8 + (h - 8) / 2 + 5 + (i - (len(lines) - 1) / 2) * 15
        out.append(f'<text x="{x + w / 2:.1f}" y="{ty:.1f}" text-anchor="middle" font-size="14">{escape(l)}</text>')
    return '\n'.join(out)


def arrow(x, y1, y2, label=None):
    out = [f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2 - 2}" stroke="#111" stroke-width="1.3" stroke-dasharray="6 4"/>',
           f'<polyline points="{x - 6},{y2 - 11} {x},{y2 - 1} {x + 6},{y2 - 11}" fill="none" stroke="#111" stroke-width="1.3"/>']
    if label:
        out.append(f'<text x="{x + 8}" y="{(y1 + y2) / 2 + 4}" font-size="12.5" font-style="italic">{escape(label)}</text>')
    return '\n'.join(out)


def draw(d):
    side_w = 130 if d.get('side') else 0
    main_w = W - side_w - (24 if side_w else 0)
    y = 10
    out, layer_boxes = [], []
    for title, items in d['layers']:
        n = len(items)
        lh = 30 + BOX_H + 14
        out.append(f'<rect x="0.5" y="{y}" width="{main_w}" height="{lh}" rx="6" fill="none" stroke="#555" stroke-width="1.1"/>')
        out.append(f'<text x="{PAD}" y="{y + 20}" font-size="14.5" font-weight="bold">{escape(title)}</text>')
        gap = 12
        bw = (main_w - 2 * PAD - gap * (n - 1)) / n
        for i, it in enumerate(items):
            out.append(pkg(PAD + i * (bw + gap), y + 30, bw, BOX_H, it))
        layer_boxes.append((y, y + lh))
        y += lh + LAYER_GAP
    for (a0, a1), (b0, b1) in zip(layer_boxes, layer_boxes[1:]):
        out.append(arrow(main_w / 2, a1, b0, '«sử dụng»'))
    if d.get('side'):
        label, from_layer = d['side']
        ly0, ly1 = layer_boxes[from_layer]
        sx = main_w + 24
        sy = (ly0 + ly1) / 2 - BOX_H / 2
        out.append(pkg(sx, sy, side_w, BOX_H, label))
        mid = sy + BOX_H / 2 + 4
        out.append(f'<line x1="{main_w}" y1="{mid}" x2="{sx - 2}" y2="{mid}" stroke="#111" stroke-width="1.3" stroke-dasharray="6 4"/>')
        out.append(f'<polyline points="{sx - 12},{mid - 6} {sx - 1},{mid} {sx - 12},{mid + 6}" fill="none" stroke="#111" stroke-width="1.3"/>')
    H = y - LAYER_GAP + 10
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W + 2}" height="{H}" viewBox="0 0 {W + 2} {H}" font-family="{FONT}">'
            f'<title>{escape(d["name"])}</title><rect width="100%" height="100%" fill="#fff"/>' + '\n'.join(out) + '</svg>')


DIAGRAMS = [
    {'name': 'goi-api', 'side': ('gói engine', 1), 'layers': [
        ('Tầng HTTP: *.routes.ts', ['định tuyến', 'kiểm tra đầu vào\n(Zod)', 'xác thực,\nphân quyền', 'giới hạn\ntần suất']),
        ('Tầng dịch vụ: modules/', ['auth', 'bán hàng', 'cấu hình PC', 'chat (AI)', 'quản trị']),
        ('Tầng dữ liệu và hạ tầng', ['db/\nschema Drizzle', 'lib/\nRedis, lỗi', 'jobs/\nhủy đơn quá hạn']),
    ]},
    {'name': 'goi-web', 'side': ('gói engine', 1), 'layers': [
        ('app/: định tuyến App Router', ['(shop)\ncửa hàng', '(auth)\nđăng nhập', 'admin\nquản trị']),
        ('features/: mã theo tính năng', ['catalog,\nhome', 'advisor', 'builder', 'cart,\ncheckout', 'admin']),
        ('Thành phần dùng chung', ['components/\nui, domain, layout', 'stores/\nZustand', 'lib/\nAPI, SSE']),
    ]},
]

if __name__ == '__main__':
    out = sys.argv[1]
    for d in DIAGRAMS:
        open(os.path.join(out, d['name'] + '.svg'), 'w', encoding='utf-8').write(draw(d))
        print('svg', d['name'])
