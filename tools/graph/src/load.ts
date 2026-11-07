import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { z } from 'zod';
import {
  type Edge,
  type Graph,
  type GraphNode,
  type Issue,
  LINK_KEYS,
  NODE_STATUSES,
  NODE_TYPES,
  TYPE_ID_PATTERNS,
} from './types';

const idList = z.array(z.string().min(1)).default([]);

const frontmatterSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(NODE_TYPES),
    title: z.string().min(1),
    status: z.enum(NODE_STATUSES),
    chapters: idList,
    links: z
      .object({
        realizes: idList,
        refines: idList,
        dependsOn: idList,
        decidedBy: idList,
        verifies: idList,
        shownIn: idList,
      })
      .strict()
      .default({ realizes: [], refines: [], dependsOn: [], decidedBy: [], verifies: [], shownIn: [] }),
    code: idList,
    tests: idList,
    diagrams: idList,
  })
  .strict()
  .superRefine((fm, ctx) => {
    if (!TYPE_ID_PATTERNS[fm.type].test(fm.id)) {
      ctx.addIssue({ code: 'custom', path: ['id'], message: `id "${fm.id}" does not match type ${fm.type}` });
    }
  });

export function nodeFiles(root: string): string[] {
  return fg.sync('docs/graph/nodes/**/*.md', { cwd: root }).sort();
}

export function loadGraph(root: string): Graph {
  const nodes: GraphNode[] = [];
  const loadIssues: Issue[] = [];
  for (const file of nodeFiles(root)) {
    try {
      const parsed = matter(readFileSync(join(root, file), 'utf8'));
      const result = frontmatterSchema.safeParse(parsed.data);
      if (!result.success) {
        const detail = result.error.issues
          .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
          .join('; ');
        loadIssues.push({ severity: 'error', code: 'INVALID_FRONTMATTER', message: detail, file });
        continue;
      }
      nodes.push({ ...result.data, body: parsed.content.trim(), file });
    } catch (err) {
      loadIssues.push({
        severity: 'error',
        code: 'INVALID_FRONTMATTER',
        message: err instanceof Error ? err.message : String(err),
        file,
      });
    }
  }
  return { nodes, loadIssues };
}

export function indexById(graph: Graph): Map<string, GraphNode> {
  const map = new Map<string, GraphNode>();
  for (const node of graph.nodes) if (!map.has(node.id)) map.set(node.id, node);
  return map;
}

/** Explicit link edges plus the implicit documentedIn edge from `chapters`. */
export function edgesOf(graph: Graph): Edge[] {
  const edges: Edge[] = [];
  for (const node of graph.nodes) {
    for (const key of LINK_KEYS) {
      for (const target of node.links[key]) edges.push({ source: node.id, target, type: key });
    }
    for (const chapter of node.chapters) edges.push({ source: node.id, target: chapter, type: 'documentedIn' });
  }
  return edges;
}
