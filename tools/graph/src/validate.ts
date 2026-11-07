import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';
import { indexById } from './load';
import { isRealized, isVerified, requirements, traceRequirement } from './trace';
import { type Graph, type GraphNode, type Issue, LINK_KEYS, type NodeType } from './types';

/** Node types that describe implementation and therefore must name code once `done`. */
const CODE_TYPES: NodeType[] = ['feature', 'module', 'api', 'algorithm', 'rule', 'screen', 'entity'];
/** Node types that should be covered by tests once `done` (entities are covered through their module). */
const TEST_TYPES: NodeType[] = ['feature', 'module', 'api', 'algorithm', 'rule'];

export function createFileMatcher(repoRoot: string) {
  const cache = new Map<string, string[]>();
  return (pattern: string): string[] => {
    let files = cache.get(pattern);
    if (!files) {
      files = fg.sync(pattern, { cwd: repoRoot, ignore: ['**/node_modules/**', '**/.next/**'], dot: false }).sort();
      cache.set(pattern, files);
    }
    return files;
  };
}

export function validate(graph: Graph, repoRoot: string): Issue[] {
  const issues: Issue[] = [...graph.loadIssues];
  const ids = indexById(graph);
  const match = createFileMatcher(repoRoot);

  const seen = new Set<string>();
  for (const node of graph.nodes) {
    if (seen.has(node.id)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_ID',
        message: `Duplicate id ${node.id} (${node.file})`,
        nodeId: node.id,
        file: node.file,
      });
    }
    seen.add(node.id);
  }

  for (const node of graph.nodes) {
    checkLinks(node, ids, issues);
    checkDiagrams(node, repoRoot, issues);
    checkPaths(node, match, issues);
  }

  for (const requirement of requirements(graph)) {
    const trace = traceRequirement(graph, requirement);
    if (!isRealized(trace)) {
      issues.push({
        severity: 'warning',
        code: 'UNREALIZED_REQUIREMENT',
        message: `${requirement.id} is not realized by any use case or feature`,
        nodeId: requirement.id,
        file: requirement.file,
      });
    } else if (!isVerified(trace)) {
      issues.push({
        severity: 'warning',
        code: 'UNVERIFIED_REQUIREMENT',
        message: `${requirement.id} has no test node or test glob`,
        nodeId: requirement.id,
        file: requirement.file,
      });
    }
  }
  return issues;
}

function checkLinks(node: GraphNode, ids: Map<string, GraphNode>, issues: Issue[]): void {
  for (const key of LINK_KEYS) {
    for (const target of node.links[key]) {
      if (!ids.has(target)) {
        issues.push({
          severity: 'error',
          code: 'BROKEN_LINK',
          message: `${node.id} -> ${key}: ${target} does not exist`,
          nodeId: node.id,
          file: node.file,
        });
      }
    }
  }
  for (const chapter of node.chapters) {
    if (ids.get(chapter)?.type !== 'chapter') {
      issues.push({
        severity: 'error',
        code: 'BROKEN_LINK',
        message: `${node.id} -> chapters: ${chapter} is not a chapter node`,
        nodeId: node.id,
        file: node.file,
      });
    }
  }
}

function checkDiagrams(node: GraphNode, repoRoot: string, issues: Issue[]): void {
  for (const diagram of node.diagrams) {
    if (!existsSync(join(repoRoot, diagram))) {
      issues.push({
        severity: 'error',
        code: 'MISSING_DIAGRAM',
        message: `${node.id} -> diagrams: ${diagram} does not exist`,
        nodeId: node.id,
        file: node.file,
      });
    }
  }
}

function checkPaths(node: GraphNode, match: (pattern: string) => string[], issues: Issue[]): void {
  const done = node.status === 'done';
  const base = { nodeId: node.id, file: node.file };
  const kinds = [
    { field: 'code', patterns: node.code, missing: 'MISSING_CODE', required: CODE_TYPES },
    { field: 'tests', patterns: node.tests, missing: 'MISSING_TEST', required: node.type === 'test' ? ['test' as NodeType] : TEST_TYPES },
  ] as const;

  for (const { field, patterns, missing, required } of kinds) {
    for (const pattern of patterns) {
      if (match(pattern).length > 0) continue;
      issues.push(
        done
          ? { ...base, severity: 'error', code: missing, message: `${node.id} is done but ${field} "${pattern}" matches no file` }
          : {
              ...base,
              severity: 'warning',
              code: 'PLANNED_PATH_MISSING',
              message: `${node.id} (${node.status}) ${field} "${pattern}" matches no file yet`,
            },
      );
    }
    if (done && patterns.length === 0 && required.includes(node.type)) {
      issues.push({
        ...base,
        severity: field === 'code' ? 'error' : 'warning',
        code: missing,
        message: `${node.id} is done but declares no ${field}`,
      });
    }
  }
}
