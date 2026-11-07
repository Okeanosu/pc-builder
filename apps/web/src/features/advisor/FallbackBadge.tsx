'use client';

import { CloudOff } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

/** Shown while answers come from the rule-based responder instead of Gemini. */
export function FallbackBadge({ className }: { className?: string }) {
  return (
    <Tooltip content="AI tạm không phản hồi. Cấu hình vẫn được bộ máy gợi ý tính từ hàng trong kho, chỉ phần giải thích ngắn gọn hơn.">
      <button
        type="button"
        className={cn(
          'focus-ring inline-flex h-6 shrink-0 cursor-help items-center gap-1.5 rounded-full border border-warn/45 bg-warn/14 px-2.5 text-xs font-semibold text-warn-ink',
          className,
        )}
      >
        <CloudOff className="size-3.5" aria-hidden />
        Chế độ dự phòng
      </button>
    </Tooltip>
  );
}
