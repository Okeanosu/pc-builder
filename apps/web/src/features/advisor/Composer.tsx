'use client';

import { ArrowUp, Square } from 'lucide-react';
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FallbackBadge } from './FallbackBadge';

const MAX_LENGTH = 1000;
const MAX_HEIGHT_PX = 168;

interface ComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  fallback?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function Composer({
  onSend,
  onStop,
  streaming,
  fallback,
  compact,
  autoFocus,
  className,
}: ComposerProps) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the text changes
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  useEffect(() => {
    // Only with a mouse/trackpad: focusing on phones would throw the keyboard over the welcome screen.
    if (autoFocus && window.matchMedia('(pointer: fine)').matches) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    onSend(text);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Vietnamese IMEs (Telex/VNI) confirm a syllable with Enter while composing; that must not send.
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    submit();
  };

  const nearLimit = value.length > MAX_LENGTH - 100;

  return (
    <form
      className={cn('flex flex-col gap-1.5', className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-md border border-border-strong bg-surface p-1.5 ps-3.5 shadow-raised transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={compact ? 'Nhu cầu và ngân sách…' : 'Nhập nhu cầu và ngân sách…'}
          aria-label="Nhập yêu cầu cho trợ lý"
          enterKeyHint="send"
          className="max-h-42 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-base text-fg outline-none placeholder:text-muted"
        />
        {streaming ? (
          <Button type="button" size="icon-sm" variant="secondary" onClick={onStop} aria-label="Dừng trả lời">
            <Square className="fill-current" aria-hidden />
          </Button>
        ) : (
          <Button type="submit" size="icon-sm" disabled={!value.trim()} aria-label="Gửi">
            <ArrowUp aria-hidden />
          </Button>
        )}
      </div>
      <div className="flex min-h-6 items-center justify-between gap-3 px-1">
        <span className="text-xs text-muted max-sm:hidden">
          <kbd className="font-mono">Enter</kbd> để gửi · <kbd className="font-mono">Shift+Enter</kbd> xuống
          dòng
        </span>
        <span className="ms-auto flex items-center gap-2">
          {nearLimit && (
            <span className="font-mono text-xs text-muted tabular-nums">
              {value.length}/{MAX_LENGTH}
            </span>
          )}
          {fallback && <FallbackBadge />}
        </span>
      </div>
    </form>
  );
}
