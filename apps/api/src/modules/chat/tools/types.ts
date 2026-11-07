import type { ChatEvent } from '@pc/shared';
import type { LlmToolDecl } from '../llm/types';

export interface ToolContext {
  sessionId: string;
  userId?: string;
  guestId?: string;
}

export interface ToolResult {
  forModel: Record<string, unknown>;
  events?: ChatEvent[];
  buildIds?: string[];
}

export interface ChatTool {
  decl: LlmToolDecl;
  label: string;
  run(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

export type ToolRegistry = Map<string, ChatTool>;

export interface RecommendToolOutput {
  builds: Array<{
    id: string;
    label: 'performance' | 'balanced' | 'budget';
    totalPrice: number;
    score: number;
    parts: Array<{ category: string; name: string; price: number }>;
    allocation: Record<string, number>;
    warnings: string[];
  }>;
  infeasibleReason?: string;
  minFeasibleBudget?: number;
}
