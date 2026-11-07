/** One-line JSON for previews; long values are cut with an ellipsis. */
export function compactJson(value: unknown, max = 140): string {
  if (value === null || value === undefined) return '—';
  let text: string;
  try {
    text = JSON.stringify(value) ?? String(value);
  } catch {
    text = String(value);
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Human summary of a tool result as stored in the chat log (the object the model received). */
export function summarizeToolResult(result: unknown): { text: string; failed: boolean } {
  if (!isRecord(result)) return { text: compactJson(result, 60), failed: false };
  if (typeof result.error === 'string') {
    return { text: typeof result.message === 'string' ? result.message : result.error, failed: true };
  }
  if (Array.isArray(result.builds)) {
    const n = result.builds.length;
    if (n === 0 && typeof result.infeasibleReason === 'string')
      return { text: result.infeasibleReason, failed: false };
    return { text: `${n} cấu hình`, failed: false };
  }
  for (const key of ['products', 'items', 'results']) {
    const list = result[key];
    if (Array.isArray(list)) return { text: `${list.length} sản phẩm`, failed: false };
  }
  if (Array.isArray(result.issues)) {
    const n = result.issues.length;
    return { text: n === 0 ? 'Tương thích, không có vấn đề' : `${n} vấn đề tương thích`, failed: false };
  }
  const keys = Object.keys(result);
  return {
    text: keys.length ? `Trường: ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}` : 'Rỗng',
    failed: false,
  };
}
