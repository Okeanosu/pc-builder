'use client';

import { CATEGORY_KEYS, CATEGORY_LABELS, type CategoryKey } from '@pc/shared';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { type BrandCount, type FilterField, facetValueLabel } from './filters';
import {
  type ListingQuery,
  setCategory,
  setInStock,
  setPriceRange,
  setSpecRange,
  toggleBrand,
  toggleSpecValue,
} from './listing-query';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="py-4 first:pt-0">
      <fieldset className="min-w-0">
        <legend className="text-sm font-semibold text-fg">{title}</legend>
        <div className="mt-3">{children}</div>
      </fieldset>
    </div>
  );
}

const VISIBLE = 6;

interface CheckListProps {
  options: { value: string; label: string; count?: number }[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}

function CheckList({ options, selected, onToggle }: CheckListProps) {
  const [expanded, setExpanded] = useState(false);
  const hidden = options.length - VISIBLE;
  const shown =
    expanded || hidden <= 1 ? options : options.filter((o, i) => i < VISIBLE || selected.includes(o.value));
  return (
    <div className="flex flex-col gap-2.5">
      {shown.map((o) => (
        <Checkbox
          key={o.value}
          label={o.label}
          meta={o.count}
          checked={selected.includes(o.value)}
          onCheckedChange={() => onToggle(o.value)}
        />
      ))}
      {hidden > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="focus-ring w-fit rounded-xs text-sm font-medium text-accent-ink hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? 'Thu gọn' : `Xem thêm ${hidden} lựa chọn`}
        </button>
      )}
    </div>
  );
}

const digitsOnly = (s: string) => s.replace(/[^\d]/g, '');

function parseNumber(text: string, money: boolean): number | undefined {
  const cleaned = money ? digitsOnly(text) : text.replace(',', '.').trim();
  if (cleaned === '') return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

interface RangeInputsProps {
  label: string;
  min?: number;
  max?: number;
  unit?: string;
  placeholderMin?: string;
  placeholderMax?: string;
  /** Group thousands with dots while typing (prices). */
  money?: boolean;
  onCommit: (min: number | undefined, max: number | undefined) => void;
}

/** Two number boxes committed on Enter or blur. Remount with a new key when the applied range changes. */
function RangeInputs({
  label,
  min,
  max,
  unit,
  placeholderMin,
  placeholderMax,
  money = false,
  onCommit,
}: RangeInputsProps) {
  const show = (n: number | undefined) => (n === undefined ? '' : money ? formatNumber(n) : String(n));
  const [lo, setLo] = useState(show(min));
  const [hi, setHi] = useState(show(max));

  const commit = () => {
    const a = parseNumber(lo, money);
    const b = parseNumber(hi, money);
    if (a !== min || b !== max) onCommit(a, b);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    commit();
  };
  const onType = (set: (v: string) => void) => (v: string) => {
    if (!money) return set(v);
    const d = digitsOnly(v).slice(0, 12);
    set(d ? formatNumber(Number(d)) : '');
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
    >
      <Input
        size="sm"
        mono
        inputMode={money ? 'numeric' : 'decimal'}
        aria-label={`${label} từ`}
        placeholder={placeholderMin ?? 'Từ'}
        value={lo}
        onChange={(e) => onType(setLo)(e.target.value)}
        onBlur={commit}
        trailing={unit}
        enterKeyHint="done"
      />
      <span className="text-muted" aria-hidden>
        –
      </span>
      <Input
        size="sm"
        mono
        inputMode={money ? 'numeric' : 'decimal'}
        aria-label={`${label} đến`}
        placeholder={placeholderMax ?? 'Đến'}
        value={hi}
        onChange={(e) => onType(setHi)(e.target.value)}
        onBlur={commit}
        trailing={unit}
        enterKeyHint="done"
      />
      <button type="submit" className="sr-only">
        Áp dụng {label}
      </button>
    </form>
  );
}

interface FilterPanelProps {
  query: ListingQuery;
  onChange: (next: ListingQuery) => void;
  fields: readonly FilterField[];
  brands: readonly BrandCount[];
  /** Search page: let the shopper narrow to one category. */
  showCategory?: boolean;
  className?: string;
}

export function FilterPanel({ query, onChange, fields, brands, showCategory, className }: FilterPanelProps) {
  return (
    <div className={cn('flex flex-col divide-y divide-border', className)}>
      {showCategory && (
        <Section title="Danh mục">
          <div className="flex flex-wrap gap-1.5">
            {[undefined, ...CATEGORY_KEYS].map((key: CategoryKey | undefined) => {
              const active = query.category === key;
              return (
                <button
                  key={key ?? 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(setCategory(query, key))}
                  className={cn(
                    'focus-ring inline-flex h-8 items-center rounded-xs border px-2.5 text-sm transition-colors',
                    active
                      ? 'border-accent bg-accent/12 font-semibold text-fg'
                      : 'border-border text-muted hover:border-border-strong hover:text-fg',
                  )}
                >
                  {key ? CATEGORY_LABELS[key] : 'Tất cả'}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Tình trạng">
        <Checkbox
          label="Chỉ hiện hàng còn trong kho"
          checked={query.inStock}
          onCheckedChange={(c) => onChange(setInStock(query, c === true))}
        />
      </Section>

      <Section title="Khoảng giá">
        <RangeInputs
          key={`${query.minPrice}-${query.maxPrice}`}
          label="Giá"
          money
          unit="₫"
          min={query.minPrice}
          max={query.maxPrice}
          onCommit={(a, b) => onChange(setPriceRange(query, a, b))}
        />
      </Section>

      {brands.length > 0 && (
        <Section title="Thương hiệu">
          <CheckList
            options={brands.map((b) => ({ value: b.name, label: b.name, count: b.count }))}
            selected={query.brand}
            onToggle={(b) => onChange(toggleBrand(query, b))}
          />
        </Section>
      )}

      {fields.map(({ field, values }) => {
        if (field.type === 'number') {
          const nums = values.map((v) => Number(v.value)).filter(Number.isFinite);
          const lo = nums.length ? Math.min(...nums) : undefined;
          const hi = nums.length ? Math.max(...nums) : undefined;
          return (
            <Section key={field.key} title={field.label}>
              <RangeInputs
                key={`${query.specsMin[field.key]}-${query.specsMax[field.key]}`}
                label={field.label}
                unit={field.unit}
                min={query.specsMin[field.key]}
                max={query.specsMax[field.key]}
                placeholderMin={lo !== undefined ? `Từ ${formatNumber(lo)}` : undefined}
                placeholderMax={hi !== undefined ? `Đến ${formatNumber(hi)}` : undefined}
                onCommit={(a, b) => onChange(setSpecRange(query, field.key, a, b))}
              />
            </Section>
          );
        }
        return (
          <Section key={field.key} title={field.label}>
            <CheckList
              options={values.map((v) => ({
                value: v.value,
                label: facetValueLabel(field, v.value),
                count: v.count,
              }))}
              selected={query.specs[field.key] ?? []}
              onToggle={(v) => onChange(toggleSpecValue(query, field.key, v))}
            />
          </Section>
        );
      })}
    </div>
  );
}
