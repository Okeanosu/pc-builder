'use client';

import type { BuildDTO, ChatEvent, ChatMode, ChatSessionDTO, ProductSummaryDTO } from '@pc/shared';
import { create } from 'zustand';
import { ChatStreamError } from '@/features/advisor/sse';
import { type ChatTransport, httpChatTransport } from '@/features/advisor/transport';
import { ApiError } from '@/lib/api';
import { useAuthStore } from './auth';

export const CHAT_SESSION_KEY = 'pcb.chat.session';

export interface ToolChip {
  key: string;
  name: string;
  label: string;
  status: 'running' | 'done';
}

export interface UserMessage {
  id: string;
  role: 'user';
  text: string;
}

export interface AssistantMessage {
  id: string;
  role: 'assistant';
  text: string;
  builds: BuildDTO[];
  products: ProductSummaryDTO[];
  tools: ToolChip[];
  streaming: boolean;
  /** Mode reported by the `done` event; null for history rows and unfinished turns. */
  mode: ChatMode | null;
  error: string | null;
  stopped: boolean;
}

export type ChatItem = UserMessage | AssistantMessage;

const HISTORY_TOOL_LABEL: Record<string, string> = {
  recommend_builds: 'Đã chọn cấu hình từ hàng trong kho',
  search_products: 'Đã tìm sản phẩm trong kho',
  get_product_details: 'Đã xem thông số sản phẩm',
  check_compatibility: 'Đã kiểm tra tương thích',
  modify_build: 'Đã điều chỉnh cấu hình',
};

/** "Đang chọn linh kiện trong kho…" → "Đã chọn linh kiện trong kho" for a finished chip. */
export function doneLabel(label: string): string {
  return label
    .replace(/^Đang\s+/u, 'Đã ')
    .replace(/(…|\.\.\.)\s*$/u, '')
    .trim();
}

let seq = 0;
const localId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

export function applyChatEvent(message: AssistantMessage, event: ChatEvent): AssistantMessage {
  switch (event.type) {
    case 'token':
      return { ...message, text: message.text + event.text };
    case 'tool': {
      if (event.status === 'start') {
        const chip: ToolChip = {
          key: `${event.name}-${message.tools.length}`,
          name: event.name,
          label: event.label,
          status: 'running',
        };
        return { ...message, tools: [...message.tools, chip] };
      }
      const idx = message.tools.findLastIndex((t) => t.name === event.name && t.status === 'running');
      if (idx === -1) return message;
      const tools = message.tools.map((t, i) =>
        i === idx ? { ...t, status: 'done' as const, label: event.label || t.label } : t,
      );
      return { ...message, tools };
    }
    case 'builds':
      return { ...message, builds: event.builds };
    case 'products':
      return { ...message, products: event.products };
    case 'error':
      return { ...message, error: event.message };
    case 'done':
      return {
        ...message,
        streaming: false,
        mode: event.mode,
        tools: message.tools.map((t) => ({ ...t, status: 'done' as const })),
      };
    default:
      return message;
  }
}

export function historyToMessages(session: ChatSessionDTO): ChatItem[] {
  const items: ChatItem[] = [];
  let pendingTools: ToolChip[] = [];
  for (const m of session.messages) {
    if (m.role === 'tool') {
      const name = m.toolName ?? 'tool';
      pendingTools.push({
        key: `${m.id}`,
        name,
        label: HISTORY_TOOL_LABEL[name] ?? 'Đã tra cứu dữ liệu cửa hàng',
        status: 'done',
      });
    } else if (m.role === 'user') {
      items.push({ id: m.id, role: 'user', text: m.content });
    } else {
      items.push({
        id: m.id,
        role: 'assistant',
        text: m.content,
        builds: m.builds,
        products: [],
        tools: pendingTools,
        streaming: false,
        mode: null,
        error: null,
        stopped: false,
      });
      pendingTools = [];
    }
  }
  return items;
}

/** Builds of the most recent assistant message that has any. */
export function latestBuilds(messages: readonly ChatItem[]): BuildDTO[] {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i]!;
    if (m.role === 'assistant' && m.builds.length > 0) return m.builds;
  }
  return [];
}

const defaultSelection = (builds: readonly BuildDTO[]) =>
  (builds.find((b) => b.label === 'balanced') ?? builds[0])?.id ?? null;

const storage = {
  get(): string | null {
    try {
      return window.localStorage.getItem(CHAT_SESSION_KEY);
    } catch {
      return null;
    }
  },
  set(id: string | null) {
    try {
      if (id) window.localStorage.setItem(CHAT_SESSION_KEY, id);
      else window.localStorage.removeItem(CHAT_SESSION_KEY);
    } catch {
      // Private mode or blocked storage: the chat still works, it just will not survive a reload.
    }
  },
};

let transport: ChatTransport = httpChatTransport;
/** Swap the transport (tests, dev-only mock). */
export function setChatTransport(next: ChatTransport) {
  transport = next;
}

/** The session belongs to whoever was signed in when it was created, so wait for the auth bootstrap. */
function authSettled(timeoutMs = 4000): Promise<void> {
  if (useAuthStore.getState().status === 'ready') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(done, timeoutMs);
    const unsubscribe = useAuthStore.subscribe((s) => {
      if (s.status === 'ready') done();
    });
    function done() {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    }
  });
}

const isGone = (err: unknown) =>
  (err instanceof ApiError && (err.status === 404 || err.status === 403)) ||
  (err instanceof ChatStreamError && err.code === 'SESSION_NOT_FOUND');

const isAbort = (err: unknown) => err instanceof DOMException && err.name === 'AbortError';

interface ChatState {
  sessionId: string | null;
  /** Mode of the latest finished turn (or the stored session); drives the "Chế độ dự phòng" badge. */
  mode: ChatMode | null;
  messages: ChatItem[];
  status: 'idle' | 'streaming' | 'error';
  historyStatus: 'idle' | 'loading' | 'ready';
  selectedBuildId: string | null;
  init: () => Promise<void>;
  send: (text: string) => Promise<void>;
  retry: (assistantId: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
  selectBuild: (id: string) => void;
}

let controller: AbortController | null = null;
let inflightInit: Promise<void> | null = null;

export const useChatStore = create<ChatState>((set, get) => {
  const patchAssistant = (id: string, fn: (m: AssistantMessage) => AssistantMessage) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id && m.role === 'assistant' ? fn(m) : m)),
    }));

  const adoptSession = (id: string | null) => {
    storage.set(id);
    set({ sessionId: id });
  };

  const ensureSession = async (): Promise<string> => {
    const current = get().sessionId;
    if (current) return current;
    const created = await transport.createSession();
    adoptSession(created.id);
    set({ mode: created.mode });
    return created.id;
  };

  const runTurn = async (assistantId: string, text: string, signal: AbortSignal) => {
    const onEvent = (event: ChatEvent) => {
      if (signal.aborted) return;
      if (event.type === 'session') {
        if (event.sessionId !== get().sessionId) adoptSession(event.sessionId);
        set({ mode: event.mode });
        return;
      }
      patchAssistant(assistantId, (m) => applyChatEvent(m, event));
      if (event.type === 'builds' && event.builds.length > 0) {
        set({ selectedBuildId: defaultSelection(event.builds) });
      }
      if (event.type === 'done') set({ mode: event.mode });
    };
    const sendOnce = async () => {
      const sessionId = await ensureSession();
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      await transport.sendMessage(sessionId, text, { signal, onEvent });
    };
    try {
      await sendOnce();
    } catch (err) {
      if (!isGone(err) || signal.aborted) throw err;
      adoptSession(null);
      await sendOnce();
    }
  };

  return {
    sessionId: null,
    mode: null,
    messages: [],
    status: 'idle',
    historyStatus: 'idle',
    selectedBuildId: null,

    init() {
      if (get().historyStatus !== 'idle') return inflightInit ?? Promise.resolve();
      set({ historyStatus: 'loading' });
      inflightInit = (async () => {
        await authSettled();
        const stored = storage.get();
        if (!stored || get().sessionId) {
          set({ historyStatus: 'ready' });
          return;
        }
        set({ sessionId: stored });
        try {
          const session = await transport.getSession(stored);
          if (get().sessionId !== stored || get().messages.length > 0) return;
          const messages = historyToMessages(session);
          set({ messages, mode: session.mode, selectedBuildId: defaultSelection(latestBuilds(messages)) });
        } catch (err) {
          if (isGone(err) && get().sessionId === stored) adoptSession(null);
        } finally {
          set({ historyStatus: 'ready' });
          inflightInit = null;
        }
      })();
      return inflightInit;
    },

    async send(raw) {
      const text = raw.trim();
      if (!text || get().status === 'streaming') return;
      const assistantId = localId('a');
      const user: UserMessage = { id: localId('u'), role: 'user', text };
      const assistant: AssistantMessage = {
        id: assistantId,
        role: 'assistant',
        text: '',
        builds: [],
        products: [],
        tools: [],
        streaming: true,
        mode: null,
        error: null,
        stopped: false,
      };
      controller?.abort();
      const own = new AbortController();
      controller = own;
      set((s) => ({ messages: [...s.messages, user, assistant], status: 'streaming' }));

      try {
        await authSettled();
        await runTurn(assistantId, text, own.signal);
        patchAssistant(assistantId, (m) => ({
          ...m,
          streaming: false,
          tools: m.tools.map((t) => ({ ...t, status: 'done' as const })),
        }));
        if (controller === own) set({ status: 'idle' });
      } catch (err) {
        if (own.signal.aborted || isAbort(err)) {
          patchAssistant(assistantId, (m) => ({
            ...m,
            streaming: false,
            stopped: true,
            tools: m.tools.map((t) => ({ ...t, status: 'done' as const })),
          }));
          if (controller === own) set({ status: 'idle' });
          return;
        }
        const message =
          err instanceof ChatStreamError || err instanceof ApiError
            ? err.message
            : 'Trợ lý chưa trả lời được. Gửi lại tin nhắn để thử lần nữa.';
        patchAssistant(assistantId, (m) => ({
          ...m,
          streaming: false,
          error: message,
          tools: m.tools.map((t) => ({ ...t, status: 'done' as const })),
        }));
        if (controller === own) set({ status: 'error' });
      } finally {
        if (controller === own) controller = null;
      }
    },

    async retry(assistantId) {
      const { messages, status } = get();
      if (status === 'streaming') return;
      const idx = messages.findIndex((m) => m.id === assistantId);
      const user = messages[idx - 1];
      if (idx < 1 || user?.role !== 'user') return;
      set({ messages: messages.filter((_, i) => i !== idx && i !== idx - 1) });
      await get().send(user.text);
    },

    stop() {
      controller?.abort();
    },

    reset() {
      controller?.abort();
      controller = null;
      storage.set(null);
      set({ sessionId: null, mode: null, messages: [], status: 'idle', selectedBuildId: null });
    },

    selectBuild(id) {
      set({ selectedBuildId: id });
    },
  };
});
