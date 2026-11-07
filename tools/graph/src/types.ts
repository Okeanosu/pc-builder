export const NODE_TYPES = [
  'requirement',
  'usecase',
  'feature',
  'module',
  'api',
  'entity',
  'algorithm',
  'rule',
  'screen',
  'test',
  'decision',
  'chapter',
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const NODE_STATUSES = ['planned', 'in-progress', 'done'] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export const LINK_KEYS = ['realizes', 'refines', 'dependsOn', 'decidedBy', 'verifies', 'shownIn'] as const;
export type LinkKey = (typeof LINK_KEYS)[number];

export type EdgeType = LinkKey | 'documentedIn';

export const TYPE_LABELS: Record<NodeType, string> = {
  requirement: 'Yêu cầu',
  usecase: 'Use case',
  feature: 'Tính năng',
  module: 'Module',
  api: 'API',
  entity: 'Thực thể dữ liệu',
  algorithm: 'Thuật toán',
  rule: 'Luật ràng buộc',
  screen: 'Màn hình',
  test: 'Kiểm thử',
  decision: 'Quyết định thiết kế',
  chapter: 'Chương báo cáo',
};

export const TYPE_ID_PATTERNS: Record<NodeType, RegExp> = {
  requirement: /^(FR|NFR)-[A-Z0-9-]+$/,
  usecase: /^UC-[A-Z0-9-]+$/,
  feature: /^F-[A-Z0-9-]+$/,
  module: /^M-[A-Z0-9-]+$/,
  api: /^API-[A-Z0-9-]+$/,
  entity: /^E-[A-Z0-9-]+$/,
  algorithm: /^ALG-[A-Z0-9-]+$/,
  rule: /^R-[A-Z0-9-]+$/,
  screen: /^SCR-[A-Z0-9-]+$/,
  test: /^T-[A-Z0-9-]+$/,
  decision: /^ADR-[A-Z0-9-]+$/,
  chapter: /^CH[1-9]$/,
};

export interface GraphNode {
  id: string;
  type: NodeType;
  title: string;
  status: NodeStatus;
  chapters: string[];
  links: Record<LinkKey, string[]>;
  code: string[];
  tests: string[];
  diagrams: string[];
  body: string;
  /** Path of the node file relative to the repo root. */
  file: string;
}

export type IssueCode =
  | 'DUPLICATE_ID'
  | 'BROKEN_LINK'
  | 'MISSING_CODE'
  | 'MISSING_TEST'
  | 'MISSING_DIAGRAM'
  | 'INVALID_FRONTMATTER'
  | 'UNREALIZED_REQUIREMENT'
  | 'UNVERIFIED_REQUIREMENT'
  | 'PLANNED_PATH_MISSING';

export interface Issue {
  severity: 'error' | 'warning';
  code: IssueCode;
  message: string;
  nodeId?: string;
  file?: string;
}

export interface Graph {
  nodes: GraphNode[];
  /** Problems found while reading node files (bad YAML, schema violations). */
  loadIssues: Issue[];
}

export interface Edge {
  source: string;
  target: string;
  type: EdgeType;
}
