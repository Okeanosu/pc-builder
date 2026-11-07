import { describe, expect, it } from 'vitest';
import { compactJson, summarizeToolResult } from './chat-log';

describe('compactJson', () => {
  it('prints one line and truncates long values', () => {
    expect(compactJson({ budget: 25_000_000, purpose: 'gaming' })).toBe(
      '{"budget":25000000,"purpose":"gaming"}',
    );
    expect(compactJson('x'.repeat(200), 10)).toBe('"xxxxxxxx…');
    expect(compactJson(null)).toBe('—');
  });
});

describe('summarizeToolResult', () => {
  it('counts builds, products and compatibility issues', () => {
    expect(summarizeToolResult({ builds: [{}, {}, {}] })).toEqual({ text: '3 cấu hình', failed: false });
    expect(summarizeToolResult({ products: [{}, {}] }).text).toBe('2 sản phẩm');
    expect(summarizeToolResult({ issues: [] }).text).toBe('Tương thích, không có vấn đề');
    expect(summarizeToolResult({ issues: [{}] }).text).toBe('1 vấn đề tương thích');
  });

  it('surfaces tool errors and infeasible budgets', () => {
    expect(summarizeToolResult({ error: 'TOOL_FAILED', message: 'Công cụ tạm thời gặp lỗi' })).toEqual({
      text: 'Công cụ tạm thời gặp lỗi',
      failed: true,
    });
    expect(summarizeToolResult({ builds: [], infeasibleReason: 'Ngân sách quá thấp' }).text).toBe(
      'Ngân sách quá thấp',
    );
  });

  it('falls back to the field names', () => {
    expect(summarizeToolResult({ a: 1, b: 2 }).text).toBe('Trường: a, b');
    expect(summarizeToolResult(42).text).toBe('42');
  });
});
