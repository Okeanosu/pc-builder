import { describe, expect, it } from 'vitest';
import { emitChapters } from './emit-chapters';
import { emitHtml } from './emit-html';
import { buildPayload, emitMermaid } from './emit-json';
import { emitCoverage, emitTraceability } from './emit-traceability';
import { makeGraph, makeNode, makeRepo } from './fixtures';

const repo = makeRepo({
  'src/chat/index.ts': '',
  'src/chat/chat.test.ts': '',
  'docs/diagrams/seq.mmd': 'sequenceDiagram\n  A->>B: hi\n',
});

const graph = makeGraph([
  makeNode({ id: 'FR-01', type: 'requirement', title: 'Chat tư vấn' }),
  makeNode({ id: 'FR-02', type: 'requirement', title: 'Giỏ hàng' }),
  makeNode({ id: 'NFR-01', type: 'requirement', title: 'Hiệu năng' }),
  makeNode({ id: 'UC-01', type: 'usecase', title: 'Chat', links: { realizes: ['FR-01'] } as never }),
  makeNode({
    id: 'F-CHAT',
    type: 'feature',
    title: 'Chatbot',
    status: 'done',
    chapters: ['CH4', 'CH5'],
    links: { realizes: ['UC-01'] } as never,
    code: ['src/chat/**'],
    tests: ['src/chat/*.test.ts'],
    diagrams: ['docs/diagrams/seq.mmd'],
    body: 'Mô tả chatbot.',
  }),
  makeNode({ id: 'M-CART', type: 'module', title: 'Cart', chapters: ['CH4'], body: 'Giỏ.' }),
  makeNode({ id: 'T-CHAT', type: 'test', title: 'Chat test', links: { verifies: ['FR-01'] } as never }),
  ...['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6'].map((id) => makeNode({ id, type: 'chapter', title: `Chương ${id}` })),
]);

describe('emitTraceability', () => {
  const md = emitTraceability(graph);
  const rows = md.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---'));

  it('uses the agreed column header', () => {
    expect(rows[0]).toBe('| Yêu cầu | Use case | Tính năng | Code | Test | Trạng thái |');
  });

  it('has exactly one row per requirement', () => {
    expect(rows.slice(1)).toHaveLength(3);
    expect(rows.slice(1).map((r) => r.split(' | ')[0])).toEqual(['| FR-01 — Chat tư vấn', '| FR-02 — Giỏ hàng', '| NFR-01 — Hiệu năng']);
  });

  it('follows requirement -> use case -> feature -> code/test', () => {
    const row = rows.find((r) => r.startsWith('| FR-01'));
    expect(row).toContain('UC-01');
    expect(row).toContain('F-CHAT');
    expect(row).toContain('`src/chat/**`');
    expect(row).toContain('T-CHAT');
    expect(row).toContain('done');
  });

  it('leaves unrealized requirements visibly empty', () => {
    const row = rows.find((r) => r.startsWith('| FR-02')) ?? '';
    expect(row).toContain('planned');
    expect(row).toContain('—');
  });
});

describe('emitCoverage', () => {
  it('lists requirements lacking features and tests and counts nodes by status', () => {
    const md = emitCoverage(graph, repo);
    expect(md).toContain('FR-02');
    expect(md).toContain('NFR-01');
    expect(md).toContain('| Tính năng | 0 | 0 | 1 | 1 |');
  });
});

describe('emitChapters', () => {
  const chapters = emitChapters(graph, repo);

  it('writes CH1..CH6', () => {
    expect([...chapters.keys()]).toEqual(['CH1.md', 'CH2.md', 'CH3.md', 'CH4.md', 'CH5.md', 'CH6.md']);
  });

  it('CH5 lists every node whose chapters includes CH5 and nothing else', () => {
    const ch5 = chapters.get('CH5.md') ?? '';
    expect(ch5).toContain('F-CHAT');
    expect(ch5).not.toContain('M-CART');
    expect(ch5).toContain('Mô tả chatbot.');
    expect(ch5).toContain('`src/chat/**`');
  });

  it('inlines diagram sources as mermaid blocks', () => {
    const ch4 = chapters.get('CH4.md') ?? '';
    expect(ch4).toContain('```mermaid\nsequenceDiagram\n  A->>B: hi\n```');
    expect(ch4).toContain('M-CART');
  });

  it('groups nodes by type with the chapter outline first', () => {
    const ch4 = chapters.get('CH4.md') ?? '';
    expect(ch4.startsWith('# CH4')).toBe(true);
    expect(ch4.indexOf('## Tính năng')).toBeLessThan(ch4.indexOf('## Module'));
  });
});

describe('emitJson / emitMermaid', () => {
  it('builds nodes with resolved files and edges including documentedIn', () => {
    const payload = buildPayload(graph, repo);
    const chat = payload.nodes.find((n) => n.id === 'F-CHAT');
    expect(chat?.codeFiles).toEqual(['src/chat/chat.test.ts', 'src/chat/index.ts']);
    expect(payload.edges).toContainEqual({ source: 'F-CHAT', target: 'UC-01', type: 'realizes' });
    expect(payload.edges).toContainEqual({ source: 'F-CHAT', target: 'CH5', type: 'documentedIn' });
  });

  it('emits a mermaid flowchart without chapter edges', () => {
    const mmd = emitMermaid(graph);
    expect(mmd.startsWith('flowchart LR')).toBe(true);
    expect(mmd).toContain('F_CHAT -->|realizes| UC_01');
    expect(mmd).not.toContain('documentedIn');
  });
});

describe('emitHtml', () => {
  const html = emitHtml(buildPayload(graph, repo));

  it('is a single file loading cytoscape 3.30.2 from jsdelivr', () => {
    expect(html).toContain('https://cdn.jsdelivr.net/npm/cytoscape@3.30.2/dist/cytoscape.min.js');
  });

  it('inlines the graph data as JSON that survives </script> in bodies', () => {
    const tricky = makeGraph([makeNode({ id: 'FR-01', type: 'requirement', body: 'x </script><b>' })]);
    const out = emitHtml(buildPayload(tricky, repo));
    const match = out.match(/<script id="graph-data" type="application\/json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const data = JSON.parse(match?.[1] ?? '');
    expect(data.nodes[0].body).toBe('x </script><b>');
  });

  it('offers type, chapter and status filters', () => {
    expect(html).toContain('id="filter-types"');
    expect(html).toContain('id="filter-chapter"');
    expect(html).toContain('id="filter-status"');
  });
});
