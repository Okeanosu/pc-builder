import type { GraphPayload } from './emit-json';
import { NODE_STATUSES, NODE_TYPES, TYPE_LABELS } from './types';

export const CYTOSCAPE_URL = 'https://cdn.jsdelivr.net/npm/cytoscape@3.30.2/dist/cytoscape.min.js';

const TYPE_COLORS: Record<string, string> = {
  requirement: '#e5484d',
  usecase: '#f08a24',
  feature: '#c99a00',
  module: '#3e9b4f',
  api: '#12a594',
  entity: '#0090ff',
  algorithm: '#6e56cf',
  rule: '#d6409f',
  screen: '#7c8b2a',
  test: '#5b6b7a',
  decision: '#8b5a2b',
  chapter: '#00a2c7',
};

/** `<` is escaped so node bodies can never close the inline script element. */
const inlineJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export function emitHtml(payload: GraphPayload): string {
  const meta = { typeColors: TYPE_COLORS, typeLabels: TYPE_LABELS, types: NODE_TYPES, statuses: NODE_STATUSES };
  return TEMPLATE.replace('__CYTOSCAPE__', CYTOSCAPE_URL)
    .replace('__DATA__', () => inlineJson(payload))
    .replace('__META__', () => inlineJson(meta));
}

const TEMPLATE = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Spec-Code Graph — PC Builder</title>
<style>
:root {
  --bg: #f6f7f9; --panel: #ffffff; --fg: #1c2024; --muted: #5f6b76; --border: #d7dce1;
  --accent: #0a7ea4; --edge: #9aa5b1; --hover: #eef1f4; --canvas: #fbfcfd;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #14171a; --panel: #1c2024; --fg: #e8ebee; --muted: #9aa5b1; --border: #343a40;
    --accent: #4cc2e6; --edge: #5f6b76; --hover: #262b31; --canvas: #101316;
  }
}
:root[data-theme="dark"] {
  --bg: #14171a; --panel: #1c2024; --fg: #e8ebee; --muted: #9aa5b1; --border: #343a40;
  --accent: #4cc2e6; --edge: #5f6b76; --hover: #262b31; --canvas: #101316;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
header { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--panel); flex-wrap: wrap; }
header h1 { font-size: 16px; margin: 0; }
header .stats { color: var(--muted); font-size: 12px; flex: 1; }
button, select, input[type="search"] { font: inherit; color: var(--fg); background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 5px 9px; }
button { cursor: pointer; }
button:hover { background: var(--hover); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
main { display: grid; grid-template-columns: 300px minmax(0, 1fr) 360px; height: calc(100vh - 53px); }
aside { background: var(--panel); overflow: auto; padding: 12px; }
#sidebar { border-right: 1px solid var(--border); }
#details { border-left: 1px solid var(--border); }
#sidebar h2, #details h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 14px 0 6px; }
#sidebar h2:first-child { margin-top: 0; }
.row { display: flex; gap: 6px; margin-bottom: 6px; }
.row > * { flex: 1; min-width: 0; }
#filter-types label { display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; }
.dot { width: 11px; height: 11px; border-radius: 50%; display: inline-block; flex: none; }
.count { margin-left: auto; color: var(--muted); font-variant-numeric: tabular-nums; }
#list { list-style: none; margin: 0; padding: 0; }
#list li { padding: 4px 6px; border-radius: 6px; cursor: pointer; display: flex; gap: 6px; align-items: baseline; }
#list li:hover, #list li.sel { background: var(--hover); }
#list .id { font-family: ui-monospace, Menlo, monospace; font-size: 12px; white-space: nowrap; }
#list .t { color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#canvas-wrap { position: relative; background: var(--canvas); min-width: 0; }
#cy { position: absolute; inset: 0; }
#cy-error { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; padding: 24px; text-align: center; color: var(--muted); }
.legend { position: absolute; left: 10px; bottom: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 6px 9px; font-size: 12px; color: var(--muted); }
.badge { display: inline-block; padding: 0 8px; border-radius: 10px; font-size: 12px; border: 1px solid var(--border); }
.badge.done { border-color: #3e9b4f; color: #3e9b4f; }
.badge.in-progress { border-color: #c99a00; color: #c99a00; }
.badge.planned { color: var(--muted); }
#details h3 { margin: 4px 0; font-size: 16px; }
#details .id { font-family: ui-monospace, Menlo, monospace; color: var(--muted); }
#details .body { white-space: pre-wrap; margin: 8px 0; }
#details code { font-family: ui-monospace, Menlo, monospace; font-size: 12px; word-break: break-all; }
#details ul { margin: 4px 0; padding-left: 18px; }
.chip { display: inline-block; margin: 2px 4px 2px 0; padding: 1px 8px; border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-size: 12px; font-family: ui-monospace, Menlo, monospace; background: none; color: var(--fg); }
.chip:hover { background: var(--hover); }
.muted { color: var(--muted); }
@media (max-width: 1000px) {
  main { grid-template-columns: 1fr; height: auto; }
  #canvas-wrap { height: 60vh; order: -1; }
  #sidebar, #details { border: 0; border-top: 1px solid var(--border); }
}
</style>
</head>
<body>
<header>
  <h1>Spec-Code Graph — PC Builder</h1>
  <span class="stats" id="stats"></span>
  <button id="theme" type="button" aria-label="Đổi giao diện sáng/tối">Sáng / Tối</button>
</header>
<main>
  <aside id="sidebar" aria-label="Bộ lọc">
    <h2>Tìm kiếm</h2>
    <input type="search" id="search" placeholder="ID hoặc tiêu đề…" aria-label="Tìm node" style="width:100%">
    <h2>Loại node</h2>
    <div id="filter-types"></div>
    <h2>Chương &amp; trạng thái</h2>
    <div class="row">
      <select id="filter-chapter" aria-label="Lọc theo chương"></select>
      <select id="filter-status" aria-label="Lọc theo trạng thái"></select>
    </div>
    <div class="row"><button id="reset" type="button">Đặt lại bộ lọc</button><button id="fit" type="button">Căn khung</button></div>
    <h2>Danh sách (<span id="list-count">0</span>)</h2>
    <ul id="list"></ul>
  </aside>
  <div id="canvas-wrap">
    <div id="cy"></div>
    <div id="cy-error">Không tải được thư viện Cytoscape (cần mạng). Danh sách bên trái và bảng chi tiết vẫn dùng được.</div>
    <div class="legend">Viền liền = done · nét đứt = in-progress · mờ = planned</div>
  </div>
  <aside id="details" aria-live="polite"><p class="muted">Chọn một node ở sơ đồ hoặc danh sách để xem chi tiết.</p></aside>
</main>
<script id="graph-data" type="application/json">__DATA__</script>
<script id="graph-meta" type="application/json">__META__</script>
<script src="__CYTOSCAPE__"></script>
<script>
(function () {
  var data = JSON.parse(document.getElementById('graph-data').textContent);
  var meta = JSON.parse(document.getElementById('graph-meta').textContent);
  var byId = {};
  data.nodes.forEach(function (n) { byId[n.id] = n; });
  var incoming = {};
  data.edges.forEach(function (e) { (incoming[e.target] = incoming[e.target] || []).push(e); });
  var outgoing = {};
  data.edges.forEach(function (e) { (outgoing[e.source] = outgoing[e.source] || []).push(e); });

  var state = { types: {}, chapter: '', status: '', q: '', selected: null };
  meta.types.forEach(function (t) { state.types[t] = true; });
  var cy = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'text') node.textContent = props[k]; else if (k === 'class') node.className = props[k]; else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  $('stats').textContent = data.stats.nodes + ' node · ' + data.stats.edges + ' cạnh';

  var typeBox = $('filter-types');
  meta.types.forEach(function (t) {
    var total = data.nodes.filter(function (n) { return n.type === t; }).length;
    var input = el('input', { type: 'checkbox', 'data-type': t });
    input.checked = true;
    input.addEventListener('change', function () { state.types[t] = input.checked; refresh(); });
    typeBox.appendChild(el('label', {}, [input, el('span', { class: 'dot', style: 'background:' + meta.typeColors[t] }), el('span', { text: meta.typeLabels[t] }), el('span', { class: 'count', text: String(total) })]));
  });

  var chapterSel = $('filter-chapter');
  chapterSel.appendChild(el('option', { value: '', text: 'Mọi chương' }));
  data.nodes.filter(function (n) { return n.type === 'chapter'; }).forEach(function (c) {
    chapterSel.appendChild(el('option', { value: c.id, text: c.id + ' — ' + c.title }));
  });
  var statusSel = $('filter-status');
  statusSel.appendChild(el('option', { value: '', text: 'Mọi trạng thái' }));
  meta.statuses.forEach(function (s) { statusSel.appendChild(el('option', { value: s, text: s })); });
  chapterSel.addEventListener('change', function () { state.chapter = chapterSel.value; refresh(); });
  statusSel.addEventListener('change', function () { state.status = statusSel.value; refresh(); });
  $('search').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); refresh(); });
  $('reset').addEventListener('click', function () {
    meta.types.forEach(function (t) { state.types[t] = true; });
    typeBox.querySelectorAll('input').forEach(function (i) { i.checked = true; });
    state.chapter = ''; state.status = ''; state.q = '';
    chapterSel.value = ''; statusSel.value = ''; $('search').value = '';
    refresh();
  });
  $('fit').addEventListener('click', function () { if (cy) cy.fit(undefined, 30); });
  $('theme').addEventListener('click', function () {
    var root = document.documentElement;
    var dark = getComputedStyle(root).getPropertyValue('--bg').trim() === '#14171a';
    root.setAttribute('data-theme', dark ? 'light' : 'dark');
    applyStyle();
  });

  function visible(n) {
    if (!state.types[n.type]) return false;
    if (state.chapter && n.chapters.indexOf(state.chapter) < 0 && n.id !== state.chapter) return false;
    if (state.status && n.status !== state.status) return false;
    if (state.q && (n.id + ' ' + n.title).toLowerCase().indexOf(state.q) < 0) return false;
    return true;
  }

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function applyStyle() {
    if (!cy) return;
    var fg = cssVar('--fg'), edge = cssVar('--edge'), accent = cssVar('--accent'), canvas = cssVar('--canvas');
    var style = [
      { selector: 'node', style: { 'background-color': 'data(color)', label: 'data(id)', color: fg, 'font-size': 9, 'text-valign': 'bottom', 'text-margin-y': 3, width: 16, height: 16, 'border-width': 2, 'border-color': 'data(color)', 'text-outline-color': canvas, 'text-outline-width': 2 } },
      { selector: 'node[type="requirement"]', style: { shape: 'diamond', width: 20, height: 20 } },
      { selector: 'node[type="feature"]', style: { shape: 'round-rectangle', width: 20, height: 16 } },
      { selector: 'node[type="chapter"]', style: { shape: 'hexagon', width: 22, height: 22 } },
      { selector: 'node[type="decision"]', style: { shape: 'tag' } },
      { selector: 'node[status="done"]', style: { 'border-color': fg, 'border-width': 3 } },
      { selector: 'node[status="in-progress"]', style: { 'border-style': 'dashed', 'border-color': fg, 'border-width': 3 } },
      { selector: 'node[status="planned"]', style: { opacity: 0.6 } },
      { selector: 'edge', style: { width: 1, 'line-color': edge, 'target-arrow-color': edge, 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'arrow-scale': 0.7, opacity: 0.7 } },
      { selector: '.faded', style: { opacity: 0.12 } },
      { selector: 'node:selected', style: { 'border-color': accent, 'border-width': 4, opacity: 1 } },
      { selector: '.hl', style: { opacity: 1, 'line-color': accent, 'target-arrow-color': accent, width: 2 } }
    ];
    cy.style(style);
  }

  function elements() {
    var ids = {};
    var nodes = data.nodes.filter(visible).map(function (n) {
      ids[n.id] = true;
      return { data: { id: n.id, type: n.type, status: n.status, color: meta.typeColors[n.type] } };
    });
    var edges = data.edges.filter(function (e) { return e.type !== 'documentedIn' && ids[e.source] && ids[e.target]; })
      .map(function (e, i) { return { data: { id: 'e' + i, source: e.source, target: e.target, type: e.type } }; });
    return nodes.concat(edges);
  }

  function renderList() {
    var list = $('list');
    list.textContent = '';
    var shown = data.nodes.filter(visible);
    $('list-count').textContent = String(shown.length);
    shown.forEach(function (n) {
      var li = el('li', { 'data-id': n.id, tabindex: '0', role: 'button' }, [
        el('span', { class: 'dot', style: 'background:' + meta.typeColors[n.type] }),
        el('span', { class: 'id', text: n.id }),
        el('span', { class: 't', text: n.title })
      ]);
      if (n.id === state.selected) li.className = 'sel';
      li.addEventListener('click', function () { select(n.id, true); });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.id, true); } });
      list.appendChild(li);
    });
  }

  function layout() {
    if (!cy) return;
    cy.layout({ name: 'cose', animate: false, nodeRepulsion: function () { return 9000; }, idealEdgeLength: function () { return 70; }, padding: 30, randomize: true }).run();
  }

  function refresh() {
    renderList();
    if (cy) {
      cy.elements().remove();
      cy.add(elements());
      layout();
      if (state.selected && cy.getElementById(state.selected).length) select(state.selected, false);
    }
  }

  function chips(ids) {
    var wrap = el('div');
    ids.forEach(function (id) {
      var b = el('button', { class: 'chip', type: 'button', text: id, title: byId[id] ? byId[id].title : 'không tồn tại' });
      b.addEventListener('click', function () { if (byId[id]) select(id, true); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function section(title, content) {
    return [el('h2', { text: title }), content];
  }

  function pathList(paths, files) {
    var ul = el('ul');
    paths.forEach(function (p) { ul.appendChild(el('li', {}, [el('code', { text: p })])); });
    if (files && paths.length) ul.appendChild(el('li', { class: 'muted', text: 'Khớp ' + files.length + ' file' }));
    return ul;
  }

  function select(id, focus) {
    var n = byId[id];
    if (!n) return;
    state.selected = id;
    var d = $('details');
    d.textContent = '';
    var excerptLimit = 700;
    var body = el('div', { class: 'body', text: n.body.length > excerptLimit ? n.body.slice(0, excerptLimit) + '…' : n.body || '(chưa có mô tả)' });
    d.appendChild(el('div', {}, [el('span', { class: 'dot', style: 'background:' + meta.typeColors[n.type] }), document.createTextNode(' ' + meta.typeLabels[n.type] + ' '), el('span', { class: 'badge ' + n.status, text: n.status })]));
    d.appendChild(el('h3', { text: n.title }));
    d.appendChild(el('div', { class: 'id', text: n.id + ' · ' + n.file }));
    d.appendChild(body);
    if (n.body.length > excerptLimit) {
      var more = el('button', { type: 'button', text: 'Xem đầy đủ' });
      more.addEventListener('click', function () { body.textContent = n.body; more.remove(); });
      d.appendChild(more);
    }
    if (n.chapters.length) section('Chương báo cáo', chips(n.chapters)).forEach(function (x) { d.appendChild(x); });
    var out = (outgoing[id] || []).filter(function (e) { return e.type !== 'documentedIn'; });
    var inc = (incoming[id] || []).filter(function (e) { return e.type !== 'documentedIn'; });
    var groups = {};
    out.forEach(function (e) { (groups['→ ' + e.type] = groups['→ ' + e.type] || []).push(e.target); });
    inc.forEach(function (e) { (groups['← ' + e.type] = groups['← ' + e.type] || []).push(e.source); });
    Object.keys(groups).sort().forEach(function (k) { section(k, chips(groups[k])).forEach(function (x) { d.appendChild(x); }); });
    if (n.code.length) section('Code', pathList(n.code, n.codeFiles)).forEach(function (x) { d.appendChild(x); });
    if (n.tests.length) section('Test', pathList(n.tests, n.testFiles)).forEach(function (x) { d.appendChild(x); });
    if (n.diagrams.length) section('Sơ đồ', pathList(n.diagrams)).forEach(function (x) { d.appendChild(x); });
    d.scrollTop = 0;

    renderList();
    if (cy) {
      var node = cy.getElementById(id);
      cy.elements().removeClass('faded hl').unselect();
      if (node.length) {
        node.select();
        var hood = node.closedNeighborhood();
        cy.elements().not(hood).addClass('faded');
        hood.edges().addClass('hl');
        if (focus) cy.animate({ center: { eles: node }, duration: 200 });
      }
    }
  }

  if (typeof cytoscape === 'function') {
    cy = cytoscape({ container: $('cy'), elements: [], wheelSensitivity: 0.25, minZoom: 0.1, maxZoom: 3 });
    cy.on('tap', 'node', function (evt) { select(evt.target.id(), false); });
    cy.on('tap', function (evt) { if (evt.target === cy) { state.selected = null; cy.elements().removeClass('faded hl').unselect(); renderList(); } });
    applyStyle();
    if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyStyle);
  } else {
    $('cy-error').style.display = 'flex';
  }
  refresh();
})();
</script>
</body>
</html>
`;
