import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sortNodes } from './emit-json';
import { type Graph, type GraphNode, LINK_KEYS, NODE_TYPES, TYPE_LABELS } from './types';

const codeList = (paths: string[]) => paths.map((p) => `\`${p}\``).join(', ');

function renderDiagrams(diagrams: string[], repoRoot: string, shownDiagrams: Set<string>): string[] {
  const out: string[] = [];
  for (const diagram of diagrams) {
    if (shownDiagrams.has(diagram)) {
      out.push(`**Sơ đồ:** \`${diagram}\` (đã nêu ở trên trong chương này)`, '');
      continue;
    }
    shownDiagrams.add(diagram);
    let source: string;
    try {
      source = readFileSync(join(repoRoot, diagram), 'utf8').trimEnd();
    } catch {
      out.push(`**Sơ đồ:** \`${diagram}\` (không đọc được file)`, '');
      continue;
    }
    out.push(`**Sơ đồ:** \`${diagram}\``, '', '```mermaid', source, '```', '');
  }
  return out;
}

function renderNode(node: GraphNode, repoRoot: string, shownDiagrams: Set<string>): string[] {
  const out = [`### ${node.id} — ${node.title}`, '', `Trạng thái: **${node.status}**`];
  const links = LINK_KEYS.filter((k) => node.links[k].length > 0).map(
    (k) => `${k}: ${node.links[k].join(', ')}`,
  );
  if (links.length > 0) out.push(`Liên kết — ${links.join(' · ')}`);
  out.push('');
  if (node.body) out.push(node.body, '');
  if (node.code.length > 0) out.push(`**Code:** ${codeList(node.code)}`, '');
  if (node.tests.length > 0) out.push(`**Test:** ${codeList(node.tests)}`, '');
  out.push(...renderDiagrams(node.diagrams, repoRoot, shownDiagrams));
  return out;
}

/** Returns file name (CHn.md) -> markdown. */
export function emitChapters(graph: Graph, repoRoot: string): Map<string, string> {
  const result = new Map<string, string>();
  const chapterNodes = graph.nodes
    .filter((n) => n.type === 'chapter')
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const chapter of chapterNodes) {
    const members = sortNodes(
      graph.nodes.filter((n) => n.type !== 'chapter' && n.chapters.includes(chapter.id)),
    );
    const shownDiagrams = new Set<string>();
    const out = [
      `# ${chapter.id} — ${chapter.title}`,
      '',
      'Sinh tự động bởi `pnpm graph` — tư liệu thô để viết báo cáo, không sửa tay (sửa ở node tương ứng).',
      '',
    ];
    if (chapter.body) out.push('## Dàn ý chương', '', chapter.body, '');
    out.push(...renderDiagrams(chapter.diagrams, repoRoot, shownDiagrams));
    out.push(`Tổng cộng **${members.length}** node thuộc chương này.`, '');
    for (const type of NODE_TYPES) {
      const ofType = members.filter((n) => n.type === type);
      if (ofType.length === 0) continue;
      out.push(`## ${TYPE_LABELS[type]}`, '');
      for (const node of ofType) out.push(...renderNode(node, repoRoot, shownDiagrams));
    }
    result.set(`${chapter.id}.md`, `${out.join('\n').trimEnd()}\n`);
  }
  return result;
}
