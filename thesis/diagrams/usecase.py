# Draws UML use case diagrams as SVG (actors, system boundary, use cases, include/extend, generalisation).
# Usage: python3 usecase.py <out-dir>   -> <out-dir>/<name>.svg for every diagram in DIAGRAMS
import math, os, sys
from xml.sax.saxutils import escape

FONT = "'Times New Roman', Times, serif"
CHAR_W = 7.4      # average glyph width at 15px
ROW = 78          # vertical distance between use case rows


def text_lines(label):
    return label.split('\n')


def uc_size(label):
    lines = text_lines(label)
    w = max(len(l) for l in lines) * CHAR_W
    return max(84, w / 2 + 26), 21 + 9 * (len(lines) - 1)


def ellipse_edge(cx, cy, rx, ry, tx, ty):
    dx, dy = tx - cx, ty - cy
    if dx == 0 and dy == 0:
        return cx, cy
    t = 1 / math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
    return cx + dx * t, cy + dy * t


def actor_svg(x, y, label, system=False):
    out = []
    if system:
        w = max(len(l) for l in text_lines(label)) * CHAR_W + 24
        h = 26 + 18 * len(text_lines(label))
        out.append(f'<rect x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w:.1f}" height="{h}" fill="#fff" stroke="#111" stroke-width="1.3"/>')
        out.append(f'<text x="{x}" y="{y - h / 2 + 17}" text-anchor="middle" font-size="12.5" font-style="italic">«hệ thống»</text>')
        for i, l in enumerate(text_lines(label)):
            out.append(f'<text x="{x}" y="{y - h / 2 + 36 + 18 * i}" text-anchor="middle" font-size="15">{escape(l)}</text>')
        return '\n'.join(out), (w / 2, h / 2)
    out.append(f'<circle cx="{x}" cy="{y - 40}" r="11" fill="#fff" stroke="#111" stroke-width="1.4"/>')
    out.append(f'<line x1="{x}" y1="{y - 29}" x2="{x}" y2="{y + 4}" stroke="#111" stroke-width="1.4"/>')
    out.append(f'<line x1="{x - 18}" y1="{y - 19}" x2="{x + 18}" y2="{y - 19}" stroke="#111" stroke-width="1.4"/>')
    out.append(f'<line x1="{x}" y1="{y + 4}" x2="{x - 15}" y2="{y + 28}" stroke="#111" stroke-width="1.4"/>')
    out.append(f'<line x1="{x}" y1="{y + 4}" x2="{x + 15}" y2="{y + 28}" stroke="#111" stroke-width="1.4"/>')
    for i, l in enumerate(text_lines(label)):
        out.append(f'<text x="{x}" y="{y + 48 + 17 * i}" text-anchor="middle" font-size="15">{escape(l)}</text>')
    return '\n'.join(out), (22, 40)


def arrow_head(x1, y1, x2, y2, kind):
    ang = math.atan2(y2 - y1, x2 - x1)
    if kind == 'open':
        a, l = 0.42, 12
        p1 = (x2 - l * math.cos(ang - a), y2 - l * math.sin(ang - a))
        p2 = (x2 - l * math.cos(ang + a), y2 - l * math.sin(ang + a))
        return f'<polyline points="{p1[0]:.1f},{p1[1]:.1f} {x2:.1f},{y2:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="none" stroke="#111" stroke-width="1.2"/>'
    a, l = 0.5, 16
    p1 = (x2 - l * math.cos(ang - a), y2 - l * math.sin(ang - a))
    p2 = (x2 - l * math.cos(ang + a), y2 - l * math.sin(ang + a))
    return f'<polygon points="{p1[0]:.1f},{p1[1]:.1f} {x2:.1f},{y2:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="#fff" stroke="#111" stroke-width="1.3"/>'


def draw(d):
    W, cols = d['width'], d['cols']
    bx0, bx1 = d['box'][0], W - d['box'][1]
    by0 = 40
    rows = max(u[3] for u in d['ucs']) + 1
    by1 = by0 + 46 + rows * ROW
    col_w = (bx1 - bx0) / cols
    ucs = {}
    for uid, label, col, row in d['ucs']:
        cx = bx0 + col_w * (col + 0.5) + d.get('shift', {}).get(uid, (0, 0))[0]
        cy = by0 + 58 + row * ROW + d.get('shift', {}).get(uid, (0, 0))[1]
        rx, ry = uc_size(label)
        ucs[uid] = (cx, cy, rx, ry, label)
    H = d.get('height', by1 + 40)
    actors = {}
    for aid, label, x, y, *rest in d['actors']:
        actors[aid] = (x, y, label, bool(rest and rest[0] == 'system'))
    body = []
    body.append(f'<rect x="{bx0}" y="{by0}" width="{bx1 - bx0}" height="{by1 - by0}" fill="none" stroke="#111" stroke-width="1.4"/>')
    body.append(f'<text x="{(bx0 + bx1) / 2}" y="{by0 + 24}" text-anchor="middle" font-size="16" font-weight="bold">{escape(d["title"])}</text>')
    # associations first so shapes cover line ends
    lines = []
    for a, u in d['assoc']:
        ax, ay, _, sysa = actors[a]
        cx, cy, rx, ry, _ = ucs[u]
        if sysa:
            sx = ax + (-1 if cx < ax else 1) * 0  # attach at the box edge facing the use case
            half_w = max(len(l) for l in text_lines(actors[a][2])) * CHAR_W / 2 + 12
            sx = ax - half_w if cx < ax else ax + half_w
            if abs(cy - ay) > 60 and abs(cx - ax) < 260:
                sx, ay2 = ax, ay - (26 + 18 * len(text_lines(actors[a][2]))) / 2 * (1 if cy < ay else -1)
                ex, ey = ellipse_edge(cx, cy, rx, ry, sx, ay2)
                lines.append(f'<line x1="{sx:.1f}" y1="{ay2:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#111" stroke-width="1.2"/>')
                continue
            ex, ey = ellipse_edge(cx, cy, rx, ry, sx, ay)
            lines.append(f'<line x1="{sx:.1f}" y1="{ay:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#111" stroke-width="1.2"/>')
            continue
        sx = ax + (24 if cx > ax else -24)
        sy = ay - 14
        ex, ey = ellipse_edge(cx, cy, rx, ry, sx, sy)
        lines.append(f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#111" stroke-width="1.2"/>')
    for child, parent in d.get('gen', []):
        x1, y1, _, _ = actors[child]
        x2, y2, _, _ = actors[parent]
        sy, ey = (y1 - 62, y2 + 50 + 17 * (len(text_lines(actors[parent][2])) - 1)) if y1 > y2 else (y1 + 62, y2 - 56)
        lines.append(f'<line x1="{x1}" y1="{sy}" x2="{x2}" y2="{ey}" stroke="#111" stroke-width="1.2"/>')
        lines.append(arrow_head(x1, sy, x2, ey, 'triangle'))
    for a, b, kind in d.get('rel', []):
        ax, ay, arx, ary, _ = ucs[a]
        bx, by, brx, bry, _ = ucs[b]
        sx, sy = ellipse_edge(ax, ay, arx, ary, bx, by)
        ex, ey = ellipse_edge(bx, by, brx, bry, ax, ay)
        lines.append(f'<line x1="{sx:.1f}" y1="{sy:.1f}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#111" stroke-width="1.15" stroke-dasharray="6 4"/>')
        lines.append(arrow_head(sx, sy, ex, ey, 'open'))
        mx, my = (sx + ex) / 2, (sy + ey) / 2
        off = 12 if abs(ex - sx) > abs(ey - sy) else 0
        anchor = 'middle' if off else 'start'
        lines.append(f'<text x="{mx + (0 if off else 6):.1f}" y="{my - off + (4 if not off else 0):.1f}" text-anchor="{anchor}" font-size="12.5" font-style="italic" fill="#222">«{kind}»</text>')
    body.extend(lines)
    for uid, (cx, cy, rx, ry, label) in ucs.items():
        body.append(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" fill="#fff" stroke="#111" stroke-width="1.3"/>')
        ls = text_lines(label)
        for i, l in enumerate(ls):
            y = cy + 5 + (i - (len(ls) - 1) / 2) * 17
            body.append(f'<text x="{cx:.1f}" y="{y:.1f}" text-anchor="middle" font-size="15">{escape(l)}</text>')
    for aid, (x, y, label, sysa) in actors.items():
        body.append(actor_svg(x, y, label, sysa)[0])
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
            f'font-family="{FONT}"><title>{escape(d["title"])}</title><rect width="100%" height="100%" fill="#fff"/>' + '\n'.join(body) + '</svg>')


DIAGRAMS = [
    {
        'name': 'uc-tong-quat', 'title': 'Hệ thống PC Builder', 'width': 1060, 'cols': 2, 'box': (190, 190),
        'ucs': [
            ('xem', 'Xem và tìm kiếm linh kiện', 0, 0),
            ('ai', 'Tư vấn cấu hình bằng AI', 0, 1),
            ('form', 'Gợi ý cấu hình theo biểu mẫu', 0, 2),
            ('lap', 'Lắp ráp PC tương tác', 0, 3),
            ('mua', 'Mua hàng và thanh toán', 0, 4),
            ('tk', 'Quản lý tài khoản', 0, 5),
            ('chcua', 'Quản lý cấu hình của tôi', 0, 6),
            ('sp', 'Quản lý sản phẩm', 1, 0),
            ('kho', 'Quản lý kho và benchmark', 1, 1),
            ('don', 'Quản lý đơn hàng', 1, 2),
            ('tke', 'Thống kê và đối soát', 1, 3),
            ('chat', 'Xem nhật ký hội thoại AI', 1, 4),
            ('schema', 'Quản lý lược đồ thông số', 1, 5),
            ('algo', 'Quản lý thuật toán gợi ý', 1, 6),
        ],
        'actors': [
            ('guest', 'Khách vãng lai', 80, 250),
            ('cust', 'Khách hàng', 80, 560),
            ('staff', 'Nhân viên', 980, 250),
            ('admin', 'Quản trị viên', 980, 560),
        ],
        'assoc': [('guest', 'xem'), ('guest', 'ai'), ('guest', 'form'), ('guest', 'lap'), ('guest', 'mua'),
                  ('cust', 'tk'), ('cust', 'chcua'),
                  ('staff', 'sp'), ('staff', 'kho'), ('staff', 'don'), ('staff', 'tke'), ('staff', 'chat'),
                  ('admin', 'schema'), ('admin', 'algo')],
        'gen': [('cust', 'guest'), ('admin', 'staff')],
        'height': 690,
    },
    {
        'name': 'uc-tu-van-ai', 'title': 'Tư vấn cấu hình bằng AI', 'width': 1000, 'cols': 2, 'box': (170, 200),
        'ucs': [
            ('gui', 'Mô tả nhu cầu bằng tiếng Việt', 0, 0),
            ('nhan', 'Nhận 2–3 cấu hình gợi ý', 0, 1),
            ('sua', 'Chỉnh cấu hình bằng hội thoại', 0, 2),
            ('hoi', 'Hỏi thông tin linh kiện', 0, 3),
            ('ktra', 'Kiểm tra tương thích qua chat', 0, 4),
            ('hoilai', 'Hỏi lại khi thiếu\nngân sách, mục đích', 1, 0),
            ('hieu', 'Phân tích yêu cầu,\ngọi công cụ', 1, 1),
            ('dp', 'Trả lời ở chế độ dự phòng', 1, 2),
            ('gio', 'Thêm cả bộ vào giỏ', 1, 3),
            ('mo', 'Mở trong Customizer', 1, 4),
        ],
        'actors': [('khach', 'Khách vãng lai /\nKhách hàng', 75, 300), ('gem', 'Google Gemini', 905, 136, 'system')],
        'assoc': [('khach', 'gui'), ('khach', 'nhan'), ('khach', 'sua'), ('khach', 'hoi'), ('khach', 'ktra'), ('gem', 'hieu')],
        'rel': [('hoilai', 'gui', 'extend'), ('gui', 'hieu', 'include'), ('dp', 'hieu', 'extend'), ('gio', 'nhan', 'extend'), ('mo', 'nhan', 'extend')],
        'height': 520,
    },
    {
        'name': 'uc-lap-rap', 'title': 'Lắp ráp PC tương tác', 'width': 980, 'cols': 2, 'box': (170, 40),
        'ucs': [
            ('chon', 'Chọn linh kiện cho từng slot', 0, 0),
            ('loc', 'Lọc ứng viên trong hộp chọn', 0, 1),
            ('xem', 'Xem cảnh báo tương thích', 0, 2),
            ('tong', 'Xem tổng giá và công suất', 0, 3),
            ('luu', 'Lưu và chia sẻ cấu hình', 0, 4),
            ('kt', 'Kiểm tra tương thích tức thì', 1, 0),
            ('an', 'Ẩn linh kiện không tương thích', 1, 1),
            ('pdf', 'Xuất báo giá PDF', 1, 3),
            ('giohang', 'Thêm cả bộ vào giỏ', 1, 4),
            ('aitoiuu', 'Nhờ AI tối ưu cấu hình', 1, 2),
        ],
        'actors': [('khach', 'Khách vãng lai /\nKhách hàng', 75, 300)],
        'assoc': [('khach', 'chon'), ('khach', 'loc'), ('khach', 'xem'), ('khach', 'tong'), ('khach', 'luu')],
        'rel': [('chon', 'kt', 'include'), ('an', 'loc', 'extend'), ('pdf', 'luu', 'extend'), ('giohang', 'luu', 'extend'), ('aitoiuu', 'xem', 'extend')],
        'height': 520,
    },
    {
        'name': 'uc-mua-hang', 'title': 'Mua hàng và thanh toán', 'width': 1000, 'cols': 2, 'box': (170, 200),
        'ucs': [
            ('gio', 'Quản lý giỏ hàng', 0, 0),
            ('dat', 'Đặt hàng lẻ hoặc lắp ráp', 0, 1),
            ('tt', 'Thanh toán bằng VietQR', 0, 2),
            ('theo', 'Theo dõi đơn hàng', 0, 3),
            ('huy', 'Hủy đơn chờ thanh toán', 0, 4),
            ('giu', 'Giữ hàng 15 phút', 1, 1),
            ('xn', 'Tự động xác nhận thanh toán', 1, 2),
            ('gop', 'Gộp giỏ khi đăng nhập', 1, 0),
        ],
        'actors': [('khach', 'Khách vãng lai /\nKhách hàng', 75, 300), ('bank', 'Ngân hàng /\nSePay', 905, 230, 'system')],
        'assoc': [('khach', 'gio'), ('khach', 'dat'), ('khach', 'tt'), ('khach', 'theo'), ('khach', 'huy'), ('bank', 'xn')],
        'rel': [('dat', 'giu', 'include'), ('tt', 'xn', 'include'), ('gop', 'gio', 'extend')],
        'height': 520,
    },
    {
        'name': 'uc-quan-ly-san-pham', 'title': 'Quản lý sản phẩm, kho và benchmark', 'width': 1000, 'cols': 2, 'box': (170, 170),
        'ucs': [
            ('them', 'Thêm, sửa sản phẩm', 0, 0),
            ('an', 'Ẩn sản phẩm', 0, 1),
            ('nhap', 'Nhập kho, điều chỉnh tồn', 0, 2),
            ('ls', 'Xem lịch sử biến động kho', 0, 3),
            ('bm', 'Cập nhật điểm benchmark', 0, 4),
            ('form', 'Nhập thông số theo\nbiểu mẫu động', 1, 0),
            ('boost', 'Đặt hệ số ưu tiên thương mại', 1, 1),
            ('schema', 'Sửa lược đồ thông số\ncủa danh mục', 1, 3),
        ],
        'actors': [('staff', 'Nhân viên', 75, 210), ('admin', 'Quản trị viên', 925, 420)],
        'assoc': [('staff', 'them'), ('staff', 'an'), ('staff', 'nhap'), ('staff', 'ls'), ('staff', 'bm'), ('admin', 'schema')],
        'rel': [('them', 'form', 'include'), ('boost', 'them', 'extend')],
        'gen': [],
        'height': 520,
    },
    {
        'name': 'uc-thuat-toan', 'title': 'Quản lý thuật toán gợi ý', 'width': 900, 'cols': 2, 'box': (170, 40),
        'ucs': [
            ('xem', 'Xem ma trận trọng số', 0, 0),
            ('sua', 'Sửa trọng số theo mục đích', 0, 1),
            ('kp', 'Sửa khoảng phân bổ ngân sách', 0, 2),
            ('thu', 'Chạy thử gợi ý cấu hình', 0, 3),
            ('kt', 'Kiểm tra tổng trọng số\nvà khoảng hợp lệ', 1, 1),
            ('cache', 'Làm mới bộ nhớ đệm gợi ý', 1, 2),
        ],
        'actors': [('admin', 'Quản trị viên', 75, 220)],
        'assoc': [('admin', 'xem'), ('admin', 'sua'), ('admin', 'kp'), ('admin', 'thu')],
        'rel': [('sua', 'kt', 'include'), ('sua', 'cache', 'include')],
        'height': 420,
    },
    {
        'name': 'uc-don-hang', 'title': 'Quản lý đơn hàng và thống kê', 'width': 1000, 'cols': 2, 'box': (170, 170),
        'ucs': [
            ('loc', 'Xem, lọc danh sách đơn', 0, 0),
            ('ct', 'Xem chi tiết đơn', 0, 1),
            ('cn', 'Chuyển trạng thái đơn', 0, 2),
            ('ds', 'Đối soát giao dịch thanh toán', 0, 3),
            ('tk', 'Xem thống kê doanh thu', 0, 4),
            ('xn', 'Xác nhận thanh toán thủ công', 1, 2),
            ('hoan', 'Hủy đơn đã thanh toán\n(hoàn tiền)', 1, 3),
        ],
        'actors': [('staff', 'Nhân viên', 75, 260), ('admin', 'Quản trị viên', 925, 300)],
        'assoc': [('staff', 'loc'), ('staff', 'ct'), ('staff', 'cn'), ('staff', 'ds'), ('staff', 'tk'), ('admin', 'xn'), ('admin', 'hoan')],
        'rel': [('xn', 'cn', 'extend'), ('hoan', 'cn', 'extend')],
        'height': 520,
    },
    {
        'name': 'uc-tai-khoan', 'title': 'Quản lý tài khoản', 'width': 900, 'cols': 2, 'box': (170, 40),
        'ucs': [
            ('dk', 'Đăng ký', 0, 0),
            ('dn', 'Đăng nhập', 0, 1),
            ('dx', 'Đăng xuất', 0, 2),
            ('dmk', 'Đổi mật khẩu', 0, 3),
            ('don', 'Xem đơn hàng của tôi', 0, 4),
            ('gop', 'Gộp giỏ hàng tạm', 1, 1),
            ('lm', 'Làm mới phiên đăng nhập', 1, 2),
        ],
        'actors': [('guest', 'Khách vãng lai', 75, 120), ('cust', 'Khách hàng', 75, 380)],
        'assoc': [('guest', 'dk'), ('guest', 'dn'), ('cust', 'dx'), ('cust', 'dmk'), ('cust', 'don')],
        'rel': [('dn', 'gop', 'include'), ('lm', 'dn', 'extend')],
        'height': 520,
    },
]

if __name__ == '__main__':
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for d in DIAGRAMS:
        open(os.path.join(out, d['name'] + '.svg'), 'w', encoding='utf-8').write(draw(d))
        print('svg', d['name'])
