import type { ChatMode } from './constants';
import type { BuildDTO, ProductSummaryDTO } from './dto';

/** Server-Sent Event payloads of POST /api/chat/sessions/:id/messages (one JSON object per `data:` line). */
export type ChatEvent =
  | { type: 'session'; sessionId: string; mode: ChatMode }
  | { type: 'tool'; name: string; status: 'start' | 'end'; label: string }
  | { type: 'builds'; builds: BuildDTO[] }
  | { type: 'products'; products: ProductSummaryDTO[] }
  | { type: 'token'; text: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'done'; messageId: string; mode: ChatMode };

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
