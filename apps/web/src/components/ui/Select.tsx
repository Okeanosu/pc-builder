'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import type { ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';
import { useField } from './Input';
import { usePortalContainer } from './ThemeScope';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const SIZES = { sm: 'h-8 text-sm', md: 'h-10 text-sm', lg: 'h-12 text-base' } as const;

interface SelectProps extends Omit<ComponentPropsWithRef<typeof SelectPrimitive.Root>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
  size?: keyof typeof SIZES;
  invalid?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

export function Select({
  options,
  placeholder = 'Chọn…',
  size = 'md',
  invalid,
  id,
  className,
  'aria-label': ariaLabel,
  ...rootProps
}: SelectProps) {
  const field = useField();
  const container = usePortalContainer();
  const isInvalid = invalid ?? field?.invalid ?? false;
  return (
    <SelectPrimitive.Root {...rootProps}>
      <SelectPrimitive.Trigger
        id={id ?? field?.id}
        aria-label={ariaLabel}
        aria-describedby={field?.describedBy}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-sm border border-border-strong bg-surface px-3 text-start text-fg outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-fg focus-visible:ring-1 focus-visible:ring-fg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-danger/20 data-placeholder:text-muted',
          SIZES[size],
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal container={container}>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border bg-surface text-fg shadow-overlay data-[state=open]:animate-pop-in"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex h-9 cursor-default select-none items-center rounded-xs ps-8 pe-3 text-sm outline-none data-disabled:pointer-events-none data-highlighted:bg-surface-2 data-disabled:opacity-45 data-[state=checked]:font-semibold"
              >
                <SelectPrimitive.ItemIndicator className="absolute start-2 inline-flex">
                  <Check className="size-4 text-accent-ink" aria-hidden />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
