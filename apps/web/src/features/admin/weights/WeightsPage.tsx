'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { queryKeys } from '@/lib/query-keys';
import { AdminPageHeader, useAdminRole } from '../AdminChrome';
import { adminApi } from '../api';
import { QueryError, ReadOnlyNote } from '../ui';
import { WeightMatrixEditor } from '../WeightMatrixEditor';

export function WeightsPage() {
  const { isAdmin } = useAdminRole();
  const query = useQuery({ queryKey: queryKeys.admin.weights, queryFn: adminApi.weights });

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader title="Trọng số thuật toán" />
      <div className="grid max-w-4xl gap-2 text-sm text-muted">
        <p>
          Ma trận <span className="font-mono text-fg">w[nhu cầu][danh mục]</span> quyết định giá trị của từng
          linh kiện trong mô hình cái túi nhiều lựa chọn (MCKP):{' '}
          <span className="font-mono text-fg">v = w × điểm chuẩn hóa + ưu tiên thương mại</span>. Khoảng phân
          bổ tối thiểu – tối đa được bộ giải CSP dùng để sắp miền giá trị và làm heuristic cắt nhánh (không
          phải ràng buộc cứng).
        </p>
        <p>
          Lưu một nhu cầu sẽ xóa bộ nhớ đệm gợi ý (<span className="font-mono">cache:reco</span>) nên các gợi
          ý mới, kể cả của chatbot, dùng ngay trọng số mới. “Khôi phục mặc định” nạp bộ trọng số gốc của bộ
          máy; nhấn Lưu để áp dụng.
        </p>
      </div>
      {!isAdmin && (
        <ReadOnlyNote>
          Chỉ quản trị viên được chỉnh trọng số thuật toán. Bạn đang xem ở chế độ chỉ đọc.
        </ReadOnlyNote>
      )}
      {query.isPending ? (
        <Skeleton className="h-[560px] rounded-md" />
      ) : query.isError ? (
        <Card>
          <QueryError error={query.error} onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <WeightMatrixEditor rows={query.data} canEdit={isAdmin} />
      )}
    </div>
  );
}
