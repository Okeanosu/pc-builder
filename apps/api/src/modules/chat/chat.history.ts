import type { LlmMessage, LlmPart } from './llm/types';

/** How many stored rows (user, assistant and tool) feed the model each turn. */
export const HISTORY_LIMIT = 20;

export interface HistoryRow {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName: string | null;
  toolArgs: unknown;
  toolResult: unknown;
}

const asRecord = (x: unknown, key: string): Record<string, unknown> => {
  if (typeof x === 'object' && x !== null && !Array.isArray(x)) return x as Record<string, unknown>;
  return x === null || x === undefined ? {} : { [key]: x };
};

/**
 * Rebuilds model history from stored rows (oldest first): user text → user part, assistant text → model text,
 * each tool row → a model functionCall followed by a user functionResponse. Starts at the first user row and
 * merges neighbours of the same role, so the conversation always opens with the user and alternates.
 */
export function toLlmHistory(rows: HistoryRow[]): LlmMessage[] {
  const start = rows.findIndex((r) => r.role === 'user');
  if (start < 0) return [];
  const messages: LlmMessage[] = [];
  const push = (role: LlmMessage['role'], part: LlmPart) => {
    const last = messages.at(-1);
    if (last?.role === role) last.parts.push(part);
    else messages.push({ role, parts: [part] });
  };
  for (const row of rows.slice(start)) {
    if (row.role === 'tool') {
      if (!row.toolName) continue;
      push('model', { functionCall: { name: row.toolName, args: asRecord(row.toolArgs, 'value') } });
      push('user', {
        functionResponse: { name: row.toolName, response: asRecord(row.toolResult, 'result') },
      });
    } else if (row.content.trim()) {
      push(row.role === 'user' ? 'user' : 'model', { text: row.content });
    }
  }
  return messages;
}
