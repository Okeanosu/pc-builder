import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

export const SUGGESTED_PROMPTS = [
  'Gaming 25 triệu',
  'Đồ họa 40 triệu',
  'AI/Deep learning 60 triệu',
  'Văn phòng 12 triệu',
  'Máy chơi game 2K, thích màu trắng, 30 triệu',
] as const;

export function SuggestedPrompts({
  onPick,
  disabled,
  className,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn('flex flex-wrap gap-2', className)} aria-label="Gợi ý câu hỏi">
      {SUGGESTED_PROMPTS.map((p) => (
        <li key={p}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(p)}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-border-strong bg-surface px-3.5 text-sm text-fg transition-colors hover:border-accent hover:bg-accent/10 disabled:opacity-45"
          >
            <Sparkles className="size-3.5 text-accent-ink" aria-hidden />
            {p}
          </button>
        </li>
      ))}
    </ul>
  );
}
