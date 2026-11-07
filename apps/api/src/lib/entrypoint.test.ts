import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migrationsFolder } from '../db/migrate';
import { isEntrypoint } from './entrypoint';

// A repository checked out under a folder with spaces and Vietnamese characters, as on many student laptops.
const script = '/Users/sv/Đồ án tốt nghiệp/pc builder/apps/api/src/db/migrate.ts';
const moduleUrl = pathToFileURL(script).href;

describe('isEntrypoint', () => {
  it('matches the started script even when its path needs percent-encoding', () => {
    expect(moduleUrl).toContain('%20');
    expect(isEntrypoint(moduleUrl, script)).toBe(true);
  });

  it('is false for another script or when there is no script argument', () => {
    expect(isEntrypoint(moduleUrl, '/Users/sv/other.ts')).toBe(false);
    expect(isEntrypoint(moduleUrl, undefined)).toBe(false);
  });
});

describe('migrationsFolder', () => {
  it('decodes the module URL into a real filesystem path', () => {
    expect(migrationsFolder(moduleUrl)).toBe('/Users/sv/Đồ án tốt nghiệp/pc builder/apps/api/drizzle');
  });

  it('points at the drizzle folder of this package by default', () => {
    expect(existsSync(`${migrationsFolder()}/meta/_journal.json`)).toBe(true);
  });
});
