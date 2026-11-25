import { edgesOf } from './load';
import { type Edge, type Graph, type GraphNode, NODE_STATUSES, NODE_TYPES } from './types';
import { createFileMatcher } from './validate';

export interface PayloadNode extends GraphNode {
  codeFiles: string[];
  testFiles: string[];
}

export interface GraphPayload {
  schemaVersion: 1;
  stats: {
    nodes: number;
    edges: number;
    byType: Record<string, Record<string, number>>;
  };
  nodes: PayloadNode[];
  edges: Edge[];
}

export function sortNodes(nodes: GraphNode[]): GraphNode[] {
  return [...nodes].sort(
    (a, b) =>
      NODE_TYPES.indexOf(a.type) - NODE_TYPES.indexOf(b.type) ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
}

export function buildPayload(graph: Graph, repoRoot: string): GraphPayload {
  const match = createFileMatcher(repoRoot);
  const resolve = (patterns: string[]) => [...new Set(patterns.flatMap((p) => match(p)))].sort();
  const nodes = sortNodes(graph.nodes).map((n) => ({
    ...n,
    codeFiles: resolve(n.code),
    testFiles: resolve(n.tests),
  }));
  const edges = edgesOf(graph);
  const byType: Record<string, Record<string, number>> = {};
  for (const type of NODE_TYPES) {
    byType[type] = Object.fromEntries(NODE_STATUSES.map((s) => [s, 0]));
  }
  for (const n of graph.nodes) {
    const bucket = byType[n.type];
    if (bucket) bucket[n.status] = (bucket[n.status] ?? 0) + 1;
  }
  return { schemaVersion: 1, stats: { nodes: nodes.length, edges: edges.length, byType }, nodes, edges };
}

export function emitJson(payload: GraphPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

const MERMAID_STYLES: Record<string, string> = {
  requirement: 'fill:#fde8e8,stroke:#e5484d',
  usecase: 'fill:#fff0dc,stroke:#f08a24',
  feature: 'fill:#fff7cc,stroke:#c99a00',
  module: 'fill:#e1f4e4,stroke:#3e9b4f',
  api: 'fill:#d9f5f1,stroke:#12a594',
  entity: 'fill:#dcecff,stroke:#0090ff',
  algorithm: 'fill:#ece8fb,stroke:#6e56cf',
  rule: 'fill:#fbe3f1,stroke:#d6409f',
  screen: 'fill:#eef2d2,stroke:#7c8b2a',
  test: 'fill:#e6eaee,stroke:#5b6b7a',
  decision: 'fill:#f1e4d6,stroke:#8b5a2b',
  chapter: 'fill:#d8f3fa,stroke:#00a2c7',
};

const mermaidId = (id: string) => id.replace(/[^A-Za-z0-9]/g, '_');

/** Whole-graph overview without chapter edges (those would connect every node to a chapter hub). */
export function emitMermaid(graph: Graph): string {
  const lines = ['flowchart LR'];
  for (const type of Object.keys(MERMAID_STYLES)) lines.push(`  classDef ${type} ${MERMAID_STYLES[type]}`);
  for (const n of sortNodes(graph.nodes)) {
    lines.push(`  ${mermaidId(n.id)}["${n.id}"]:::${n.type}`);
  }
  for (const e of edgesOf(graph)) {
    if (e.type === 'documentedIn') continue;
    lines.push(`  ${mermaidId(e.source)} -->|${e.type}| ${mermaidId(e.target)}`);
  }
  return `${lines.join('\n')}\n`;
}
