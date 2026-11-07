'use client';

import { MessageSquarePlus } from 'lucide-react';
import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { useChatStore } from '@/stores/chat';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { SuggestedPrompts } from './SuggestedPrompts';

const STICK_THRESHOLD_PX = 96;

interface ChatPanelProps {
  variant?: 'page' | 'widget';
  /** Mobile/desktop hook to reveal the compare panel from a builds summary. */
  onShowBuilds?: () => void;
  /** Extra controls on the right of the toolbar (e.g. "Mở toàn màn hình"). */
  actions?: ReactNode;
  className?: string;
}

function Welcome({ compact, onPick }: { compact: boolean; onPick: (t: string) => void }) {
  return (
    <div className={cn('flex flex-col gap-5', compact ? 'py-2' : 'py-6 sm:py-10')}>
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-accent-ink">
          <span
            aria-hidden
            className="size-1.5 animate-blink-dot rounded-full bg-accent shadow-(--led-shadow)"
          />
          Trợ lý cấu hình PC
        </span>
        <h2 className={cn('font-bold text-fg', compact ? 'text-lg' : 'text-xl sm:text-2xl')}>
          Nói nhu cầu, AI chọn cấu hình từ hàng có sẵn
        </h2>
        <p className="max-w-prose text-sm text-muted">
          Cho biết mục đích và ngân sách; có thể thêm độ phân giải, hãng hoặc màu yêu thích. Mọi cấu hình đều
          đã kiểm tra tương thích và lấy giá trực tiếp từ kho.
        </p>
      </div>
      <SuggestedPrompts onPick={onPick} />
    </div>
  );
}

export function ChatPanel({ variant = 'page', onShowBuilds, actions, className }: ChatPanelProps) {
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const mode = useChatStore((s) => s.mode);
  const historyStatus = useChatStore((s) => s.historyStatus);
  const selectedBuildId = useChatStore((s) => s.selectedBuildId);
  const { init, send, stop, retry, reset, selectBuild } = useChatStore.getState();
  const compact = variant === 'widget';
  const streaming = status === 'streaming';

  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    void init();
  }, [init]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: follow every streamed change while pinned to the bottom
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendAndFollow = (text: string) => {
    stick.current = true;
    void send(text);
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="truncate text-sm font-medium text-muted">
          {streaming
            ? 'Đang trả lời…'
            : messages.length > 0
              ? 'Cuộc trò chuyện hiện tại'
              : 'Cuộc trò chuyện mới'}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            disabled={messages.length === 0}
            className="text-muted hover:text-fg"
          >
            <MessageSquarePlus aria-hidden />
            <span className={cn(compact && 'max-sm:sr-only')}>Cuộc trò chuyện mới</span>
          </Button>
        </div>
      </div>

      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
        }}
        role="log"
        aria-live="polite"
        aria-busy={streaming}
        aria-label="Hội thoại với trợ lý"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {historyStatus !== 'ready' && messages.length === 0 ? (
          <div className="flex flex-col gap-4" aria-hidden>
            <Skeleton className="ms-auto h-10 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : messages.length === 0 ? (
          <Welcome compact={compact} onPick={sendAndFollow} />
        ) : (
          <div className="flex flex-col gap-6">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                buildsDisplay={compact ? 'cards' : 'summary'}
                selectedBuildId={selectedBuildId}
                onSelectBuild={selectBuild}
                onShowBuilds={onShowBuilds}
                onRetry={(id) => {
                  stick.current = true;
                  void retry(id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-bg/70 px-3 pt-3 pb-2 backdrop-blur sm:px-4">
        <Composer
          onSend={sendAndFollow}
          onStop={stop}
          streaming={streaming}
          fallback={mode === 'FALLBACK'}
          compact={compact}
          autoFocus={!compact}
        />
      </div>
    </div>
  );
}
