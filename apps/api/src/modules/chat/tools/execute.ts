import type { ChatEvent } from '@pc/shared';
import type { ToolContext, ToolRegistry, ToolResult } from './types';

/** One tool invocation as the caller should persist it (chat_messages role=tool). */
export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  response: Record<string, unknown>;
  ok: boolean;
  durationMs: number;
  /** Builds this call created (recommend_builds / modify_build), for the chat_messages.build_ids column. */
  buildIds?: string[];
  /** Internal failure detail for logs; never sent to the model or the user. */
  error?: string;
}

export interface ToolExecution {
  record: ToolCallRecord;
  result?: ToolResult;
}

/** Runs a registered tool with `tool start/end` events around it; failures become an error response, not a throw. */
export async function executeTool(
  tools: ToolRegistry,
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
  emit: (e: ChatEvent) => void,
): Promise<ToolExecution> {
  const started = Date.now();
  const tool = tools.get(name);
  if (!tool) {
    return {
      record: {
        name,
        args,
        response: { error: 'UNKNOWN_TOOL', message: `Không có công cụ "${name}".` },
        ok: false,
        durationMs: 0,
      },
    };
  }
  emit({ type: 'tool', name, status: 'start', label: tool.label });
  try {
    const result = await tool.run(args, ctx);
    for (const event of result.events ?? []) emit(event);
    const buildIds = result.buildIds ?? [];
    return {
      record: {
        name,
        args,
        response: result.forModel,
        ok: true,
        durationMs: Date.now() - started,
        ...(buildIds.length > 0 ? { buildIds } : {}),
      },
      result,
    };
  } catch (err) {
    return {
      record: {
        name,
        args,
        response: {
          error: 'TOOL_FAILED',
          message: 'Công cụ tạm thời gặp lỗi; hãy xin lỗi khách và đề nghị thử lại sau.',
        },
        ok: false,
        durationMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  } finally {
    emit({ type: 'tool', name, status: 'end', label: tool.label });
  }
}
