'use client';

import { type BuildDTO, formatVndShort } from '@pc/shared';
import { ArrowRight, OctagonX, RotateCcw, Square } from 'lucide-react';
import Link from 'next/link';
import { ProductCard } from '@/components/domain/ProductCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import type { AssistantMessage, ChatItem } from '@/stores/chat';
import { BuildCard, buildTitle } from './BuildCard';
import { Markdown } from './Markdown';
import { ToolStatusChip } from './ToolStatusChip';
import { useSmoothText } from './useSmoothText';

export type BuildsDisplay = 'summary' | 'cards';

interface ChatMessageProps {
  message: ChatItem;
  /** `summary`: a compact list that points to the compare panel. `cards`: full cards inline (widget). */
  buildsDisplay?: BuildsDisplay;
  selectedBuildId?: string | null;
  onSelectBuild?: (id: string) => void;
  onShowBuilds?: () => void;
  onRetry?: (id: string) => void;
  className?: string;
}

function TypingDots() {
  return (
    <span className="inline-flex h-7 items-center gap-1" role="status">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="size-1.5 animate-blink-dot rounded-full bg-accent"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
      <span className="sr-only">Trợ lý đang trả lời</span>
    </span>
  );
}

function BuildsSummary({
  builds,
  selectedBuildId,
  onSelectBuild,
  onShowBuilds,
}: {
  builds: BuildDTO[];
  selectedBuildId?: string | null;
  onSelectBuild?: (id: string) => void;
  onShowBuilds?: () => void;
}) {
  return (
    <div className="flex animate-card-in flex-col gap-1 rounded-md border border-border bg-surface/80 p-1.5">
      <p className="px-2 pt-1 text-xs font-medium text-muted">
        {builds.length} cấu hình tương thích, giá lấy từ kho
      </p>
      <ul className="flex flex-col">
        {builds.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => {
                onSelectBuild?.(b.id);
                onShowBuilds?.();
              }}
              className={cn(
                'focus-ring flex w-full items-center justify-between gap-3 rounded-sm px-2 py-1.5 text-start text-sm transition-colors hover:bg-surface-2',
                b.id === selectedBuildId && 'bg-surface-2',
              )}
            >
              <span className="font-medium text-fg">{buildTitle(b)}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-sm text-fg tabular-nums">{formatVndShort(b.totalPrice)}</span>
                <span className="font-mono text-xs text-muted tabular-nums">{Math.round(b.score)} điểm</span>
                <ArrowRight className="size-3.5 text-muted" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AssistantBody({
  message,
  buildsDisplay = 'summary',
  selectedBuildId,
  onSelectBuild,
  onShowBuilds,
  onRetry,
}: Omit<ChatMessageProps, 'message' | 'className'> & { message: AssistantMessage }) {
  const { text, tools, streaming, builds, products, error, stopped } = message;
  const { shown, revealing } = useSmoothText(text, streaming);
  const thinking = streaming && !text && tools.every((t) => t.status === 'done') && builds.length === 0;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {tools.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-2" aria-label="Trạng thái tra cứu">
          {tools.map((t) => (
            <li key={t.key} className="min-w-0 max-w-full">
              <ToolStatusChip chip={t} />
            </li>
          ))}
        </ul>
      )}

      {builds.length > 0 &&
        (buildsDisplay === 'cards' ? (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
            {builds.map((b, i) => (
              <BuildCard
                key={b.id}
                build={b}
                index={i}
                selected={b.id === selectedBuildId}
                onSelect={() => onSelectBuild?.(b.id)}
                className="w-[17.5rem] shrink-0 snap-start"
              />
            ))}
          </div>
        ) : (
          <BuildsSummary
            builds={builds}
            selectedBuildId={selectedBuildId}
            onSelectBuild={onSelectBuild}
            onShowBuilds={onShowBuilds}
          />
        ))}

      {shown ? <Markdown text={shown} streaming={revealing} /> : thinking && <TypingDots />}

      {products.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Sản phẩm gợi ý">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={p}
                variant="list"
                maxSpecs={2}
                action={
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/builder?add=${encodeURIComponent(p.id)}`}>Thêm vào cấu hình</Link>
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      {stopped && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Square className="size-3" aria-hidden />
          Đã dừng trả lời
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-fg"
        >
          <OctagonX className="size-4 shrink-0 text-danger-ink" aria-hidden />
          <span className="min-w-0 flex-1">{error}</span>
          {onRetry && !streaming && (
            <Button size="sm" variant="secondary" onClick={() => onRetry(message.id)}>
              <RotateCcw aria-hidden />
              Gửi lại
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message, className, ...rest }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className={cn('flex justify-end', className)}>
        <p className="max-w-[85%] whitespace-pre-wrap rounded-md rounded-ee-xs bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg [overflow-wrap:anywhere] sm:max-w-md">
          <span className="sr-only">Bạn: </span>
          {message.text}
        </p>
      </div>
    );
  }
  return (
    <div className={className}>
      <span className="sr-only">Trợ lý: </span>
      <AssistantBody message={message} {...rest} />
    </div>
  );
}
