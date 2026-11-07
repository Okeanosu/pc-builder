import type { Graph, GraphNode, NodeStatus } from './types';

export interface RequirementTrace {
  requirement: GraphNode;
  usecases: GraphNode[];
  /** Features realizing the requirement directly or through one of its use cases. */
  features: GraphNode[];
  /** Other implementing nodes (module/api/algorithm/rule/screen) that realize the requirement directly. */
  others: GraphNode[];
  testNodes: GraphNode[];
  code: string[];
  tests: string[];
  status: NodeStatus;
}

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];
const byId = (a: GraphNode, b: GraphNode) => a.id.localeCompare(b.id);

export function traceRequirement(graph: Graph, requirement: GraphNode): RequirementTrace {
  const realizers = (id: string) => graph.nodes.filter((n) => n.links.realizes.includes(id));
  const direct = realizers(requirement.id);
  const usecases = direct.filter((n) => n.type === 'usecase');
  const viaUsecase = usecases.flatMap((uc) => realizers(uc.id));
  const features = uniq([...direct.filter((n) => n.type === 'feature'), ...viaUsecase.filter((n) => n.type === 'feature')]);
  const others = direct.filter((n) => ['module', 'api', 'algorithm', 'rule', 'screen'].includes(n.type));
  const impl = uniq([...features, ...others]);
  const verifiable = new Set([requirement.id, ...usecases.map((n) => n.id), ...impl.map((n) => n.id)]);
  const testNodes = graph.nodes.filter(
    (n) => n.type === 'test' && n.links.verifies.some((target) => verifiable.has(target)),
  );
  const statuses = impl.map((n) => n.status);
  let status: NodeStatus = 'planned';
  if (statuses.length > 0 && statuses.every((s) => s === 'done')) status = 'done';
  else if (statuses.some((s) => s !== 'planned')) status = 'in-progress';
  return {
    requirement,
    usecases: usecases.sort(byId),
    features: features.sort(byId),
    others: others.sort(byId),
    testNodes: testNodes.sort(byId),
    code: uniq(impl.flatMap((n) => n.code)),
    tests: uniq([...impl.flatMap((n) => n.tests), ...testNodes.flatMap((n) => n.tests)]),
    status,
  };
}

export function requirements(graph: Graph): GraphNode[] {
  return graph.nodes.filter((n) => n.type === 'requirement').sort(compareRequirementIds);
}

function compareRequirementIds(a: GraphNode, b: GraphNode): number {
  const kind = (n: GraphNode) => (n.id.startsWith('FR-') ? 0 : 1);
  return kind(a) - kind(b) || a.id.localeCompare(b.id, undefined, { numeric: true });
}

export function isRealized(trace: RequirementTrace): boolean {
  return trace.usecases.length + trace.features.length + trace.others.length > 0;
}

export function isVerified(trace: RequirementTrace): boolean {
  return trace.testNodes.length > 0 || trace.tests.length > 0;
}
