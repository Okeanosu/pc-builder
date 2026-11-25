'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { ToggleGroup } from 'radix-ui';
import { useLayoutEffect, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { THEME_STORAGE_KEY } from './theme-script';

export type ThemePreference = 'system' | 'light' | 'dark';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'Theo hệ thống', Icon: Monitor },
  { value: 'light', label: 'Sáng', Icon: Sun },
  { value: 'dark', label: 'Tối', Icon: Moon },
];

const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function applyPreference(pref: ThemePreference) {
  const dark =
    pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (readPreference() === 'system') applyPreference('system');
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_STORAGE_KEY) return;
    applyPreference(readPreference());
    onChange();
  };
  mq.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage can throw in private mode; the choice still applies to this page view.
  }
  applyPreference(pref);
  for (const l of listeners) l();
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => 'system');
}

interface ThemeToggleProps {
  /** `icon` cycles system → light → dark in one 40px button; `segmented` shows all three. */
  variant?: 'icon' | 'segmented';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const pref = useThemePreference();

  // React's dev-only remount resets <html> attributes; re-apply before paint (no-op in production).
  useLayoutEffect(() => {
    applyPreference(readPreference());
  }, []);

  if (variant === 'segmented') {
    return (
      <ToggleGroup.Root
        type="single"
        value={pref}
        onValueChange={(v) => v && setThemePreference(v as ThemePreference)}
        aria-label="Giao diện"
        className={cn('inline-flex rounded-sm border border-border bg-surface-2 p-0.5', className)}
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <ToggleGroup.Item
            key={value}
            value={value}
            aria-label={label}
            title={label}
            className="focus-ring inline-flex size-8 items-center justify-center rounded-xs text-muted transition-colors hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-raised"
          >
            <Icon className="size-4" aria-hidden />
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    );
  }

  const index = OPTIONS.findIndex((o) => o.value === pref);
  const current = OPTIONS[index]!;
  const next = OPTIONS[(index + 1) % OPTIONS.length]!;
  return (
    <button
      type="button"
      onClick={() => setThemePreference(next.value)}
      aria-label={`Giao diện: ${current.label}. Chuyển sang ${next.label}`}
      title={`Giao diện: ${current.label}`}
      className={cn(
        'focus-ring inline-flex size-10 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg',
        className,
      )}
    >
      <current.Icon className="size-5" aria-hidden />
    </button>
  );
}
