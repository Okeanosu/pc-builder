'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';

export const PROMPT_CHIPS = [
  'Gaming 25 triệu',
  'Đồ họa 40 triệu',
  'AI/Deep learning 60 triệu',
  'Văn phòng 12 triệu',
];

const advisorHref = (text: string) => `/advisor?q=${encodeURIComponent(text.trim())}`;

/** The home page's main entry: whatever the shopper types is handed to the advisor, which sends it on arrival. */
export function AdvisorPrompt() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError(true);
      return;
    }
    router.push(advisorHref(text));
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={submit}
        className="group flex items-center gap-2 rounded-lg border border-border-strong bg-surface p-2 shadow-overlay transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgb(34_211_238/0.25)]"
      >
        <label htmlFor="advisor-prompt" className="sr-only">
          Mô tả nhu cầu và ngân sách của bạn
        </label>
        <input
          id="advisor-prompt"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(false);
          }}
          maxLength={1000}
          autoComplete="off"
          enterKeyHint="send"
          aria-invalid={error || undefined}
          aria-describedby={error ? 'advisor-prompt-error' : undefined}
          placeholder="Chơi Valorant + edit video nhẹ, tầm 25 triệu…"
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-fg outline-none placeholder:text-muted sm:h-14 sm:text-lg"
        />
        <Button type="submit" size="lg" className="max-sm:size-12 max-sm:px-0" aria-label="Hỏi AI tư vấn">
          <span className="max-sm:sr-only">Hỏi AI</span>
          <ArrowRight aria-hidden />
        </Button>
      </form>
      {error && (
        <p id="advisor-prompt-error" className="-mt-1 text-sm font-medium text-warn-ink">
          Hãy kể nhu cầu, ví dụ “chơi game 2K tầm 30 triệu”, hoặc chọn một gợi ý bên dưới.
        </p>
      )}
      <ul
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        aria-label="Gợi ý nhanh"
      >
        {PROMPT_CHIPS.map((chip) => (
          <li key={chip} className="shrink-0">
            <button
              type="button"
              onClick={() => router.push(advisorHref(chip))}
              className="focus-ring inline-flex h-9 items-center rounded-full border border-border bg-surface-2 px-4 text-sm font-medium text-fg transition-colors hover:border-accent/60 hover:bg-surface-3"
            >
              {chip}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
