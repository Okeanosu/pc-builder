'use client';

import { CircleCheck, Info, OctagonX, TriangleExclamationPoint, X } from 'lucide-react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { create } from 'zustand';
import { cn } from '@/lib/cn';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** ms; errors stay longer by default. */
  duration?: number;
  action?: { label: string; altText: string; onClick: () => void };
}

interface ToastItem extends ToastInput {
  id: string;
  open: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: ToastInput) => string;
  close: (id: string) => void;
}

let seq = 0;
const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `t${++seq}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id, open: true }] }));
    return id;
  },
  close: (id) => {
    set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, open: false } : t)) }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 240);
  },
}));

/** Show a toast from any client code: `toast({ title: 'Đã thêm vào giỏ hàng', tone: 'success' })`. */
export function toast(input: ToastInput): string {
  return useToastStore.getState().push(input);
}
toast.dismiss = (id: string) => useToastStore.getState().close(id);

const TONES: Record<ToastTone, { Icon: typeof Info; className: string }> = {
  info: { Icon: Info, className: 'text-accent-ink' },
  success: { Icon: CircleCheck, className: 'text-ok-ink' },
  warning: { Icon: TriangleExclamationPoint, className: 'text-warn-ink' },
  error: { Icon: OctagonX, className: 'text-danger-ink' },
};

export const toastSurfaceClass =
  'pointer-events-auto relative flex w-full items-start gap-3 rounded-md border border-border bg-surface p-4 pe-11 text-fg shadow-overlay';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const close = useToastStore((s) => s.close);
  return (
    <ToastPrimitive.Provider swipeDirection="right" label="Thông báo">
      {toasts.map((t) => {
        const tone = TONES[t.tone ?? 'info'];
        return (
          <ToastPrimitive.Root
            key={t.id}
            open={t.open}
            onOpenChange={(open) => !open && close(t.id)}
            duration={t.duration ?? (t.tone === 'error' ? 8000 : 4500)}
            type={t.tone === 'error' ? 'foreground' : 'background'}
            className={cn(
              toastSurfaceClass,
              'data-[state=closed]:animate-toast-out data-[state=open]:animate-toast-in data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
            )}
          >
            <tone.Icon className={cn('mt-0.5 size-5 shrink-0', tone.className)} aria-hidden />
            <div className="grid min-w-0 flex-1 gap-1">
              <ToastPrimitive.Title className="text-sm font-semibold">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-sm text-muted">
                  {t.description}
                </ToastPrimitive.Description>
              )}
              {t.action && (
                <ToastPrimitive.Action
                  altText={t.action.altText}
                  onClick={t.action.onClick}
                  className="focus-ring mt-1 w-fit rounded-xs text-sm font-semibold text-accent-ink underline-offset-4 hover:underline"
                >
                  {t.action.label}
                </ToastPrimitive.Action>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Đóng thông báo"
              className="focus-ring absolute end-2.5 top-2.5 inline-flex size-7 items-center justify-center rounded-xs text-muted hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex max-h-dvh flex-col gap-2 p-4 outline-none sm:start-auto sm:end-0 sm:w-[400px]" />
    </ToastPrimitive.Provider>
  );
}
