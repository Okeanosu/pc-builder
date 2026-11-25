'use client';

import { ArrowUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/Button';

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
    <div className="flex flex-col gap-2">
      <form
        onSubmit={submit}
        className="flex items-center gap-2 rounded-full border border-border-strong bg-bg p-1.5 ps-5 transition-[border-color,box-shadow] focus-within:border-fg focus-within:ring-1 focus-within:ring-fg"
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
          placeholder="Chơi Valorant, dựng video nhẹ, tầm 25 triệu"
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted sm:h-12"
        />
        <Button type="submit" size="lg" className="max-sm:size-11 max-sm:px-0" aria-label="Hỏi AI tư vấn">
          <span className="max-sm:sr-only">Hỏi AI</span>
          <ArrowUp className="sm:hidden" aria-hidden />
        </Button>
      </form>
      {error && (
        <p id="advisor-prompt-error" className="ps-5 text-sm font-medium text-warn-ink">
          Hãy kể nhu cầu và ngân sách, ví dụ “chơi game 2K tầm 30 triệu”.
        </p>
      )}
    </div>
  );
}
