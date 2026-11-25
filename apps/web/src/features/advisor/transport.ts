import type { ChatEvent, ChatSessionDTO } from '@pc/shared';
import { api } from '@/lib/api';
import { streamChat } from './sse';

export interface ChatTransport {
  createSession(): Promise<ChatSessionDTO>;
  getSession(id: string): Promise<ChatSessionDTO>;
  sendMessage(
    sessionId: string,
    text: string,
    options: { signal?: AbortSignal; onEvent: (event: ChatEvent) => void },
  ): Promise<void>;
}

export const httpChatTransport: ChatTransport = {
  createSession: () => api<ChatSessionDTO>('/chat/sessions', { method: 'POST', json: {} }),
  getSession: (id) => api<ChatSessionDTO>(`/chat/sessions/${encodeURIComponent(id)}`),
  sendMessage: streamChat,
};
