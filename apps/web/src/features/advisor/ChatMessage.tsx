'use client';

import { type BuildDTO, CATEGORY_KEYS, formatVndShort } from '@pc/shared';
import { ArrowRight, LogIn, OctagonX, RotateCcw, Square } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORY_COLOR } from '@/components/domain/category';
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

/** Before the first words arrive: plain text, announced once. */
function Thinking() {
  return (
    <p className="text-sm text-muted" role="status">
      Đang soạn câu trả lời…
    </p>
  );
}

/** The builds' eight-colour split as a thin strip, so each line reads as the same sheet as the compare panel. */
function AllocationStrip({ allocation }: { allocation: BuildDTO['allocation'] }) {
  return (
    <span aria-hidden className="flex h-1.5 w-full gap-px overflow-hidden rounded-xs">
      {CATEGORY_KEYS.map((key) => {
        const share = allocation[key] ?? 0;
        return share > 0 ? (
          <span
            key={key}
            className="h-full min-w-[2px] basis-0"
            style={{ flexGrow: share, backgroundColor: CATEGORY_COLOR[key] }}
          />
        ) : null;
      })}
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
    <div className="flex animate-fade-in flex-col gap-1.5">
      <p className="text-sm text-muted">{builds.length} cấu hình tương thích, giá lấy từ kho</p>
      <ul className="flex flex-col">
        {builds.map((b) => {
          const selected = b.id === selectedBuildId;
          return (
            <li key={b.id} className="border-b border-border">
              <button
                type="button"
                onClick={() => {
                  onSelectBuild?.(b.id);
                  onShowBuilds?.();
                }}
                className={cn(
                  'focus-ring group -mx-2 grid w-[calc(100%+1rem)] grid-cols-[minmax(0,1fr)_3.5rem_auto_auto] items-center gap-x-3 rounded-sm px-2 py-2.5 text-start text-sm transition-colors hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_6rem_auto_auto] sm:gap-x-4',
                  selected && 'bg-surface-2',
                )}
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className={cn('truncate text-fg', selected ? 'font-semibold' : 'font-medium')}>
                    {buildTitle(b)}
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{Math.round(b.score)} điểm</span>
                </span>
                <AllocationStrip allocation={b.allocation} />
                <span className="text-end text-fg tabular-nums">{formatVndShort(b.totalPrice)}</span>
                <ArrowRight className="size-3.5 text-muted group-hover:text-fg" aria-hidden />
              </button>
            </li>
          );
        })}
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
  const { text, tools, streaming, builds, products, error, needsLogin, stopped } = message;
  const { shown, revealing } = useSmoothText(text, streaming);
  const pathname = usePathname() ?? '/advisor';
  const thinking = streaming && !text && tools.every((t) => t.status === 'done') && builds.length === 0;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {tools.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-x-4 gap-y-1" aria-label="Trạng thái tra cứu">
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
            {builds.map((b) => (
              <BuildCard
                key={b.id}
                build={b}
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

      {shown ? <Markdown text={shown} streaming={revealing} /> : thinking && <Thinking />}

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
          {needsLogin && (
            <Button asChild size="sm">
              <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>
                <LogIn aria-hidden />
                Đăng nhập lại
              </Link>
            </Button>
          )}
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
        <p className="max-w-[85%] whitespace-pre-wrap rounded-md rounded-ee-xs bg-surface-2 px-4 py-2.5 text-base text-fg [overflow-wrap:anywhere] sm:max-w-md">
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
