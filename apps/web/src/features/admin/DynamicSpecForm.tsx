'use client';

import type { SpecField } from '@pc/shared';
import { Plus, X } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Field, Input, useField } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import type { FieldErrors } from './errors';
import {
  addNumberChip,
  isIntegerField,
  type SpecDraft,
  type SpecDraftValue,
  specPath,
} from './products/spec-form';

const COLOR_LABEL: Record<string, string> = { black: 'Đen', white: 'Trắng', other: 'Khác' };
const optionLabel = (field: SpecField, option: string) =>
  field.key === 'color' ? (COLOR_LABEL[option] ?? option) : option;

function Hint({ field }: { field: SpecField }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span className="font-mono">{field.key}</span>
      {(field.type === 'number' || field.type === 'number[]') && isIntegerField(field) && (
        <span>· số nguyên</span>
      )}
      {field.filterable && <span>· dùng làm bộ lọc</span>}
    </span>
  );
}

function SpecSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const field = useField();
  return (
    <button
      type="button"
      role="switch"
      id={field?.id}
      aria-checked={checked}
      aria-describedby={field?.describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="focus-ring group inline-flex h-10 w-fit items-center gap-3 rounded-sm text-sm text-fg disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-accent bg-accent' : 'border-border-strong bg-surface-3',
        )}
        aria-hidden
      >
        <span
          className={cn(
            'absolute size-4.5 rounded-full bg-surface shadow-raised transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
          )}
        />
      </span>
      <span>{checked ? 'Có' : 'Không'}</span>
    </button>
  );
}

function GroupField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required: boolean;
  error?: string;
  hint: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-describedby={`${id}-msg`}
      aria-invalid={Boolean(error) || undefined}
    >
      <legend className="mb-1.5 text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ms-0.5 text-danger-ink" aria-hidden>
            *
          </span>
        )}
      </legend>
      {children}
      <p id={`${id}-msg`} className={cn('text-xs', error ? 'font-medium text-danger-ink' : 'text-muted')}>
        {error ?? hint}
      </p>
    </fieldset>
  );
}

function NumberChips({
  field,
  value,
  onChange,
  disabled,
  error,
}: {
  field: SpecField;
  value: number[];
  onChange: (v: number[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [text, setText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const commit = () => {
    const res = addNumberChip(value, text, isIntegerField(field));
    setLocalError(res.error);
    if (!res.error) {
      onChange(res.list);
      setText('');
    }
  };
  return (
    <Field
      label={field.label}
      required={field.required}
      error={localError ?? error}
      hint={<Hint field={field} />}
    >
      <div className="flex flex-col gap-2">
        {value.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={`${field.label} đã nhập`}>
            {value.map((n) => (
              <li
                key={n}
                className="inline-flex h-7 items-center gap-1 rounded-xs border border-border bg-surface-2 ps-2 pe-1 text-xs text-fg tabular-nums"
              >
                {formatNumber(n)}
                {field.unit ? ` ${field.unit}` : ''}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((x) => x !== n))}
                  aria-label={`Bỏ ${n}`}
                  className="focus-ring inline-flex size-5 items-center justify-center rounded-xs text-muted hover:bg-surface-3 hover:text-fg"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            mono
            inputMode="decimal"
            value={text}
            disabled={disabled}
            placeholder="Nhập rồi nhấn Enter"
            wrapperClassName="min-w-0 shrink"
            trailing={field.unit}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
          />
          <Button
            variant="secondary"
            size="icon"
            onClick={commit}
            disabled={disabled || !text.trim()}
            aria-label={`Thêm giá trị ${field.label}`}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      </div>
    </Field>
  );
}

interface DynamicSpecFormProps {
  /** The category's spec_schema, in display order. */
  fields: SpecField[];
  value: SpecDraft;
  onChange: (key: string, value: SpecDraftValue) => void;
  /** Keyed by `specs.<key>`, as returned by the API's 422 details. */
  errors?: FieldErrors;
  disabled?: boolean;
  className?: string;
}

/** Renders one input per SpecField so a category's JSONB schema becomes an editable form. */
export function DynamicSpecForm({
  fields,
  value,
  onChange,
  errors = {},
  disabled,
  className,
}: DynamicSpecFormProps) {
  return (
    <div className={cn('grid gap-x-6 gap-y-5 sm:grid-cols-2', className)}>
      {fields.map((field) => {
        const error = errors[specPath(field.key)];
        const raw = value[field.key];
        switch (field.type) {
          case 'number':
            return (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                error={error}
                hint={<Hint field={field} />}
              >
                <Input
                  mono
                  inputMode="decimal"
                  autoComplete="off"
                  value={typeof raw === 'string' ? raw : ''}
                  disabled={disabled}
                  trailing={field.unit}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              </Field>
            );
          case 'string':
            return (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                error={error}
                hint={<Hint field={field} />}
              >
                <Input
                  value={typeof raw === 'string' ? raw : ''}
                  disabled={disabled}
                  autoComplete="off"
                  trailing={field.unit}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              </Field>
            );
          case 'boolean':
            return (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                error={error}
                hint={<Hint field={field} />}
              >
                <SpecSwitch
                  checked={raw === true}
                  disabled={disabled}
                  onChange={(v) => onChange(field.key, v)}
                />
              </Field>
            );
          case 'enum': {
            const current = typeof raw === 'string' ? raw : '';
            return (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                error={error}
                hint={<Hint field={field} />}
              >
                <div className="flex gap-2">
                  <Select
                    // Radix keeps showing the old value when `value` becomes ''; remount instead.
                    key={current === '' ? 'empty' : 'set'}
                    value={current || undefined}
                    onValueChange={(v) => onChange(field.key, v)}
                    options={(field.options ?? []).map((o) => ({ value: o, label: optionLabel(field, o) }))}
                    placeholder={`Chọn ${field.label.toLowerCase()}`}
                    disabled={disabled}
                  />
                  {!field.required && current && !disabled && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onChange(field.key, '')}
                      aria-label={`Bỏ chọn ${field.label}`}
                    >
                      <X aria-hidden />
                    </Button>
                  )}
                </div>
              </Field>
            );
          }
          case 'enum[]': {
            const list = Array.isArray(raw) ? (raw as string[]) : [];
            return (
              <GroupField
                key={field.key}
                label={field.label}
                required={field.required}
                error={error}
                hint={<Hint field={field} />}
              >
                <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                  {(field.options ?? []).map((option) => (
                    <Checkbox
                      key={option}
                      label={optionLabel(field, option)}
                      checked={list.includes(option)}
                      disabled={disabled}
                      aria-invalid={Boolean(error) || undefined}
                      onCheckedChange={(checked) =>
                        onChange(
                          field.key,
                          checked === true
                            ? (field.options ?? []).filter((o) => o === option || list.includes(o))
                            : list.filter((o) => o !== option),
                        )
                      }
                    />
                  ))}
                </div>
              </GroupField>
            );
          }
          case 'number[]':
            return (
              <NumberChips
                key={field.key}
                field={field}
                value={Array.isArray(raw) ? (raw as number[]) : []}
                onChange={(v) => onChange(field.key, v)}
                disabled={disabled}
                error={error}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
