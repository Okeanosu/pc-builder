'use client';

import { CHAT_MODES } from '@pc/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MessagesSquare } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader } from '../AdminChrome';
import { adminApi } from '../api';
import { ChatModeBadge } from '../badges';
import { formatDateTime } from '../format';
import {
  Pagination,
  QueryError,
  refetchClass,
  TableFrame,
  TableSkeleton,
  tableClass,
  td,
  th,
  thEnd,
} from '../ui';
import { pickEnum, useClampPage, useListParams } from '../use-list-params';

const PAGE_SIZE = 20;
const ALL = 'all';

export function ChatsPage() {
  const { get, set, page } = useListParams();
  const mode = pickEnum(get('mode'), CHAT_MODES);
  const filter = { page, pageSize: PAGE_SIZE, mode };
  const query = useQuery({
    queryKey: queryKeys.admin.chats(filter),
    queryFn: () => adminApi.chats(filter),
    placeholderData: keepPreviousData,
  });
  useClampPage(page, query.isPlaceholderData ? undefined : query.data?.total, PAGE_SIZE, set);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title="Hội thoại AI" />
      <p className="max-w-3xl text-sm text-muted">
        Nhật ký các phiên tư vấn: tin nhắn của khách, câu trả lời của trợ lý và từng lần gọi công cụ (tìm linh
        kiện, chạy bộ giải CSP/MCKP, kiểm tra tương thích) kèm tham số và kết quả. Phiên “Dự phòng” chạy bằng
        bộ hiểu ngôn ngữ dựa trên luật khi Gemini không phản hồi.
      </p>
      <Tabs value={mode ?? ALL} onValueChange={(v) => set({ mode: v === ALL ? null : v })}>
        <TabsList aria-label="Lọc theo chế độ">
          <TabsTrigger value={ALL}>Tất cả</TabsTrigger>
          <TabsTrigger value="AI">AI (Gemini)</TabsTrigger>
          <TabsTrigger value="FALLBACK">Dự phòng</TabsTrigger>
        </TabsList>
      </Tabs>
      <TableFrame className={refetchClass(query.isFetching, Boolean(query.data))}>
        {query.isPending ? (
          <TableSkeleton cols={5} />
        ) : query.isError ? (
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            compact
            icon={<MessagesSquare />}
            title={mode ? 'Không có phiên ở chế độ này' : 'Chưa có phiên hội thoại'}
            description="Phiên mới sẽ hiện ở đây khi khách trò chuyện với AI tư vấn cấu hình."
          />
        ) : (
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={th}>Phiên</th>
                <th className={th}>Chế độ</th>
                <th className={th}>Người dùng</th>
                <th className={thEnd}>Tin nhắn</th>
                <th className={th}>Bắt đầu</th>
                <th className={th}>Tin cuối</th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2">
                  <td className={cn(td, 'min-w-56')}>
                    <Link
                      href={`/admin/chats/${s.id}`}
                      className="focus-ring line-clamp-2 rounded-xs font-medium text-fg decoration-1 underline-offset-[3px] hover:underline"
                    >
                      {s.title || 'Phiên chưa đặt tên'}
                    </Link>
                    <div className="tabular-nums text-xs text-muted">{s.id.slice(0, 8)}</div>
                  </td>
                  <td className={td}>
                    <ChatModeBadge mode={s.mode} />
                  </td>
                  <td className={cn(td, 'text-sm')}>
                    {s.userEmail ?? <span className="text-muted">Khách vãng lai</span>}
                  </td>
                  <td className={cn(td, 'text-end tabular-nums')}>{s.messageCount}</td>
                  <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDateTime(s.createdAt)}</td>
                  <td className={cn(td, 'whitespace-nowrap text-muted')}>
                    {formatDateTime(s.lastMessageAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableFrame>
      {query.data && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={query.data.total}
          onPage={(p) => set({ page: p })}
        />
      )}
    </div>
  );
}
