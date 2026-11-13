# Draws compact UML sequence diagrams as SVG with fixed lifeline spacing, so they stay legible at A4 width.
# Usage: python3 sequence.py <out-dir>   -> <out-dir>/<name>.svg for every diagram in DIAGRAMS
import os, sys
from xml.sax.saxutils import escape

FONT = "'Times New Roman', Times, serif"
STEP = 40        # vertical distance between messages
LINE = 16        # extra height per additional label line


def svg_text(x, y, s, anchor='middle', size=14.5, extra=''):
    return f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-size="{size}" {extra}>{escape(s)}</text>'


def draw(d):
    gap = d.get('gap', 132)
    names = [p[0] for p in d['parts']]
    xs = {n: 70 + i * gap for i, n in enumerate(names)}
    W = 70 * 2 + gap * (len(names) - 1)
    top = 18
    head_h = 40
    y = top + head_h + 26
    body, frames = [], []
    open_frames = []
    n = 0
    for m in d['msgs']:
        kind = m[0]
        if kind in ('loop', 'alt', 'else'):
            if kind == 'else':
                fr = open_frames[-1]
                fr['seps'].append((y - 10, m[1]))
                y += 14
                continue
            open_frames.append({'kind': kind, 'label': m[1], 'y0': y - 12, 'seps': []})
            y += 18
            continue
        if kind == 'end':
            fr = open_frames.pop()
            fr['y1'] = y - 12
            frames.append(fr)
            y += 8
            continue
        a, b, label = m[1], m[2], m[3]
        dashed = kind == 'ret'
        lines = label.split('\n')
        y += LINE * (len(lines) - 1)
        n += 1
        x1, x2 = xs[a], xs[b]
        if a == b:
            body.append(f'<path d="M{x1:.1f},{y:.1f} h34 v18 h-34" fill="none" stroke="#111" stroke-width="1.2"/>')
            body.append(f'<polyline points="{x1 + 9:.1f},{y + 13:.1f} {x1 + 1:.1f},{y + 18:.1f} {x1 + 9:.1f},{y + 23:.1f}" fill="none" stroke="#111" stroke-width="1.2"/>')
            last = a == names[-1]
            for i, l in enumerate(lines):
                ty = y - 4 - LINE * (len(lines) - 1 - i) + 12
                body.append(svg_text(x1 - 20, ty, l, 'end') if last else svg_text(x1 + 40, ty, l, 'start'))
            body.append(f'<circle cx="{x1 - 10:.1f}" cy="{y:.1f}" r="7.5" fill="#111"/>' + svg_text(x1 - 10, y + 3.6, str(n), size=10, extra='fill="#fff" font-weight="bold"'))
            y += STEP + 12
            continue
        direction = 1 if x2 > x1 else -1
        end = x2 - direction * 2
        dash = ' stroke-dasharray="6 4"' if dashed else ''
        body.append(f'<line x1="{x1:.1f}" y1="{y:.1f}" x2="{end:.1f}" y2="{y:.1f}" stroke="#111" stroke-width="1.2"{dash}/>')
        if dashed:
            body.append(f'<polyline points="{end - direction * 10:.1f},{y - 5:.1f} {end:.1f},{y:.1f} {end - direction * 10:.1f},{y + 5:.1f}" fill="none" stroke="#111" stroke-width="1.2"/>')
        else:
            body.append(f'<polygon points="{end - direction * 10:.1f},{y - 5:.1f} {end:.1f},{y:.1f} {end - direction * 10:.1f},{y + 5:.1f}" fill="#111"/>')
        mid = (x1 + x2) / 2
        for i, l in enumerate(lines):
            body.append(svg_text(mid, y - 6 - LINE * (len(lines) - 1 - i), l))
        body.append(f'<circle cx="{x1 - direction * 10:.1f}" cy="{y:.1f}" r="7.5" fill="#111"/>' + svg_text(x1 - direction * 10, y + 3.6, str(n), size=10, extra='fill="#fff" font-weight="bold"'))
        y += STEP
    y += 6
    H = y + head_h + 20
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}"><title>{escape(d["name"])}</title><rect width="100%" height="100%" fill="#fff"/>']
    for name in names:
        x = xs[name]
        out.append(f'<line x1="{x}" y1="{top + head_h}" x2="{x}" y2="{H - head_h - 16}" stroke="#777" stroke-width="1" stroke-dasharray="4 4"/>')
    for fr in frames:
        x0 = 14
        x1 = W - 14
        out.append(f'<rect x="{x0}" y="{fr["y0"]:.1f}" width="{x1 - x0}" height="{fr["y1"] - fr["y0"]:.1f}" fill="none" stroke="#555" stroke-width="1"/>')
        tag = fr['kind']
        out.append(f'<path d="M{x0},{fr["y0"]:.1f} h44 v14 l-6,6 h-38 z" fill="#f1f2f3" stroke="#555" stroke-width="1"/>')
        out.append(svg_text(x0 + 20, fr['y0'] + 14, tag, size=12.5, extra='font-weight="bold"'))
        out.append(svg_text(x0 + 52, fr['y0'] + 14, f'[{fr["label"]}]', 'start', size=13, extra='font-style="italic"'))
        for sy, label in fr['seps']:
            out.append(f'<line x1="{x0}" y1="{sy:.1f}" x2="{x1}" y2="{sy:.1f}" stroke="#555" stroke-width="1" stroke-dasharray="5 4"/>')
            out.append(svg_text(x0 + 6, sy + 14, f'[{label}]', 'start', size=13, extra='font-style="italic"'))
    out.extend(body)
    for (name, label, kind) in d['parts']:
        x = xs[name]
        for yy in (top, H - head_h - 16):
            if kind == 'actor':
                cy = yy + 8
                out.append(f'<circle cx="{x}" cy="{cy}" r="6" fill="#fff" stroke="#111" stroke-width="1.2"/>'
                           f'<line x1="{x}" y1="{cy + 6}" x2="{x}" y2="{cy + 18}" stroke="#111" stroke-width="1.2"/>'
                           f'<line x1="{x - 9}" y1="{cy + 10}" x2="{x + 9}" y2="{cy + 10}" stroke="#111" stroke-width="1.2"/>'
                           f'<line x1="{x}" y1="{cy + 18}" x2="{x - 8}" y2="{cy + 27}" stroke="#111" stroke-width="1.2"/>'
                           f'<line x1="{x}" y1="{cy + 18}" x2="{x + 8}" y2="{cy + 27}" stroke="#111" stroke-width="1.2"/>')
                out.append(svg_text(x, yy + 50, label, size=14, extra='font-weight="bold"'))
            else:
                w = gap - 22
                out.append(f'<rect x="{x - w / 2:.1f}" y="{yy}" width="{w:.1f}" height="{head_h - 6}" rx="3" fill="#eef1f5" stroke="#111" stroke-width="1.2"/>')
                ls = label.split('\n')
                for i, l in enumerate(ls):
                    out.append(svg_text(x, yy + (head_h - 6) / 2 + 5 + (i - (len(ls) - 1) / 2) * 14, l, size=14, extra='font-weight="bold"'))
    out.append('</svg>')
    return '\n'.join(out)


DIAGRAMS = [
    {
        'name': 'seq-tu-van', 'gap': 118,
        'parts': [('K', 'Khách', 'actor'), ('W', 'Web', 'box'), ('A', 'API', 'box'), ('G', 'Gemini', 'box'), ('E', 'Engine', 'box'), ('D', 'CSDL', 'box')],
        'msgs': [
            ('call', 'K', 'W', '"chơi game\n25 triệu"'),
            ('call', 'W', 'A', 'POST tin nhắn\n(SSE)'),
            ('call', 'A', 'D', 'lưu tin, đọc 20 tin gần nhất'),
            ('call', 'A', 'G', 'lịch sử, chỉ dẫn,\n5 công cụ'),
            ('ret', 'G', 'A', 'gọi\nrecommend_builds'),
            ('call', 'A', 'E', 'solve(yêu cầu, kho)'),
            ('ret', 'E', 'A', '3 cấu hình tương thích'),
            ('call', 'A', 'D', 'lưu 3 cấu hình'),
            ('ret', 'A', 'W', 'sự kiện builds'),
            ('call', 'A', 'G', 'kết quả công cụ'),
            ('ret', 'G', 'A', 'lời giải thích\n(stream)'),
            ('ret', 'A', 'W', 'sự kiện token'),
            ('call', 'A', 'A', 'kiểm tra số tiền\ntrong câu trả lời'),
            ('call', 'A', 'D', 'lưu lượt chat'),
            ('ret', 'A', 'W', 'sự kiện done'),
            ('ret', 'W', 'K', 'thẻ cấu hình,\nlời giải thích'),
        ],
    },
    {
        'name': 'seq-dat-hang', 'gap': 128,
        'parts': [('K', 'Khách', 'actor'), ('W', 'Web', 'box'), ('A', 'API', 'box'), ('D', 'PostgreSQL', 'box'), ('N', 'Ngân hàng\n/ SePay', 'box')],
        'msgs': [
            ('call', 'K', 'W', 'bấm Đặt hàng'),
            ('call', 'W', 'A', 'POST /orders'),
            ('call', 'A', 'D', 'giữ hàng nếu còn đủ\n(reserved += q)'),
            ('call', 'A', 'D', 'tạo đơn chờ thanh toán\nhạn 15 phút'),
            ('ret', 'A', 'W', '201, mã đơn'),
            ('call', 'W', 'A', 'lấy thông tin\nthanh toán'),
            ('ret', 'A', 'W', 'ảnh VietQR\nđúng số tiền'),
            ('call', 'K', 'N', 'quét mã, chuyển khoản'),
            ('call', 'N', 'A', 'webhook báo có'),
            ('call', 'A', 'D', 'lưu giao dịch, đơn PAID,\ntrừ kho, ghi nhật ký'),
            ('ret', 'A', 'N', '200 OK'),
            ('loop', 'mỗi 3 giây'),
            ('call', 'W', 'A', 'hỏi trạng thái đơn'),
            ('end',),
            ('ret', 'A', 'W', 'PAID'),
            ('ret', 'W', 'K', 'đã nhận thanh toán'),
        ],
    },
    {
        'name': 'seq-lap-rap', 'gap': 150,
        'parts': [('K', 'Khách', 'actor'), ('B', 'Trang builder', 'box'), ('E', 'engine\n(trình duyệt)', 'box'), ('A', 'API', 'box')],
        'msgs': [
            ('call', 'K', 'B', 'chọn linh kiện\ncho một ô'),
            ('call', 'B', 'E', 'checkCompatibility(...)'),
            ('ret', 'E', 'B', 'lỗi, cảnh báo,\ncông suất'),
            ('ret', 'B', 'K', 'cập nhật từng ô,\ntổng giá'),
            ('call', 'K', 'B', 'lưu và chia sẻ'),
            ('call', 'B', 'A', 'POST /builds'),
            ('call', 'A', 'A', 'nạp lại sản phẩm,\nchạy cùng bộ luật'),
            ('alt', 'còn lỗi cứng'),
            ('ret', 'A', 'B', '422 INCOMPATIBLE'),
            ('ret', 'B', 'K', 'báo lỗi kèm mã luật'),
            ('else', 'hợp lệ'),
            ('ret', 'A', 'B', '201, mã cấu hình'),
            ('ret', 'B', 'K', 'đường dẫn /builds/:id'),
            ('end',),
        ],
    },
]

if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for d in DIAGRAMS:
        open(os.path.join(out, d['name'] + '.svg'), 'w', encoding='utf-8').write(draw(d))
        print('svg', d['name'])
