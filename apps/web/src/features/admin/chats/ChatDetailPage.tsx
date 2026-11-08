'use client';

import type { ChatLogDetailDTO, ChatLogMessageDTO } from '@pc/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bot, ChevronRight, ExternalLink, MessagesSquare, User, Wrench } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { ChatModeBadge } from '../badges';
import { formatDateTime } from '../format';
import { PageSkeleton, QueryError } from '../ui';
import { compactJson, prettyJson, summarizeToolResult } from './chat-log';

const latency = (ms: number | null) =>
  ms === null
    ? null
    : ms >= 1000
      ? `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} s`
      : `${ms} ms`;

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <pre className="max-h-80 overflow-auto rounded-sm border border-border bg-surface-2 p-3 font-mono text-xs leading-5 text-fg">
        {prettyJson(value)}
      </pre>
    </div>
  );
}

function ToolCall({ m, index }: { m: ChatLogMessageDTO; index: number }) {
  const summary = summarizeToolResult(m.toolResult);
  return (
    <li id={`msg-${m.id}`} className="flex justify-start">
      <details className="group w-full max-w-2xl rounded-md border border-border bg-surface">
        <summary className="focus-ring flex cursor-pointer list-none items-start gap-3 rounded-md px-4 py-3 hover:bg-surface-2">
          <span
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted"
            aria-hidden
          >
            <Wrench className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Bước {index}: gọi công cụ</span>
              <code className="font-mono font-semibold text-fg">{m.toolName ?? 'không rõ'}</code>
              <Badge tone={summary.failed ? 'danger' : 'neutral'} size="sm">
                {summary.text}
              </Badge>
              {latency(m.latencyMs) && (
                <span className="text-xs text-muted tabular-nums">{latency(m.latencyMs)}</span>
              )}
            </span>
            <code className="truncate font-mono text-xs text-muted">{compactJson(m.toolArgs)}</code>
          </span>
          <ChevronRight
            className="mt-1 size-4 shrink-0 text-muted transition-transform group-open:rotate-90"
            aria-hidden
          />
        </summary>
        <div className="grid gap-3 border-t border-border px-4 py-3 lg:grid-cols-2">
          <JsonBlock label="Tham số (args)" value={m.toolArgs} />
          <JsonBlock label="Kết quả trả cho mô hình" value={m.toolResult} />
        </div>
      </details>
    </li>
  );
}

function BuildLinks({ ids }: { ids: string[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <span className="text-xs text-muted">Cấu hình đã gợi ý:</span>
      {ids.map((id, i) => (
        <Link
          key={id}
          href={`/builds/${id}`}
          target="_blank"
          className="focus-ring inline-flex h-7 items-center gap-1 rounded-xs border border-border bg-surface px-2 text-xs font-medium text-accent-ink hover:border-border-strong"
        >
          Cấu hình {i + 1} <span className="tabular-nums text-muted">{id.slice(0, 8)}</span>
          <ExternalLink className="size-3" aria-hidden />
        </Link>
      ))}
    </div>
  );
}

function Message({ m, toolIndex }: { m: ChatLogMessageDTO; toolIndex: number }) {
  if (m.role === 'tool') return <ToolCall m={m} index={toolIndex} />;
  const time = formatDateTime(m.createdAt);
  if (m.role === 'user') {
    return (
      <li id={`msg-${m.id}`} className="flex flex-col items-end gap-1">
        <div className="max-w-md rounded-md rounded-ee-xs bg-accent px-4 py-2.5 text-base whitespace-pre-wrap text-accent-fg">
          {m.content}
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <User className="size-3" aria-hidden /> Khách · {time}
        </span>
      </li>
    );
  }
  return (
    <li id={`msg-${m.id}`} className="flex flex-col items-start gap-1.5">
      <div className="max-w-2xl text-base text-fg [&_a]:text-accent-ink [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:my-2 [&_strong]:font-semibold [&_table]:my-2 [&_table]:text-sm [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:ps-5">
        <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
      </div>
      <BuildLinks ids={m.buildIds} />
      <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Bot className="size-3" aria-hidden /> Trợ lý · {time}
        {latency(m.latencyMs) && <span className="tabular-nums">· {latency(m.latencyMs)}</span>}
        {m.mode === 'FALLBACK' && (
          <Badge tone="warn" size="sm">
            Dự phòng
          </Badge>
        )}
      </span>
    </li>
  );
}

function ReasoningPanel({ chat }: { chat: ChatLogDetailDTO }) {
  const tools = chat.messages.filter((m) => m.role === 'tool');
  const builds = new Set(chat.messages.flatMap((m) => m.buildIds));
  return (
    <Card className="xl:sticky xl:top-24">
      <CardHeader>
        <CardTitle>Chuỗi lập luận</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Chế độ</dt>
            <dd className="mt-0.5">
              <ChatModeBadge mode={chat.mode} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Tin nhắn</dt>
            <dd className="tabular-nums">{chat.messageCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Lần gọi công cụ</dt>
            <dd className="tabular-nums">{tools.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Cấu hình gợi ý</dt>
            <dd className="tabular-nums">{builds.size}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted">Người dùng</dt>
            <dd className="truncate">
              {chat.userEmail ?? `Khách vãng lai${chat.guestId ? ` (${chat.guestId.slice(0, 10)})` : ''}`}
            </dd>
          </div>
        </dl>
        {tools.length > 0 ? (
          <ol className="flex flex-col gap-1 border-t border-border pt-3">
            {tools.map((t, i) => {
              const s = summarizeToolResult(t.toolResult);
              return (
                <li key={t.id}>
                  <a
                    href={`#msg-${t.id}`}
                    className="focus-ring flex items-baseline gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    <span className="text-xs text-muted tabular-nums">{i + 1}.</span>
                    <code className="font-mono text-fg">{t.toolName}</code>
                    <span
                      className={cn('ms-auto truncate text-xs', s.failed ? 'text-danger-ink' : 'text-muted')}
                    >
                      {s.text}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="border-t border-border pt-3 text-sm text-muted">
            Phiên này không gọi công cụ nào (trả lời trực tiếp hoặc chạy chế độ dự phòng).
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ChatDetailPage({ id }: { id: string }) {
  const query = useQuery({ queryKey: queryKeys.admin.chat(id), queryFn: () => adminApi.chat(id) });

  if (query.isPending) {
    return (
      <>
        <AdminPageHeader title="Phiên hội thoại" />
        <PageSkeleton />
      </>
    );
  }
  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <>
        <AdminPageHeader title="Phiên hội thoại" />
        <Card>
          {notFound ? (
            <EmptyState
              icon={<MessagesSquare />}
              title="Không tìm thấy phiên hội thoại"
              description="Phiên có thể đã bị xóa hoặc đường dẫn bị sai."
              actions={
                <Button asChild variant="secondary">
                  <Link href="/admin/chats">Về danh sách hội thoại</Link>
                </Button>
              }
            />
          ) : (
            <QueryError error={query.error} onRetry={() => query.refetch()} compact={false} />
          )}
        </Card>
      </>
    );
  }

  const chat = query.data;
  let toolIndex = 0;
  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader title={chat.title || 'Phiên hội thoại'} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="link" size="sm">
          <Link href="/admin/chats">
            <ArrowLeft aria-hidden />
            Danh sách hội thoại
          </Link>
        </Button>
        <span className="text-xs text-muted">
          Bắt đầu {formatDateTime(chat.createdAt)} · <span className="tabular-nums">{chat.id}</span>
        </span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardContent>
            {chat.messages.length === 0 ? (
              <EmptyState
                compact
                icon={<MessagesSquare />}
                title="Phiên chưa có tin nhắn"
                description="Khách đã mở khung chat nhưng chưa gửi câu hỏi nào."
              />
            ) : (
              <ol className="flex flex-col gap-5">
                {chat.messages.map((m) => {
                  if (m.role === 'tool') toolIndex += 1;
                  return <Message key={m.id} m={m} toolIndex={toolIndex} />;
                })}
              </ol>
            )}
          </CardContent>
        </Card>
        <ReasoningPanel chat={chat} />
      </div>
    </div>
  );
}

export function ChatDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ChatDetailPage id={id} />;
}
