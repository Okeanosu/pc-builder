import { preferencesSchema } from '@pc/shared';
import { describe, expect, it } from 'vitest';
import { TOOL_DECLARATIONS } from './declarations';

/** The JSON Schema subset Gemini's function declarations are known to accept. */
const ALLOWED_KEYWORDS = new Set([
  'type',
  'properties',
  'required',
  'items',
  'enum',
  'description',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
  'nullable',
  'additionalProperties',
]);
const JSON_TYPES = new Set(['object', 'array', 'string', 'integer', 'number', 'boolean']);

function violations(schema: unknown, path: string): string[] {
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
    return [`${path}: schema must be an object`];
  }
  const out: string[] = [];
  const s = schema as Record<string, unknown>;
  for (const [key, value] of Object.entries(s)) {
    if (!ALLOWED_KEYWORDS.has(key)) out.push(`${path}: keyword "${key}" is not allowed`);
    if (key === 'additionalProperties' && value !== false) {
      out.push(`${path}: additionalProperties may only be false`);
    }
  }
  if (typeof s.type !== 'string' || !JSON_TYPES.has(s.type)) out.push(`${path}: missing or unknown type`);
  if (s.enum !== undefined && !(Array.isArray(s.enum) && s.enum.every((v) => typeof v === 'string'))) {
    out.push(`${path}: enum must be a list of strings`);
  }
  if (s.properties !== undefined) {
    if (s.type !== 'object') out.push(`${path}: properties on a non-object`);
    for (const [name, child] of Object.entries(s.properties as Record<string, unknown>)) {
      out.push(...violations(child, `${path}.${name}`));
    }
  }
  if (s.required !== undefined) {
    const props = (s.properties ?? {}) as Record<string, unknown>;
    for (const name of s.required as string[]) {
      if (!(name in props)) out.push(`${path}: required "${name}" is not a property`);
    }
  }
  if (s.type === 'array') {
    if (s.items === undefined) out.push(`${path}: array without items`);
    else out.push(...violations(s.items, `${path}[]`));
  }
  return out;
}

describe('TOOL_DECLARATIONS', () => {
  it('declares the five advisor tools with unique names', () => {
    expect(TOOL_DECLARATIONS.map((d) => d.name).sort()).toEqual([
      'check_compatibility',
      'get_product_details',
      'modify_build',
      'recommend_builds',
      'search_products',
    ]);
  });

  it.each(TOOL_DECLARATIONS.map((d) => [d.name, d] as const))(
    '%s uses only the Gemini-safe JSON Schema subset',
    (name, decl) => {
      expect(decl.description.length).toBeGreaterThan(0);
      expect(violations(decl.parametersJsonSchema, name)).toEqual([]);
    },
  );

  it('search_products.filters is a list of {key, value} pairs, not a free-form map', () => {
    const decl = TOOL_DECLARATIONS.find((d) => d.name === 'search_products')!;
    const filters = (decl.parametersJsonSchema as { properties: Record<string, unknown> }).properties.filters;
    expect(filters).toMatchObject({
      type: 'array',
      items: {
        type: 'object',
        properties: { key: { type: 'string' }, value: { type: 'string' } },
        required: ['key', 'value'],
      },
    });
  });

  it('advertises only preferences the engine honours', () => {
    const supported = Object.keys(preferencesSchema.shape);
    for (const decl of TOOL_DECLARATIONS) {
      const props = (decl.parametersJsonSchema as { properties: Record<string, { properties?: object }> })
        .properties;
      for (const key of ['preferences', 'preferenceChanges']) {
        const declared = Object.keys(props[key]?.properties ?? {});
        expect(
          declared.filter((k) => !supported.includes(k)),
          `${decl.name}.${key}`,
        ).toEqual([]);
      }
    }
  });

  it('the checker itself rejects schema-valued additionalProperties', () => {
    expect(
      violations({ type: 'object', additionalProperties: { type: 'string' } }, 'probe').join('\n'),
    ).toContain('additionalProperties may only be false');
  });
});
