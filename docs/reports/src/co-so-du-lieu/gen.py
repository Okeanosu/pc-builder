# Builds db.html (detailed database report: tables, columns, relationships) from the data dictionary content,
# content.py and samples.json. Usage: PYTHONPATH=<pylib> python3 gen.py
import base64, html, importlib.util, json, os, re

here = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(here, '..', '..', '..', '..'))


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


D = load(os.path.join(here, '..', 'tu-dien-du-lieu', 'data.py'), 'data')
C = load(os.path.join(here, 'content.py'), 'content')
SAMPLES = json.load(open(os.path.join(here, 'samples.json'), encoding='utf-8'))
e = html.escape

# Corrections to the earlier dictionary, checked against the code on 2026-11-12.
FIX = {
    ('purpose_weights', 'allocation'): 'Khoảng tỷ lệ ngân sách {min, max} gợi ý cho từng danh mục. Engine thử trước các món có giá nằm trong khoảng; món ngoài khoảng vẫn hợp lệ, chỉ được thử sau.',
    ('users', 'role'): 'CUSTOMER mua hàng; STAFF vào được trang quản trị (đơn hàng, kho, sản phẩm, hội thoại); ADMIN có thêm quyền sửa lược đồ thông số, trọng số thuật toán, xác nhận thanh toán tay và hủy đơn đã thanh toán.',
}

TABLES = {t['id']: t for g in D.GROUPS for t in g['tables']}
COUNTS = {'users': 4, 'categories': 8, 'brands': 37, 'products': 240, 'benchmarks': 62, 'inventory_movements': 229,
          'purpose_weights': 4, 'builds': 135, 'carts': 2, 'cart_items': 1, 'orders': 4, 'order_items': 32,
          'payments': 2, 'chat_sessions': 8, 'chat_messages': 44}

# Sample row per table (chat_messages mixes the tool row and the assistant row of the same turn).
def sample_row(table):
    if table == 'chat_messages':
        row = dict(SAMPLES['chat_tool'])
        a = SAMPLES['chat_assistant']
        row.update({'content': a['content'], 'mode': a['mode'], 'latency_ms': a['latency_ms']})
        row['tool_result'] = '{"budget":25000000,"builds":[…]}'
        return row
    if table == 'benchmarks':
        row = dict(SAMPLES['benchmarks'])
        row['gpu_score'] = None
        return row
    if table == 'categories':
        row = dict(SAMPLES['categories'])
        row['spec_schema'] = f"[{row['n']} trường] socket, cores…"
        return row
    return SAMPLES.get(table) or {}


UUID = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-')


def fmt_value(table, col, typ, v):
    if v is None:
        return '<span class="null">NULL</span>'
    if col == 'password_hash':
        return e(v[:13] + '…')
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)) and typ.startswith('bigint'):
        return f'{int(v):,}'.replace(',', '.')
    if isinstance(v, (dict, list)):
        s = json.dumps(v, ensure_ascii=False, separators=(',', ':'))
        return e(s[:44] + ('…' if len(s) > 44 else ''))
    s = str(v)
    if UUID.match(s):
        return e(s[:8] + '…')
    if re.match(r'^\d{4}-\d{2}-\d{2}T', s):
        return e(s[:16].replace('T', ' '))
    s = s.replace('\n', ' ')
    return e(s[:40] + ('…' if len(s) > 40 else ''))


def keys_of(constraint):
    out = []
    if 'PK' in constraint: out.append('PK')
    if 'FK' in constraint: out.append('FK')
    if 'UK' in constraint: out.append('UK')
    return out


def constraint_text(c):
    c = re.sub(r'^PK,?\s*', '', c)
    c = re.sub(r'FK → [a-z_.]+,?\s*', '', c)
    c = re.sub(r'\(xóa theo [^)]*\)', '', c)
    c = re.sub(r'UK,?\s*', '', c)
    return c.strip(' ,')


def columns_table(t):
    row = sample_row(t['id'])
    out = ['<div class="table cols"><table><thead><tr><th>Cột</th><th>Kiểu</th><th>Khóa</th><th>Null, mặc định</th><th>Ý nghĩa</th><th>Ví dụ (dữ liệu thật)</th></tr></thead><tbody>']
    for name, typ, cons, meaning in t['cols']:
        meaning = FIX.get((t['id'], name), meaning)
        nullable = typ.endswith('?')
        base = typ.rstrip('?')
        keys = ' '.join(f'<span class="k k-{k.lower()}">{k}</span>' for k in keys_of(cons))
        rest = constraint_text(cons)
        if 'PK' in cons and 'NOT NULL' not in rest:
            rest = ('NOT NULL, ' + rest) if rest else 'NOT NULL'
        if nullable:
            rest = ('cho phép NULL' + (', ' + rest if rest else ''))
        ex = fmt_value(t['id'], name, typ, row.get(name)) if row else ''
        out.append(f'<tr><td class="cn"><code>{e(name)}</code></td><td class="ty">{e(base)}</td><td class="ky">{keys}</td>'
                   f'<td class="cs">{e(rest)}</td><td>{e(meaning)}</td><td class="ex">{ex}</td></tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)


def relations_html(tid):
    outgoing = [f for f in C.FKS if f[0] == tid]
    incoming = [f for f in C.FKS if f[2] == tid]
    soft = [s for s in C.SOFT if s[0].split('.')[0] == tid or s[1].split('.')[0] == tid]
    items = []
    for ft, fc, tt, card, od, meaning in outgoing:
        items.append(f'<li><span class="dir">trỏ tới</span><code>{ft}.{fc}</code> → <code>{tt}.id</code><span class="card">{card}</span><span class="od od-{od[:2].lower()}">{od}</span><span class="m">{e(meaning)}</span></li>')
    for ft, fc, tt, card, od, meaning in incoming:
        items.append(f'<li><span class="dir in">được trỏ bởi</span><code>{ft}.{fc}</code><span class="card">{card}</span><span class="od od-{od[:2].lower()}">{od}</span><span class="m">{e(meaning)}</span></li>')
    for a, b, how, _why in soft:
        items.append(f'<li><span class="dir soft">quan hệ mềm</span><code>{e(a)}</code> ↔ <code>{e(b)}</code><span class="m">{e(how)}</span></li>')
    if not items:
        return ''
    return '<h4>Quan hệ</h4><ul class="rels">' + ''.join(items) + '</ul>'


def indexes_html(tid):
    rows = [i for i in C.INDEXES if i[0] == tid]
    if not rows:
        return ''
    return '<h4>Chỉ mục và ràng buộc</h4><ul class="idx">' + ''.join(
        f'<li><code>{e(n)}</code> <span class="muted">{e(m)}</span>: {e(p)}</li>' for _, n, m, p in rows) + '</ul>'


def table_section(t, num):
    notes = [n for n in t['notes'] if 'Chỉ mục' not in n]
    notes_html = ('<h4>Ghi chú</h4><ul>' + ''.join(f'<li>{e(n)}</li>' for n in notes) + '</ul>') if notes else ''
    n = COUNTS.get(t['id'])
    return (f'<section class="tbl" id="t-{t["id"]}"><h3><span class="num">{num}</span><code>{t["id"]}</code> <span class="vi">{e(t["vi"])}</span>'
            f'<span class="cnt">{n} dòng · {len(t["cols"])} cột</span></h3>'
            f'<p><strong>Lưu gì:</strong> {e(t["purpose"])}</p><p class="muted"><strong>Dùng ở:</strong> {e(t["used"])}</p>'
            + columns_table(t) + relations_html(t['id']) + indexes_html(t['id']) + notes_html + '</section>')


MERMAID = {
    'Sản phẩm': '''erDiagram
  categories ||--o{ products : "category_id"
  brands ||--o{ products : "brand_id"
  products ||--o| benchmarks : "product_id (PK)"
  products ||--o{ inventory_movements : "product_id"
  users |o--o{ inventory_movements : "actor_id"''',
    'Cấu hình PC': '''erDiagram
  users |o--o{ builds : "user_id"
  users |o--o{ purpose_weights : "updated_by"
  builds |o--o{ cart_items : "build_id"
  builds |o--o{ orders : "build_id"
  builds |o--o{ order_items : "build_id"''',
    'Giỏ hàng': '''erDiagram
  users ||--o| carts : "user_id (UNIQUE)"
  carts ||--o{ cart_items : "cart_id"
  products ||--o{ cart_items : "product_id"
  builds |o--o{ cart_items : "build_id"''',
    'Đơn hàng & thanh toán': '''erDiagram
  users |o--o{ orders : "user_id"
  builds |o--o{ orders : "build_id"
  orders ||--|{ order_items : "order_id"
  products ||--o{ order_items : "product_id"
  builds |o--o{ order_items : "build_id"
  orders |o--o{ payments : "order_id"''',
    'Trợ lý AI': '''erDiagram
  users |o--o{ chat_sessions : "user_id"
  chat_sessions ||--o{ chat_messages : "session_id"''',
}
GROUP_INTRO = {
    'Tài khoản': 'Một bảng users là gốc của phân quyền. Sáu khóa ngoại trỏ về đây; chỉ carts xóa theo tài khoản, các bảng khác dùng NO ACTION để giữ lịch sử.',
    'Sản phẩm': 'products là bảng trung tâm của hệ thống: năm bảng khác trỏ vào nó. categories và brands là bảng tra cứu; thông số đổi theo danh mục nằm trong cột JSONB specs.',
    'Kho & hiệu năng': 'Hai bảng phụ của products: benchmarks là quan hệ một – một (khóa chính cũng là khóa ngoại), inventory_movements là nhật ký một – nhiều.',
    'Cấu hình PC': 'builds lưu kết quả của Engine hoặc của Customizer; ba bảng trong luồng mua hàng trỏ về nó qua build_id. purpose_weights là tham số của thuật toán.',
    'Giỏ hàng': 'Giỏ của tài khoản đã đăng nhập. Dòng giỏ có build_id khi khách thêm cả bộ cấu hình, nên một giỏ có thể chứa cả hàng lẻ lẫn nhiều bộ máy.',
    'Đơn hàng & thanh toán': 'orders là đầu mối: order_items là phần của đơn (xóa theo đơn), payments ghi mọi khoản tiền về, kể cả khoản không khớp đơn nào.',
    'Trợ lý AI': 'Mỗi phiên chat có nhiều dòng tin; một lượt chat ghi ba loại dòng (user, tool, assistant). Liên kết tới cấu hình là quan hệ mềm qua mảng build_ids.',
}

GROUP_IDS = {'Tài khoản': 'tai-khoan', 'Sản phẩm': 'san-pham', 'Kho & hiệu năng': 'kho', 'Cấu hình PC': 'cau-hinh', 'Giỏ hàng': 'gio-hang', 'Đơn hàng & thanh toán': 'don-hang', 'Trợ lý AI': 'tro-ly'}


def fk_catalog():
    rows = []
    for i, (ft, fc, tt, card, od, meaning) in enumerate(C.FKS, 1):
        rows.append(f'<tr><td class="num">{i}</td><td><code>{ft}.{fc}</code></td><td><code>{tt}.id</code></td><td class="nw">{card}</td>'
                    f'<td><span class="od od-{od[:2].lower()}">{od}</span></td><td>{e(meaning)}</td></tr>')
    return ('<div class="table"><table><thead><tr><th class="num">#</th><th>Khóa ngoại</th><th>Trỏ tới</th><th>Lực lượng</th><th>Khi xóa cha</th><th>Ý nghĩa nghiệp vụ</th></tr></thead><tbody>'
            + ''.join(rows) + '</tbody></table></div>')


def soft_table():
    rows = ''.join(f'<tr><td><code>{e(a)}</code></td><td><code>{e(b)}</code></td><td>{e(how)}</td><td>{why}</td></tr>' for a, b, how, why in C.SOFT)
    return ('<div class="table"><table><thead><tr><th>Từ</th><th>Tới</th><th>Liên kết bằng</th><th>Vì sao không dùng khóa ngoại</th></tr></thead><tbody>'
            + rows + '</tbody></table></div>')


def hub_table():
    inc = {}
    for ft, fc, tt, *_ in C.FKS:
        inc.setdefault(tt, []).append(f'{ft}.{fc}')
    rows = sorted(inc.items(), key=lambda kv: -len(kv[1]))
    return ('<div class="table"><table><thead><tr><th>Bảng được tham chiếu</th><th class="num">Số khóa ngoại trỏ tới</th><th>Từ các cột</th></tr></thead><tbody>'
            + ''.join(f'<tr><td><code>{t}</code></td><td class="num">{len(v)}</td><td>{", ".join(f"<code>{x}</code>" for x in v)}</td></tr>' for t, v in rows)
            + '</tbody></table></div>')


def overview_table():
    rows = []
    for g in D.GROUPS:
        for t in g['tables']:
            rows.append(f'<tr><td>{e(g["name"])}</td><td><a href="#t-{t["id"]}"><code>{t["id"]}</code></a></td><td>{e(t["vi"])}</td><td class="num">{len(t["cols"])}</td><td class="num">{COUNTS[t["id"]]}</td></tr>')
    return ('<div class="table"><table><thead><tr><th>Nhóm</th><th>Bảng</th><th>Tên tiếng Việt</th><th class="num">Cột</th><th class="num">Số dòng</th></tr></thead><tbody>'
            + ''.join(rows) + '</tbody></table></div>')


def enums_table():
    return ('<div class="table"><table><thead><tr><th>Kiểu enum</th><th>Giá trị</th><th>Ý nghĩa</th><th>Dùng ở cột</th></tr></thead><tbody>'
            + ''.join(f'<tr><td><code>{n}</code></td><td><code>{e(v)}</code></td><td>{e(m)}</td><td>{e(ENUM_USE[n])}</td></tr>' for n, v, m in D.ENUMS)
            + '</tbody></table></div>')


ENUM_USE = {'role': 'users.role', 'product_status': 'products.status', 'order_status': 'orders.status',
            'order_type': 'orders.type', 'payment_status': 'orders.payment_status', 'movement_reason': 'inventory_movements.reason',
            'build_source': 'builds.source', 'chat_mode': 'chat_sessions.mode, chat_messages.mode', 'chat_role': 'chat_messages.role'}


def spec_keys_table():
    rows = []
    for key, label, fields in C.SPEC_KEYS:
        cells = '; '.join(f'<code>{e(k)}</code> {e(v)}' for k, v in fields)
        rows.append(f'<tr><td class="nw">{e(label)}</td><td>{cells}</td></tr>')
    return '<div class="table"><table><thead><tr><th>Danh mục</th><th>Khóa trong specs và ý nghĩa</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table></div>'


def queries_html():
    out = []
    for title, sql, rows, cols in C.QUERIES:
        res = ('<table class="res"><thead><tr>' + ''.join(f'<th>{c}</th>' for c in cols) + '</tr></thead><tbody>'
               + ''.join('<tr>' + ''.join(f'<td>{e(x)}</td>' for x in r) + '</tr>' for r in rows) + '</tbody></table>')
        out.append(f'<div class="query"><h4>{e(title)}</h4><pre class="code"><code>{e(sql)}</code></pre>{res}</div>')
    return ''.join(out)


def png_uri(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


# ---------- page ----------
groups_html = []
num = 0
for g in D.GROUPS:
    diagram = MERMAID.get(g['name'])
    fig = (f'<figure class="mini"><div class="diagram"><pre class="mermaid">{e(diagram)}</pre></div></figure>') if diagram else ''
    body = []
    for t in g['tables']:
        num += 1
        body.append(table_section(t, num))
    groups_html.append(f'<section class="grp" id="g-{GROUP_IDS[g["name"]]}"><h2>Nhóm {e(g["name"])}</h2><p>{e(GROUP_INTRO[g["name"]])}</p>{fig}{"".join(body)}</section>')

scenario = [
    ('05:49:15.941', 'chat_sessions', 'INSERT', 'Phiên mới của khách vãng lai: <code>guest_id = WTPfIQbb…</code>, <code>title = “chơi game 25 triệu”</code>.'),
    ('05:49:15.967', 'chat_messages', 'INSERT', 'Dòng <code>role = user</code> chứa câu khách gõ.'),
    ('05:49:15.985', 'builds', 'INSERT × 3', 'Engine giải bài toán, lưu ba cấu hình <code>source = CHAT</code>; bộ “Tối ưu hiệu năng” <code>535af8f8…</code> giá 24.920.000 ₫, công suất ước tính 400 W, không cảnh báo.'),
    ('05:49:15.996', 'chat_messages', 'INSERT', 'Dòng <code>role = tool</code>, <code>tool_name = recommend_builds</code>, <code>tool_args = {budget: 25000000, purpose: "gaming"}</code>, <code>build_ids</code> chứa 3 id.'),
    ('05:49:15.997', 'chat_messages', 'INSERT', 'Dòng <code>role = assistant</code>, <code>mode = FALLBACK</code>, <code>latency_ms = 38</code>.'),
    ('—', 'Redis', '<code>cart:guest:{gid}</code>', 'Khách bấm “Thêm cả bộ vào giỏ”. Khách chưa đăng nhập nên giỏ nằm trong Redis, không ghi PostgreSQL.'),
    ('05:49:34.667', 'products', 'UPDATE × 8', 'Giữ hàng: <code>reserved = reserved + 1</code> với điều kiện <code>stock − reserved ≥ 1</code>, khóa theo thứ tự id sản phẩm.'),
    ('05:49:34.667', 'orders', 'INSERT', 'Đơn <code>PCB6ROVU7IJ</code>, <code>type = BUILD</code>, <code>status = PENDING_PAYMENT</code>, <code>build_id = 535af8f8…</code>, 24.920.000 + phí lắp ráp 200.000 = <code>total</code> 25.120.000, <code>expires_at</code> = 15 phút sau.'),
    ('05:49:34.667', 'order_items', 'INSERT × 8', 'Mỗi linh kiện một dòng, chụp <code>name_snapshot</code> và <code>price_snapshot</code>, cùng <code>build_id</code>.'),
    ('05:49:39.230', 'payments', 'INSERT', 'Tiền về (giả lập): <code>provider = SIMULATOR</code>, <code>amount = 25.120.000</code>, nội dung “PCB6ROVU7IJ thanh toan don hang”, <code>status = SUCCESS</code>.'),
    ('05:49:39.230', 'orders', 'UPDATE', '<code>PENDING_PAYMENT → PAID</code>, <code>payment_status = PAID</code>, <code>paid_at</code>.'),
    ('05:49:39.230', 'products', 'UPDATE × 8', 'Trừ kho thật: <code>stock − 1</code>, <code>reserved − 1</code>.'),
    ('05:49:39.230', 'inventory_movements', 'INSERT × 8', '<code>delta = −1</code>, <code>reason = ORDER</code>, <code>ref = PCB6ROVU7IJ</code>, <code>actor_id = NULL</code> vì hệ thống tự làm.'),
]
scenario_html = ('<div class="table"><table class="scn"><thead><tr><th>Giờ (UTC)</th><th>Bảng</th><th>Thao tác</th><th>Dữ liệu ghi</th></tr></thead><tbody>'
                 + ''.join(f'<tr><td class="nw tm">{t}</td><td><code>{b}</code></td><td class="nw">{op}</td><td>{d}</td></tr>' for t, b, op, d in scenario)
                 + '</tbody></table></div>')

transitions = [
    ('PENDING_PAYMENT → PAID', 'stock − q, reserved − q', 'ORDER (−q)', 'payment_status = PAID, paid_at'),
    ('PENDING_PAYMENT → CANCELLED', 'reserved − q', 'không ghi (stock không đổi)', 'khách hủy, hoặc job hủy đơn quá hạn mỗi phút'),
    ('PAID → CANCELLED', 'stock + q', 'CANCEL (+q)', 'payment_status = REFUNDED; chỉ ADMIN'),
    ('PAID → PROCESSING → SHIPPING → COMPLETED', 'không đổi', 'không ghi', 'chỉ đổi status, updated_at'),
]
trans_html = ('<div class="table"><table><thead><tr><th>Chuyển trạng thái đơn</th><th>products</th><th>inventory_movements</th><th>orders</th></tr></thead><tbody>'
              + ''.join(f'<tr><td><code>{a}</code></td><td>{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in transitions)
              + '</tbody></table></div>')

jsonb_html = f'''
<h3>products.specs theo danh mục</h3>
<p>Mỗi danh mục có một schema Zod trong <code>packages/shared/src/specs.ts</code>; mọi khóa dưới đây đều bắt buộc (trừ <code>heightMm</code>, <code>radiatorMm</code> của tản nhiệt, tùy loại tản). <code>color</code> nhận <code>black</code>, <code>white</code> hoặc <code>other</code>.</p>
{spec_keys_table()}
<h3>categories.spec_schema: một phần tử SpecField</h3>
<pre class="code"><code>{e(json.dumps(SAMPLES['categories']['spec_schema_first'], ensure_ascii=False))}</code></pre>
<p><code>type</code> là một trong <code>number</code>, <code>string</code>, <code>boolean</code>, <code>enum</code>, <code>enum[]</code>, <code>number[]</code>; <code>filterable</code> quyết định trường có thành bộ lọc ở trang danh mục hay không; <code>unit</code> là đơn vị hiển thị (GHz, W, mm…).</p>
<h3>builds: items, warnings, score_breakdown, allocation</h3>
<pre class="code"><code>items:           [{{"category":"cpu","productId":"f6b894b3-…","name":"Intel Core i5-12400","price":3190000}}, …]
warnings:        [{{"code":"C09","severity":"warning","message":"Tản nhiệt (định mức 65W) có thể không đủ…","categories":["cooler","cpu"]}}]
score_breakdown: {{"cpu":62.4,"gpu":88.1,…}}        <span class="k">điểm 0–100 của từng danh mục</span>
allocation:      {{"cpu":0.128,"gpu":0.574,…}}      <span class="k">tỷ lệ giá từng món trên tổng giá</span></code></pre>
<h3>purpose_weights (mục đích chơi game)</h3>
<pre class="code"><code>weights:    {e(json.dumps(SAMPLES['purpose_weights']['weights'], separators=(',', ':')))}
allocation: {{"gpu":{{"min":0.34,"max":0.5}},"cpu":{{"min":0.14,"max":0.3}},"ram":{{"min":0.02,"max":0.18}}, …}}</code></pre>
<h3>chat_messages: tool_args, tool_result, build_ids, price_check</h3>
<pre class="code"><code>tool_args:   {e(json.dumps(SAMPLES['chat_tool']['tool_args'], ensure_ascii=False, separators=(',', ':')))}
tool_result: {{"budget":25000000,"builds":[{{"id":"535af8f8-…","label":"performance","parts":[…]}}, …]}}
build_ids:   ["535af8f8-…","a8bb8425-…","3071491e-…"]
price_check: {{"mentions":[24920000,…],"unmatched":[]}}   <span class="k">chỉ có ở chế độ AI; NULL ở chế độ dự phòng</span></code></pre>
<h3>payments.raw (dữ liệu webhook, ở đây là bản giả lập)</h3>
<pre class="code"><code>{e(json.dumps(SAMPLES['payments']['raw'], ensure_ascii=False, separators=(', ', ': ')))}</code></pre>
'''

redis_html = ('<div class="table"><table><thead><tr><th>Khóa Redis</th><th>Lưu gì</th></tr></thead><tbody>'
              + ''.join(f'<tr><td><code>{e(k)}</code></td><td>{e(v)}</td></tr>' for k, v in C.REDIS) + '</tbody></table></div>')
idx_all = ('<div class="table"><table><thead><tr><th>Bảng</th><th>Chỉ mục</th><th>Loại, cột</th><th>Phục vụ</th></tr></thead><tbody>'
           + ''.join(f'<tr><td><code>{t}</code></td><td><code>{e(n)}</code></td><td>{e(m)}</td><td>{e(p)}</td></tr>' for t, n, m, p in C.INDEXES)
           + '</tbody></table></div>')
mig_html = '<ol class="steps">' + ''.join(f'<li><div><b><code>{n}</code></b> {e(d)}</div></li>' for n, d in C.MIGRATIONS) + '</ol>'

erd_uri = png_uri(f'{REPO}/docs/reports/erd-co-so-du-lieu.png')
css = open(os.path.join(here, 'style.css'), encoding='utf-8').read()

page = f'''<!doctype html>
<html lang="vi" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cơ sở dữ liệu PC Builder</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&family=JetBrains+Mono:wght@400;600&display=swap">
<style>{css}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
<script>
  window.addEventListener('load', async () => {{
    try {{
      mermaid.initialize({{ startOnLoad: false, theme: 'neutral', fontFamily: 'Archivo, Arial, sans-serif', er: {{ useMaxWidth: true, layoutDirection: 'LR', entityPadding: 10, fontSize: 13 }} }});
      await document.fonts.ready;
      await mermaid.run({{ querySelector: 'pre.mermaid' }});
      window.__mermaidDone = 'ok';
    }} catch (err) {{ window.__mermaidDone = 'error: ' + err; }}
  }});
</script>
</head>
<body>
<div class="wrap">
<header class="top">
  <p class="kicker">Đồ án tốt nghiệp PC Builder · tài liệu kỹ thuật cho chương 4</p>
  <h1>Cơ sở dữ liệu PC Builder: bảng, trường và quan hệ</h1>
  <p class="lead">PostgreSQL 16, lược đồ khai báo bằng Drizzle ORM trong <code>apps/api/src/db/schema.ts</code>. Tài liệu đi từ toàn cảnh (7 nhóm bảng, sơ đồ ERD, 19 khóa ngoại) xuống từng bảng: mỗi cột lưu gì, ràng buộc ra sao, giá trị thật trong cơ sở dữ liệu, bảng đó nối với bảng nào và vì sao. Cuối tài liệu là một đơn hàng thật được truy vết qua 8 bảng, cấu trúc các cột JSONB, chỉ mục và truy vấn mẫu.</p>
  <dl class="facts">
    <div><dt>Bảng</dt><dd>15<small>7 nhóm nghiệp vụ</small></dd></div>
    <div><dt>Cột</dt><dd>128<small>14 cột JSONB</small></dd></div>
    <div><dt>Khóa ngoại</dt><dd>19<small>6 CASCADE, 13 NO ACTION</small></dd></div>
    <div><dt>Chỉ mục phụ</dt><dd>19<small>10 duy nhất, 2 GIN</small></dd></div>
    <div><dt>Kiểu enum</dt><dd>9<small>3 migration</small></dd></div>
  </dl>
</header>

<nav class="toc" aria-label="Mục lục"><p>Mục lục</p><ol>
  <li><a href="#quy-uoc">Cách đọc tài liệu</a></li>
  <li><a href="#tong-quan">Bảy nhóm bảng</a></li>
  <li><a href="#erd">Sơ đồ ERD toàn cảnh</a></li>
  <li><a href="#khoa-ngoai">Mười chín quan hệ khóa ngoại</a></li>
  <li><a href="#quan-he-mem">Quan hệ không khai báo bằng khóa ngoại</a></li>
  <li><a href="#g-tai-khoan">Nhóm Tài khoản</a></li>
  <li><a href="#g-san-pham">Nhóm Sản phẩm</a></li>
  <li><a href="#g-kho">Nhóm Kho và hiệu năng</a></li>
  <li><a href="#g-cau-hinh">Nhóm Cấu hình PC</a></li>
  <li><a href="#g-gio-hang">Nhóm Giỏ hàng</a></li>
  <li><a href="#g-don-hang">Nhóm Đơn hàng và thanh toán</a></li>
  <li><a href="#g-tro-ly">Nhóm Trợ lý AI</a></li>
  <li><a href="#vong-doi">Một đơn hàng thật đi qua các bảng</a></li>
  <li><a href="#jsonb">Cấu trúc các cột JSONB</a></li>
  <li><a href="#enum">Kiểu enum</a></li>
  <li><a href="#chi-muc">Chỉ mục</a></li>
  <li><a href="#redis">Dữ liệu nằm ngoài PostgreSQL</a></li>
  <li><a href="#migration">Migration</a></li>
  <li><a href="#truy-van">Truy vấn mẫu</a></li>
</ol></nav>

<article>
<section id="quy-uoc">
  <h2>Cách đọc tài liệu</h2>
  <ul>
    <li><strong>Tên bảng và cột</strong> viết thường, nối bằng gạch dưới (<code>order_items.price_snapshot</code>). Trong code TypeScript, Drizzle đổi sang camelCase (<code>priceSnapshot</code>).</li>
    <li><strong>Khóa:</strong> <span class="k k-pk">PK</span> khóa chính, <span class="k k-fk">FK</span> khóa ngoại, <span class="k k-uk">UK</span> giá trị duy nhất.</li>
    <li><strong>Khóa chính</strong> là <code>uuid</code> sinh bằng <code>gen_random_uuid()</code>, trừ <code>benchmarks</code> (khóa chính là <code>product_id</code>) và <code>purpose_weights</code> (khóa chính là <code>purpose</code>). Mã đơn cho người đọc là cột riêng <code>orders.code</code>.</li>
    <li><strong>Tiền</strong> là <code>bigint</code> tính bằng đồng, không dùng số thực. <strong>Thời gian</strong> là <code>timestamptz</code>, lưu theo UTC, giao diện đổi sang giờ Việt Nam.</li>
    <li><strong>Lực lượng quan hệ</strong> ghi theo chiều khóa ngoại: <code>N – 1</code> nhiều dòng con ứng với một dòng cha bắt buộc; <code>N – 0..1</code> khóa ngoại cho phép NULL; <code>0..1 – 1</code> mỗi dòng cha có tối đa một dòng con (khóa ngoại là khóa chính hoặc có ràng buộc UNIQUE).</li>
    <li><strong>Khi xóa cha:</strong> <span class="od od-ca">CASCADE</span> xóa luôn dòng con; <span class="od od-no">NO ACTION</span> chặn việc xóa nếu còn dòng con tham chiếu.</li>
    <li><strong>Cột “Ví dụ”</strong> lấy từ cơ sở dữ liệu đang chạy ngày 12/11/2026; uuid rút gọn còn 8 ký tự, chuỗi dài cắt bớt.</li>
  </ul>
</section>

<section id="tong-quan">
  <h2>Bảy nhóm bảng</h2>
  <p>Bảng được chia theo nghiệp vụ. Ba bảng có nhiều quan hệ nhất là <code>products</code>, <code>users</code> và <code>builds</code>: gần như mọi luồng chính (xem hàng, gợi ý cấu hình, mua hàng, trò chuyện) đều đi qua một trong ba bảng này.</p>
  {overview_table()}
  <h3>Bảng nào được tham chiếu nhiều nhất</h3>
  {hub_table()}
</section>

<section id="erd" class="erd-sec">
  <h2>Sơ đồ ERD toàn cảnh</h2>
  <figure><img src="{erd_uri}" alt="Sơ đồ quan hệ thực thể của 15 bảng, chia 7 nhóm theo cột."><figcaption>Toàn bộ 15 bảng và 19 khóa ngoại, mỗi cột kèm kiểu SQL. Ký hiệu chân chim ở đầu “nhiều”, vòng tròn là “có thể không có”. Bản tương tác: <code>docs/reports/erd-co-so-du-lieu.html</code>.</figcaption></figure>
</section>

<section id="khoa-ngoai">
  <h2>Mười chín quan hệ khóa ngoại</h2>
  <p>Danh sách lấy từ <code>information_schema</code> của cơ sở dữ liệu đang chạy, sắp theo nhóm bảng. Quy tắc chung: <strong>dữ liệu là “phần của” dòng cha thì xóa theo cha (CASCADE)</strong>, ví dụ dòng đơn của đơn, tin nhắn của phiên chat; <strong>dữ liệu là lịch sử thì chặn xóa (NO ACTION)</strong>, ví dụ dòng đơn trỏ tới sản phẩm. Vì sản phẩm đã bán không xóa được, hệ thống “xóa” sản phẩm bằng cách đặt <code>status = HIDDEN</code>.</p>
  {fk_catalog()}
</section>

<section id="quan-he-mem">
  <h2>Quan hệ không khai báo bằng khóa ngoại</h2>
  <p>Một số liên kết có trong dữ liệu nhưng cố ý không khai báo khóa ngoại. Cơ sở dữ liệu không tự kiểm tra các liên kết này; code ứng dụng chịu trách nhiệm.</p>
  {soft_table()}
</section>

{"".join(groups_html)}

<section id="vong-doi" class="pb">
  <h2>Một đơn hàng thật đi qua các bảng</h2>
  <p>Chuỗi dưới đây là dữ liệu thật trong cơ sở dữ liệu, ghi lại khi quay video giới thiệu ngày 10/11/2026: một khách vãng lai hỏi trợ lý “chơi game 25 triệu”, chọn cấu hình đầu tiên, đặt lắp ráp và thanh toán. Tổng cộng 8 bảng PostgreSQL và một khóa Redis được ghi trong khoảng 24 giây.</p>
  {scenario_html}
  <p class="note">Cột <code>created_at</code> mặc định là <code>now()</code>, tức thời điểm bắt đầu transaction, nên các dòng ghi trong cùng một transaction có cùng mốc giờ.</p>
  <p>Các bước giữ hàng, tạo đơn và tạo dòng đơn nằm trong <strong>một transaction</strong>; bước nhận tiền, đổi trạng thái, trừ kho và ghi nhật ký nằm trong một transaction khác. Nếu một sản phẩm hết hàng giữa chừng, câu <code>UPDATE … WHERE stock − reserved ≥ q</code> không cập nhật dòng nào, transaction rút lại toàn bộ và khách nhận lỗi “hết hàng”, nên không có đơn nửa vời.</p>
  <h3>Trạng thái đơn và ảnh hưởng tới kho</h3>
  {trans_html}
  <p class="note">Hàm <code>applyTransition</code> trong <code>orders.state.ts</code> chỉ cập nhật đơn khi trạng thái hiện tại đúng như mong đợi (<code>WHERE status = from</code>), nên webhook và job hủy đơn chạy cùng lúc trên một đơn không thể cùng thắng.</p>
</section>

<section id="jsonb">
  <h2>Cấu trúc các cột JSONB</h2>
  <p>14 cột JSONB chia hai loại: dữ liệu có cấu trúc thay đổi theo danh mục (<code>specs</code>, <code>spec_schema</code>) và ảnh chụp kết quả tại một thời điểm (cấu hình, cảnh báo, lời gọi công cụ, dữ liệu webhook).</p>
  {jsonb_html}
</section>

<section id="enum">
  <h2>Kiểu enum</h2>
  <p>Chín kiểu enum của PostgreSQL. Ghi giá trị ngoài danh sách bị cơ sở dữ liệu từ chối, kể cả khi bỏ qua tầng ứng dụng.</p>
  {enums_table()}
  <p class="note">Ba cột trạng thái dạng văn bản tự do có tập giá trị kiểm soát trong code thay vì enum: <code>payments.status</code> (SUCCESS, UNDERPAID, NO_ORDER, MANUAL_REVIEW), <code>payments.provider</code> (SEPAY, SIMULATOR, MANUAL) và <code>builds.label</code> (performance, balanced, budget).</p>
</section>

<section id="chi-muc">
  <h2>Chỉ mục</h2>
  <p>Ngoài khóa chính, có 19 chỉ mục: 10 chỉ mục duy nhất (đồng thời là ràng buộc), 7 B-tree thường và 2 GIN. Với 240 sản phẩm, PostgreSQL có thể chọn quét tuần tự vì rẻ hơn; khi buộc dùng chỉ mục, kế hoạch truy vấn <code>specs @&gt; '{{"socket": "AM5"}}'</code> là <code>Bitmap Index Scan on products_specs_gin</code>, tức chỉ mục dùng được khi bảng lớn lên.</p>
  {idx_all}
</section>

<section id="redis">
  <h2>Dữ liệu nằm ngoài PostgreSQL</h2>
  <p>Redis giữ dữ liệu ngắn hạn hoặc có thể tính lại. Mất Redis không mất đơn hàng hay sản phẩm; chỉ mất giỏ của khách vãng lai và bộ nhớ đệm.</p>
  {redis_html}
</section>

<section id="migration">
  <h2>Migration</h2>
  <p>Lược đồ đổi qua các tệp SQL do Drizzle Kit sinh trong <code>apps/api/drizzle/</code>; <code>pnpm db:migrate</code> chạy lần lượt và ghi lại tệp đã chạy.</p>
  {mig_html}
</section>

<section id="truy-van">
  <h2>Truy vấn mẫu</h2>
  <p>Bốn truy vấn chạy thật trên cơ sở dữ liệu, kèm kết quả.</p>
  {queries_html()}
</section>
</article>
</div>
</body>
</html>'''

out = os.path.join(here, 'db.html')
open(out, 'w', encoding='utf-8').write(page)
print(out, len(page) // 1024, 'KB')
