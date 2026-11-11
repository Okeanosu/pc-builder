# Builds the data dictionary page (web + print editions) from data.py.
# Usage: python3 gen.py <erd.png> <out-dir>
import base64, html, importlib.util, io, os, sys

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('d', os.path.join(here, 'data.py'))
d = importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)

erd_png, out_dir = sys.argv[1], sys.argv[2]
from PIL import Image
im = Image.open(erd_png).convert('RGB')
im.thumbnail((2600, 2600))
buf = io.BytesIO()
im.save(buf, 'JPEG', quality=90, optimize=True)
erd_uri = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

e = html.escape
REPO_SCHEMA = 'apps/api/src/db/schema.ts'

def fmt_constraint(c):
    parts = []
    for piece in [p.strip() for p in c.split(',') if p.strip()] if c else []:
        p = e(piece)
        if piece.startswith('PK'):
            p = p.replace('PK', '<b class="k pk">PK</b>', 1)
        elif piece.startswith('FK'):
            p = p.replace('FK', '<b class="k fk">FK</b>', 1)
            p = p.replace('→ ', '→&nbsp;')
        elif piece == 'UK':
            p = '<b class="k uk">UK</b>'
        parts.append(p)
    return '<br>'.join(parts) if parts else '<span class="muted">cho phép NULL</span>'

def table_html(t):
    rows = []
    for name, typ, cons, meaning in t['cols']:
        nullable = typ.endswith('?')
        rows.append(
            f'<tr><td><code>{e(name)}</code></td><td class="type">{e(typ)}</td>'
            f'<td class="cons">{fmt_constraint(cons)}</td><td>{e(meaning)}</td></tr>'
        )
    notes = ''.join(f'<li>{e(n)}</li>' for n in t['notes'])
    return f'''
    <section class="tbl" id="t-{t['id']}">
      <header>
        <h3><code>{t['id']}</code> <span>{e(t['vi'])}</span></h3>
        <p class="src">{REPO_SCHEMA}, dòng {t['lines'][0]}–{t['lines'][1]} · {len(t['cols'])} cột</p>
      </header>
      <p>{e(t['purpose'])}</p>
      <p class="used"><b>Dùng ở:</b> {e(t['used'])}</p>
      <div class="table"><table>
        <colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup>
        <thead><tr><th>Cột</th><th>Kiểu</th><th>Ràng buộc</th><th>Lưu để làm gì</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
      </table></div>
      {f'<ul class="notes">{notes}</ul>' if notes else ''}
    </section>'''

n_tables = sum(len(g['tables']) for g in d.GROUPS)
n_cols = sum(len(t['cols']) for g in d.GROUPS for t in g['tables'])
n_fk = sum(1 for g in d.GROUPS for t in g['tables'] for c in t['cols'] if 'FK' in c[2])

toc = ''.join(
    f'<li><span>{e(g["name"])}</span><ol>' + ''.join(
        f'<li><a href="#t-{t["id"]}"><code>{t["id"]}</code></a></li>' for t in g['tables']) + '</ol></li>'
    for g in d.GROUPS)

overview_rows = ''.join(
    f'<tr><td>{e(g["name"])}</td><td><a href="#t-{t["id"]}"><code>{t["id"]}</code></a></td><td>{e(t["vi"])}</td>'
    f'<td>{e(t["purpose"].split(". ")[0].rstrip("."))}.</td></tr>'
    for g in d.GROUPS for t in g['tables'])

enum_rows = ''.join(
    f'<tr><td><code>{e(n)}</code></td><td class="type vals">{e(v)}</td><td>{e(m)}</td></tr>' for n, v, m in d.ENUMS)

groups_html = ''.join(
    f'<section class="group" id="g-{i}"><h2>{e(g["name"])}</h2>' + ''.join(table_html(t) for t in g['tables']) + '</section>'
    for i, g in enumerate(d.GROUPS))

CSS = '''
  /* Layout: reference document with a contents rail; every table is a hairline grid that scrolls in its own box. */
  :root {
    --paper: #ffffff; --plate: #f1f2f3; --rule: #e3e5e8; --ink: #0d0f12; --muted: #5d636a;
    --pk: #6d4fd6; --fk: #c2560f; --uk: #3c6f8f; --code-bg: #f4f5f6;
    --font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
    --font-body: "Archivo", "Helvetica Neue", Arial, sans-serif;
    --font-code: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --paper: #0b0c0e; --plate: #17191c; --rule: #2a2d31; --ink: #f2f3f5; --muted: #a3a9b0;
    --pk: #a993ff; --fk: #f29a5b; --uk: #7fb6d6; --code-bg: #15171a; color-scheme: dark; } }
  :root[data-theme="dark"] {
    --paper: #0b0c0e; --plate: #17191c; --rule: #2a2d31; --ink: #f2f3f5; --muted: #a3a9b0;
    --pk: #a993ff; --fk: #f29a5b; --uk: #7fb6d6; --code-bg: #15171a; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { background: var(--paper); color: var(--ink); font-family: var(--font-body); font-size: 15.5px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1220px; margin: 0 auto; padding-block: 40px 96px;
    padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
    display: grid; grid-template-columns: minmax(0, 1fr); gap: 40px; }
  @media (min-width: 1040px) {
    .wrap { grid-template-columns: 210px minmax(0, 1fr); gap: 52px; }
    nav.toc { position: sticky; top: calc(24px + env(safe-area-inset-top, 0px)); align-self: start; max-height: calc(100vh - 48px); overflow: auto; }
  }
  header.top { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 16px; padding-bottom: 28px; border-bottom: 1px solid var(--rule); }
  .kicker { color: var(--muted); font-size: 14px; margin: 0; }
  h1 { font-family: var(--font-display); font-stretch: 125%; font-weight: 700; font-size: clamp(2rem, 5vw, 3.3rem); line-height: 1.08; letter-spacing: -0.035em; margin: 0; text-wrap: balance; }
  .lead { font-size: 1.1rem; max-width: 70ch; margin: 0; }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin: 6px 0 0; border-top: 1px solid var(--rule); }
  .facts div { padding: 12px 16px 6px 0; border-bottom: 1px solid var(--rule); }
  .facts dt { font-size: 13px; color: var(--muted); }
  .facts dd { margin: 2px 0 0; font-size: 1.35rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  nav.toc { font-size: 14px; }
  nav.toc > p { margin: 0 0 10px; font-weight: 600; }
  nav.toc ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  nav.toc ol ol { gap: 1px; margin-top: 3px; }
  nav.toc li > span { color: var(--muted); font-size: 13px; }
  nav.toc a { color: var(--ink); text-decoration: none; display: block; padding: 2px 0; }
  nav.toc a code { background: none; padding: 0; font-size: 13px; }
  nav.toc a:hover { text-decoration: underline; }
  a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 2px; }
  @media (max-width: 1039px) { nav.toc { border: 1px solid var(--rule); border-radius: 8px; padding: 14px 16px; }
    nav.toc > ol { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); } }
  article { min-width: 0; display: flex; flex-direction: column; gap: 56px; }
  section { min-width: 0; scroll-margin-top: 20px; }
  h2 { font-family: var(--font-display); font-stretch: 112%; font-weight: 650; font-size: 1.65rem; letter-spacing: -0.025em; line-height: 1.2; margin: 0 0 14px; }
  .intro { display: flex; flex-direction: column; gap: 14px; }
  .intro p, .intro ul { margin: 0; max-width: 72ch; }
  .intro ul { padding-left: 1.2em; display: grid; gap: 4px; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 8px; }
  figure img { width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 8px; background: #fff; }
  figcaption { font-size: 14px; color: var(--muted); max-width: 72ch; }
  .group { display: flex; flex-direction: column; gap: 40px; }
  .group > h2 { padding-bottom: 10px; border-bottom: 2px solid var(--ink); margin: 0; }
  .tbl { display: flex; flex-direction: column; gap: 10px; }
  .tbl header { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; }
  .tbl h3 { margin: 0; font-size: 1.25rem; font-weight: 650; display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
  .tbl h3 code { font-size: 0.95em; background: var(--code-bg); }
  .tbl h3 span { font-weight: 500; color: var(--muted); }
  .tbl .src { margin: 0; font-size: 12.5px; color: var(--muted); font-family: var(--font-code); }
  .tbl > p { margin: 0; max-width: 78ch; }
  .used { color: var(--muted); font-size: 14.5px; }
  .used b { color: var(--ink); font-weight: 600; }
  code { font-family: var(--font-code); font-size: 0.86em; background: var(--code-bg); padding: 0.06em 0.32em; border-radius: 3px; }
  .table { overflow-x: auto; border-top: 1px solid var(--ink); max-width: 100%; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; min-width: 640px; }
  col.c1 { width: 19%; } col.c2 { width: 13%; } col.c3 { width: 19%; } col.c4 { width: 49%; }
  th, td { text-align: left; vertical-align: top; padding: 8px 12px 8px 0; border-bottom: 1px solid var(--rule); }
  th { font-weight: 600; font-size: 12.5px; color: var(--muted); }
  td code { white-space: nowrap; background: none; padding: 0; font-weight: 600; font-size: 13px; }
  td.type { font-family: var(--font-code); font-size: 12.5px; color: var(--muted); white-space: nowrap; }
  td.type.vals { white-space: normal; word-break: break-word; }
  td.cons { font-size: 12.5px; color: var(--muted); line-height: 1.45; }
  .k { font-family: var(--font-code); font-size: 11px; font-weight: 700; padding: 0 4px; border-radius: 3px; border: 1px solid currentColor; }
  .k.pk { color: var(--pk); } .k.fk { color: var(--fk); } .k.uk { color: var(--uk); }
  .muted { color: var(--muted); }
  ul.notes { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; font-size: 14px; color: var(--muted); max-width: 78ch; }
  .overview td a { color: var(--ink); }
'''

def page(print_mode):
    extra = ''
    if print_mode:
        extra = '''
<style>
  @page { size: A4; margin: 18mm 15mm 18mm 15mm; }
  @page erd { size: A4 landscape; margin: 12mm; }
  html, body { background: #fff !important; }
  body { font-size: 10pt; line-height: 1.5; }
  .wrap { display: block; max-width: none; padding: 0 !important; }
  header.top { padding-bottom: 14px; margin-bottom: 16px; }
  h1 { font-size: 28pt; }
  nav.toc { position: static !important; max-height: none; overflow: visible; border: 1px solid var(--rule); border-radius: 6px; padding: 12px 14px; margin: 0 0 20px; break-inside: avoid; }
  nav.toc > ol { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px 16px; }
  article { gap: 26px; }
  .erd-sec { page: erd; break-before: page; }
  .erd-sec figure img { width: 268mm; max-width: none; height: auto; max-height: none; display: block; border: 0; }
  .erd-sec figcaption { max-width: 268mm; }
  .group { gap: 22px; }
  .group > h2 { break-after: avoid; }
  #g-5 { break-before: page; }
  .tbl { gap: 6px; }
  .tbl header, .tbl > p, h2, h3 { break-after: avoid; }
  .table { overflow: visible; }
  table { min-width: 0; font-size: 8.8pt; }
  th, td { padding: 4px 8px 4px 0; }
  td code { font-size: 8.3pt; } td.type, td.cons { font-size: 8pt; }
  tr { break-inside: avoid; }
  ul.notes { font-size: 9pt; }
</style>'''
    head = '<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' if print_mode else ''
    return f'''{head}<title>Từ điển dữ liệu PC Builder</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&family=JetBrains+Mono:wght@400;600;700&display=swap">
<style>{CSS}</style>{extra}
{'</head><body>' if print_mode else ''}
<div class="wrap">
  <header class="top">
    <p class="kicker">Đồ án tốt nghiệp PC Builder · tài liệu thiết kế cơ sở dữ liệu</p>
    <h1>Từ điển dữ liệu PC Builder</h1>
    <p class="lead">Giải thích từng bảng của cơ sở dữ liệu PostgreSQL: bảng dùng để làm gì, được tính năng nào sử dụng, và từng cột lưu thông tin gì. Nội dung lấy trực tiếp từ <code>{REPO_SCHEMA}</code> (Drizzle ORM) và ba migration <code>0000</code> đến <code>0002</code>.</p>
    <dl class="facts">
      <div><dt>Bảng</dt><dd>{n_tables}</dd></div>
      <div><dt>Cột</dt><dd>{n_cols}</dd></div>
      <div><dt>Khóa ngoại</dt><dd>{n_fk}</dd></div>
      <div><dt>Kiểu enum</dt><dd>{len(d.ENUMS)}</dd></div>
      <div><dt>Nhóm nghiệp vụ</dt><dd>{len(d.GROUPS)}</dd></div>
    </dl>
  </header>
  <nav class="toc" aria-label="Mục lục"><p>Mục lục</p><ol>
    <li><span>Tổng quan</span><ol><li><a href="#quy-uoc">Quy ước</a></li><li><a href="#tong-quan">Danh sách bảng</a></li><li><a href="#enum">Kiểu enum</a></li><li><a href="#erd">Sơ đồ ERD</a></li></ol></li>
    {toc}
  </ol></nav>
  <article>
    <section class="intro" id="quy-uoc">
      <h2>Quy ước</h2>
      <ul>
        <li><b class="k pk">PK</b> khóa chính, <b class="k fk">FK</b> khóa ngoại (kèm bảng được tham chiếu), <b class="k uk">UK</b> giá trị không được trùng.</li>
        <li>Dấu <code>?</code> sau kiểu dữ liệu: cột cho phép NULL. Cột không có dấu này là NOT NULL.</li>
        <li>Khóa chính là <code>uuid</code> sinh ngẫu nhiên bằng <code>gen_random_uuid()</code>, trừ <code>benchmarks</code> (dùng <code>product_id</code>) và <code>purpose_weights</code> (dùng <code>purpose</code>).</li>
        <li>Mọi số tiền lưu kiểu <code>bigint</code> theo đơn vị đồng (VND), không dùng số thực nên không có sai số làm tròn.</li>
        <li>Thời gian lưu <code>timestamptz</code> (có múi giờ). Cột <code>jsonb</code> chứa dữ liệu có cấu trúc linh hoạt như thông số kỹ thuật, danh sách linh kiện, kết quả công cụ AI.</li>
        <li>“Xóa theo …” nghĩa là khóa ngoại có <code>ON DELETE CASCADE</code>: xóa dòng cha thì các dòng con bị xóa theo.</li>
      </ul>
    </section>
    <section class="intro" id="tong-quan">
      <h2>Danh sách bảng</h2>
      <div class="table overview"><table>
        <colgroup><col style="width:17%"><col style="width:20%"><col style="width:19%"><col style="width:44%"></colgroup>
        <thead><tr><th>Nhóm</th><th>Bảng</th><th>Tên tiếng Việt</th><th>Vai trò</th></tr></thead>
        <tbody>{overview_rows}</tbody>
      </table></div>
    </section>
    <section class="intro" id="enum">
      <h2>Kiểu enum</h2>
      <p>Các cột trạng thái dùng kiểu enum của PostgreSQL, nên cơ sở dữ liệu tự từ chối giá trị lạ.</p>
      <div class="table"><table>
        <colgroup><col style="width:18%"><col style="width:34%"><col style="width:48%"></colgroup>
        <thead><tr><th>Kiểu</th><th>Giá trị</th><th>Ý nghĩa</th></tr></thead>
        <tbody>{enum_rows}</tbody>
      </table></div>
    </section>
    <section class="intro erd-sec" id="erd">
      <h2>Sơ đồ ERD</h2>
      <figure>
        <img src="{erd_uri}" alt="Sơ đồ quan hệ thực thể 15 bảng của PC Builder, chia 7 nhóm nghiệp vụ">
        <figcaption>15 bảng, 19 khóa ngoại, chia 7 nhóm nghiệp vụ. Ký hiệu chân chim: một vạch là “một”, chân chim là “nhiều”, vòng tròn là “có thể không có”.</figcaption>
      </figure>
    </section>
    {groups_html}
  </article>
</div>
{'</body></html>' if print_mode else ''}
'''

open(os.path.join(out_dir, 'tu-dien-du-lieu.html'), 'w').write(page(False))
open(os.path.join(out_dir, 'tu-dien-du-lieu.print.html'), 'w').write(page(True))
print('tables', n_tables, 'cols', n_cols, 'fk', n_fk)
