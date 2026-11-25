import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { emitChapters } from './emit-chapters';
import { emitHtml } from './emit-html';
import { buildPayload, emitJson, emitMermaid } from './emit-json';
import { emitCoverage, emitTraceability } from './emit-traceability';
import { loadGraph } from './load';
import type { Issue } from './types';
import { validate } from './validate';

interface Args {
  command: string;
  root: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  const command = argv[0] ?? '';
  let root = process.cwd();
  let verbose = false;
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') root = resolve(argv[++i] ?? '.');
    else if (arg === '--verbose') verbose = true;
  }
  return { command, root, verbose };
}

function report(issues: Issue[], verbose: boolean): void {
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  for (const issue of errors)
    console.error(`ERROR   ${issue.code}  ${issue.message}${issue.file ? `  [${issue.file}]` : ''}`);
  const summary = new Map<string, Issue[]>();
  for (const w of warnings) summary.set(w.code, [...(summary.get(w.code) ?? []), w]);
  for (const [code, list] of summary) {
    if (code === 'PLANNED_PATH_MISSING' && !verbose) {
      console.warn(
        `WARNING ${code}  ${list.length} path(s) of non-done nodes match no file yet (use --verbose to list)`,
      );
      continue;
    }
    for (const w of list) console.warn(`WARNING ${code}  ${w.message}`);
  }
  console.log(`graph: ${errors.length} error(s), ${warnings.length} warning(s)`);
}

function build(root: string): void {
  const graph = loadGraph(root);
  const outDir = join(root, 'docs/graph/out');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'chapters'), { recursive: true });
  const payload = buildPayload(graph, root);
  writeFileSync(join(outDir, 'graph.json'), emitJson(payload));
  writeFileSync(join(outDir, 'graph.mmd'), emitMermaid(graph));
  writeFileSync(join(outDir, 'traceability.md'), emitTraceability(graph));
  writeFileSync(join(outDir, 'coverage.md'), emitCoverage(graph, root));
  for (const [name, content] of emitChapters(graph, root))
    writeFileSync(join(outDir, 'chapters', name), content);
  writeFileSync(join(outDir, 'index.html'), emitHtml(payload));
  console.log(`graph: wrote ${payload.stats.nodes} nodes, ${payload.stats.edges} edges to docs/graph/out/`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== 'build' && args.command !== 'check') {
    console.error('usage: cli.ts <build|check> [--root <repo root>] [--verbose]');
    process.exit(2);
  }
  const graph = loadGraph(args.root);
  const issues = validate(graph, args.root);
  if (args.command === 'build') build(args.root);
  report(issues, args.verbose);
  process.exit(issues.some((i) => i.severity === 'error') ? 1 : 0);
}

main();
