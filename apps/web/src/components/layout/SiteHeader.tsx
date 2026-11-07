import { CATEGORY_KEYS, CATEGORY_LABELS } from '@pc/shared';
import { Search, ShoppingCart, User, Wrench } from 'lucide-react';
import Form from 'next/form';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

export interface NavCategory {
  key: string;
  label: string;
  href: string;
}

export const DEFAULT_NAV_CATEGORIES: NavCategory[] = CATEGORY_KEYS.map((key) => ({
  key,
  label: CATEGORY_LABELS[key],
  href: `/c/${key}`,
}));

interface SiteHeaderProps {
  /** Items in the cart; the badge hides at 0. */
  cartCount?: number;
  categories?: NavCategory[];
  /** `key` of the category being viewed, for aria-current. */
  activeCategory?: string;
  /** Signed-in menu (e.g. a dropdown with the user's name). Defaults to a "Đăng nhập" link. */
  accountSlot?: ReactNode;
  /** GET target of the search form; the query is sent as `q`. */
  searchAction?: string;
  searchDefaultValue?: string;
  className?: string;
}

/** Storefront header. Pure presentation: pass data in, no fetching inside. */
export function SiteHeader({
  cartCount = 0,
  categories = DEFAULT_NAV_CATEGORIES,
  activeCategory,
  accountSlot,
  searchAction = '/search',
  searchDefaultValue,
  className,
}: SiteHeaderProps) {
  return (
    <header
      className={cn('sticky top-0 z-40 border-b border-border bg-surface/92 backdrop-blur-md', className)}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3 md:flex-nowrap md:gap-x-5 lg:px-6">
        <Logo compact />

        <Form
          action={searchAction}
          role="search"
          className="order-last w-full md:order-none md:max-w-md md:flex-1 lg:max-w-xl"
        >
          <Input
            name="q"
            type="search"
            defaultValue={searchDefaultValue}
            placeholder="Tìm CPU, card đồ họa, mainboard…"
            aria-label="Tìm sản phẩm"
            leading={<Search aria-hidden />}
            enterKeyHint="search"
          />
        </Form>

        <div className="ms-auto flex items-center gap-1 sm:gap-2">
          <Button asChild variant="workshop" className="max-sm:h-9 max-sm:px-3">
            <Link href="/advisor">
              <span
                aria-hidden
                className="size-1.5 animate-blink-dot rounded-full bg-cyan shadow-[0_0_6px_var(--color-cyan)]"
              />
              <span className="sm:hidden">AI tư vấn</span>
              <span className="max-sm:hidden">AI tư vấn cấu hình</span>
            </Link>
          </Button>
          <ThemeToggle className="max-md:hidden" />
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `Giỏ hàng, ${cartCount} sản phẩm` : 'Giỏ hàng'}
            className="focus-ring relative inline-flex size-10 items-center justify-center rounded-sm text-fg transition-colors hover:bg-surface-2"
          >
            <ShoppingCart className="size-5" aria-hidden />
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 font-mono text-xs font-semibold text-accent-fg tabular-nums ring-2 ring-surface"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          {accountSlot ?? (
            <Button asChild variant="ghost" className="max-lg:size-10 max-lg:px-0">
              <Link href="/login">
                <User className="size-5" aria-hidden />
                <span className="max-lg:sr-only">Đăng nhập</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <nav aria-label="Danh mục sản phẩm" className="border-t border-border">
        <ul className="no-scrollbar mx-auto flex h-11 max-w-7xl items-center gap-1 overflow-x-auto px-4 lg:px-6">
          {categories.map((c) => {
            const active = c.key === activeCategory;
            return (
              <li key={c.key} className="shrink-0">
                <Link
                  href={c.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'focus-ring inline-flex h-8 items-center rounded-xs px-3 text-sm font-medium transition-colors',
                    active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
                  )}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
          <li className="ms-auto shrink-0 ps-2">
            <Link
              href="/builder"
              className="focus-ring inline-flex h-8 items-center gap-2 rounded-xs px-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"
            >
              <Wrench className="size-4 text-accent-ink" aria-hidden />
              Tự build PC
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
