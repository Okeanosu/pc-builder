import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { Graph, GraphNode } from './types';

export function makeNode(partial: Partial<GraphNode> & Pick<GraphNode, 'id' | 'type'>): GraphNode {
  return {
    title: partial.id,
    status: 'planned',
    chapters: [],
    code: [],
    tests: [],
    diagrams: [],
    body: '',
    file: `docs/graph/nodes/${partial.id}.md`,
    ...partial,
    links: {
      realizes: [],
      refines: [],
      dependsOn: [],
      decidedBy: [],
      verifies: [],
      shownIn: [],
      ...partial.links,
    },
  };
}

export function makeGraph(nodes: GraphNode[]): Graph {
  return { nodes, loadIssues: [] };
}

/** Creates a throw-away repo root populated with the given files (path -> content). */
export function makeRepo(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'graph-test-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}
