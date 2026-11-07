import { requirements, traceRequirement } from './trace';
import { type Graph, NODE_STATUSES, NODE_TYPES, TYPE_LABELS } from './types';
import { createFileMatcher } from './validate';

const cell = (items: string[]) => (items.length > 0 ? items.join('<br>') : '—');
const esc = (text: string) => text.replace(/\|/g, '\\|');

export function emitTraceability(graph: Graph): string {
  const lines = [
    '# Ma trận truy vết yêu cầu',
    '',
    'Sinh tự động bởi `pnpm graph` — không sửa tay. Mỗi dòng: Yêu cầu → Use case → Tính năng → Code → Test.',
    '',
    '| Yêu cầu | Use case | Tính năng | Code | Test | Trạng thái |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const req of requirements(graph)) {
    const t = traceRequirement(graph, req);
    const implementers = [...t.features, ...t.others].map((n) => n.id);
    const tests = [...t.testNodes.map((n) => n.id), ...t.tests.map((p) => `\`${p}\``)];
    lines.push(
      `| ${esc(`${req.id} — ${req.title}`)} | ${cell(t.usecases.map((n) => n.id))} | ${cell(implementers)} | ${cell(t.code.map((p) => `\`${p}\``))} | ${cell(tests)} | ${t.status} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

export function emitCoverage(graph: Graph, repoRoot: string): string {
  const match = createFileMatcher(repoRoot);
  const exists = (patterns: string[]) => patterns.some((p) => match(p).length > 0);
  const lines = ['# Độ phủ & tiến độ', '', 'Sinh tự động bởi `pnpm graph` — không sửa tay.', ''];

  lines.push('## Số node theo loại và trạng thái', '');
  lines.push(`| Loại | ${NODE_STATUSES.join(' | ')} | Tổng |`, `| --- | ${NODE_STATUSES.map(() => '---:').join(' | ')} | ---: |`);
  for (const type of NODE_TYPES) {
    const nodes = graph.nodes.filter((n) => n.type === type);
    const counts = NODE_STATUSES.map((s) => nodes.filter((n) => n.status === s).length);
    lines.push(`| ${TYPE_LABELS[type]} | ${counts.join(' | ')} | ${nodes.length} |`);
  }

  const reqs = requirements(graph).map((r) => ({ req: r, trace: traceRequirement(graph, r) }));
  const section = (title: string, hint: string, items: string[]) => {
    lines.push('', `## ${title} (${items.length})`, '', hint, '');
    if (items.length === 0) lines.push('_Không có._');
    for (const item of items) lines.push(`- ${item}`);
  };
  const label = (r: { id: string; title: string }) => `**${r.id}** — ${r.title}`;

  section(
    'Yêu cầu chưa có use case / tính năng',
    'Cần thêm node `realizes` trỏ tới yêu cầu.',
    reqs.filter(({ trace }) => trace.usecases.length + trace.features.length + trace.others.length === 0).map(({ req }) => label(req)),
  );
  section(
    'Yêu cầu chưa có test',
    'Cần thêm node `test` (`verifies`) hoặc khai báo `tests:` cho tính năng.',
    reqs.filter(({ trace }) => trace.testNodes.length + trace.tests.length === 0).map(({ req }) => label(req)),
  );
  section(
    'Yêu cầu chưa có code thực tế',
    'Tính năng đã khai báo `code:` nhưng chưa có file nào khớp (hoặc chưa khai báo).',
    reqs.filter(({ trace }) => !exists(trace.code)).map(({ req }) => label(req)),
  );
  section(
    'Yêu cầu chưa có test thực tế',
    'Chưa có file test nào khớp các glob `tests:` của tính năng / node test liên quan.',
    reqs.filter(({ trace }) => !exists(trace.tests)).map(({ req }) => label(req)),
  );
  section(
    'Node chưa `done` nhưng code đã tồn tại',
    'Rà soát: có thể đã hoàn thành — cập nhật `status`.',
    graph.nodes
      .filter((n) => n.status !== 'done' && n.type !== 'chapter' && exists(n.code))
      .map((n) => `**${n.id}** (${n.status}) — ${n.title}`),
  );

  lines.push('', '## Số node theo chương', '', `| Chương | ${NODE_TYPES.filter((t) => t !== 'chapter').map((t) => TYPE_LABELS[t]).join(' | ')} | Tổng |`);
  lines.push(`| --- | ${NODE_TYPES.filter((t) => t !== 'chapter').map(() => '---:').join(' | ')} | ---: |`);
  for (const chapter of graph.nodes.filter((n) => n.type === 'chapter')) {
    const inChapter = graph.nodes.filter((n) => n.chapters.includes(chapter.id));
    const counts = NODE_TYPES.filter((t) => t !== 'chapter').map((t) => inChapter.filter((n) => n.type === t).length);
    lines.push(`| ${chapter.id} — ${chapter.title} | ${counts.join(' | ')} | ${inChapter.length} |`);
  }
  return `${lines.join('\n')}\n`;
}
