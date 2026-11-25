import { pathToFileURL } from 'node:url';

/**
 * True when `moduleUrl` (import.meta.url) is the script node was started with. Comparing against
 * `file://${argv[1]}` breaks on paths with spaces or non-ASCII characters and on Windows drive letters.
 */
export function isEntrypoint(moduleUrl: string, argv1: string | undefined = process.argv[1]): boolean {
  return argv1 !== undefined && moduleUrl === pathToFileURL(argv1).href;
}
