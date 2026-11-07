import { describe, expect, it } from 'vitest';
import { makeGraph, makeNode, makeRepo } from './fixtures';
import { loadGraph } from './load';
import { validate } from './validate';

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe('validate', () => {
  it('reports DUPLICATE_ID as an error', () => {
    const graph = makeGraph([
      makeNode({ id: 'FR-01', type: 'requirement' }),
      makeNode({ id: 'FR-01', type: 'requirement', file: 'docs/graph/nodes/other/FR-01.md' }),
    ]);
    const issues = validate(graph, makeRepo());
    expect(issues.find((i) => i.code === 'DUPLICATE_ID')?.severity).toBe('error');
  });

  it('reports BROKEN_LINK when a link target does not exist', () => {
    const graph = makeGraph([makeNode({ id: 'F-A', type: 'feature', links: { realizes: ['FR-99'] } as never })]);
    const issues = validate(graph, makeRepo());
    const broken = issues.find((i) => i.code === 'BROKEN_LINK');
    expect(broken?.severity).toBe('error');
    expect(broken?.message).toContain('FR-99');
  });

  it('reports BROKEN_LINK for an unknown chapter reference', () => {
    const graph = makeGraph([makeNode({ id: 'F-A', type: 'feature', chapters: ['CH9'] })]);
    expect(codes(validate(graph, makeRepo()))).toContain('BROKEN_LINK');
  });

  it('reports MISSING_CODE as an error for a done node whose code glob matches nothing', () => {
    const graph = makeGraph([makeNode({ id: 'M-A', type: 'module', status: 'done', code: ['src/nope/**'] })]);
    const issue = validate(graph, makeRepo({ 'src/other.ts': '' })).find((i) => i.code === 'MISSING_CODE');
    expect(issue?.severity).toBe('error');
  });

  it('reports MISSING_TEST as an error for a done node whose tests glob matches nothing', () => {
    const graph = makeGraph([
      makeNode({ id: 'M-A', type: 'module', status: 'done', code: ['src/a.ts'], tests: ['src/**/*.test.ts'] }),
    ]);
    const issue = validate(graph, makeRepo({ 'src/a.ts': '' })).find((i) => i.code === 'MISSING_TEST');
    expect(issue?.severity).toBe('error');
  });

  it('accepts a done node whose globs match files', () => {
    const graph = makeGraph([
      makeNode({ id: 'M-A', type: 'module', status: 'done', code: ['src/**'], tests: ['src/**/*.test.ts'] }),
    ]);
    const repo = makeRepo({ 'src/a.ts': '', 'src/a.test.ts': '' });
    expect(validate(graph, repo)).toEqual([]);
  });

  it('only warns when a planned node points at paths that do not exist yet', () => {
    const graph = makeGraph([makeNode({ id: 'M-A', type: 'module', code: ['src/nope/**'] })]);
    const issues = validate(graph, makeRepo());
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: 'warning', code: 'PLANNED_PATH_MISSING' });
  });

  it('warns UNREALIZED_REQUIREMENT when nothing realizes the requirement', () => {
    const graph = makeGraph([makeNode({ id: 'FR-01', type: 'requirement' })]);
    const issue = validate(graph, makeRepo()).find((i) => i.code === 'UNREALIZED_REQUIREMENT');
    expect(issue?.severity).toBe('warning');
  });

  it('warns UNVERIFIED_REQUIREMENT when no test verifies a realized requirement', () => {
    const graph = makeGraph([
      makeNode({ id: 'FR-01', type: 'requirement' }),
      makeNode({ id: 'F-A', type: 'feature', links: { realizes: ['FR-01'] } as never }),
    ]);
    const issues = validate(graph, makeRepo());
    expect(codes(issues)).toContain('UNVERIFIED_REQUIREMENT');
    expect(codes(issues)).not.toContain('UNREALIZED_REQUIREMENT');
  });

  it('treats a requirement as verified through a test node or a feature test glob', () => {
    const graph = makeGraph([
      makeNode({ id: 'FR-01', type: 'requirement' }),
      makeNode({ id: 'FR-02', type: 'requirement' }),
      makeNode({ id: 'F-A', type: 'feature', links: { realizes: ['FR-01'] } as never }),
      makeNode({ id: 'F-B', type: 'feature', links: { realizes: ['FR-02'] } as never, tests: ['x.test.ts'] }),
      makeNode({ id: 'T-A', type: 'test', links: { verifies: ['F-A'] } as never }),
    ]);
    expect(codes(validate(graph, makeRepo()))).not.toContain('UNVERIFIED_REQUIREMENT');
  });

  it('reports MISSING_DIAGRAM when a diagram file does not exist', () => {
    const graph = makeGraph([makeNode({ id: 'F-A', type: 'feature', diagrams: ['docs/diagrams/x.mmd'] })]);
    expect(codes(validate(graph, makeRepo()))).toContain('MISSING_DIAGRAM');
  });
});

describe('loadGraph', () => {
  const node = (extra: string) =>
    `---\nid: FR-01\ntype: requirement\ntitle: Test\nstatus: planned\n${extra}---\n\nNội dung.\n`;

  it('parses frontmatter, defaults missing lists and keeps the body', () => {
    const repo = makeRepo({ 'docs/graph/nodes/requirements/FR-01.md': node('') });
    const graph = loadGraph(repo);
    expect(graph.loadIssues).toEqual([]);
    expect(graph.nodes[0]).toMatchObject({ id: 'FR-01', body: 'Nội dung.', chapters: [], code: [] });
    expect(graph.nodes[0]?.links.realizes).toEqual([]);
  });

  it('reports INVALID_FRONTMATTER for a bad status or a mismatched id prefix', () => {
    const repo = makeRepo({
      'docs/graph/nodes/requirements/FR-01.md': node('').replace('planned', 'wip'),
      'docs/graph/nodes/features/FR-02.md': node('').replace('type: requirement', 'type: feature'),
    });
    const graph = loadGraph(repo);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.loadIssues).toHaveLength(2);
    expect(validate(graph, repo).every((i) => i.code === 'INVALID_FRONTMATTER')).toBe(true);
  });
});
