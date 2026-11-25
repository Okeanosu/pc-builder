'use client';

import { Label as LabelPrimitive } from 'radix-ui';
import { type ComponentPropsWithRef, createContext, type ReactNode, useContext, useId, useMemo } from 'react';
import { cn } from '@/lib/cn';

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}
const FieldContext = createContext<FieldContextValue | null>(null);

/** Reads the surrounding <Field> so custom controls can wire id / aria-describedby / aria-invalid. */
export function useField() {
  return useContext(FieldContext);
}

export function Label({ className, ...props }: ComponentPropsWithRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium text-fg peer-disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

interface FieldProps {
  label: ReactNode;
  /** Help text under the control. Hidden while an error is shown. */
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Provide when the control needs a stable id (e.g. for tests); otherwise generated. */
  id?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, required, id, className, children }: FieldProps) {
  const autoId = useId();
  const controlId = id ?? autoId;
  const messageId = `${controlId}-message`;
  const message = error ?? hint;
  const value = useMemo(
    () => ({ id: controlId, describedBy: message ? messageId : undefined, invalid: Boolean(error) }),
    [controlId, messageId, message, error],
  );
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={controlId}>
        {label}
        {required && (
          <span className="ms-0.5 text-danger-ink" aria-hidden>
            *
          </span>
        )}
      </Label>
      <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
      {message && (
        <p id={messageId} className={cn('text-xs', error ? 'font-medium text-danger-ink' : 'text-muted')}>
          {message}
        </p>
      )}
    </div>
  );
}

const SIZES = { sm: 'h-8 text-sm', md: 'h-10 text-sm', lg: 'h-12 text-base' } as const;

export const fieldFrame =
  'flex w-full shrink-0 items-center gap-2 rounded-sm border border-border-strong bg-surface px-3 text-fg transition-[border-color,box-shadow] duration-150 focus-within:border-fg focus-within:ring-1 focus-within:ring-fg has-[[aria-invalid=true]]:border-danger has-[[aria-invalid=true]]:ring-danger/20 has-disabled:cursor-not-allowed has-disabled:bg-surface-2 has-disabled:opacity-60 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  size?: keyof typeof SIZES;
  /** Icon or text before the value (e.g. a search icon). */
  leading?: ReactNode;
  /** Unit or action after the value (e.g. "₫"). */
  trailing?: ReactNode;
  /** Monospace digits for prices and spec values. */
  mono?: boolean;
  invalid?: boolean;
  wrapperClassName?: string;
}

export function Input({
  size = 'md',
  leading,
  trailing,
  mono,
  invalid,
  className,
  wrapperClassName,
  id,
  ...props
}: InputProps) {
  const field = useField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  return (
    <div className={cn(fieldFrame, SIZES[size], wrapperClassName)}>
      {leading}
      <input
        id={id ?? field?.id}
        aria-describedby={props['aria-describedby'] ?? field?.describedBy}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted disabled:cursor-not-allowed',
          mono && 'font-mono tabular-nums',
          className,
        )}
        {...props}
      />
      {trailing && <span className="shrink-0 text-sm text-muted">{trailing}</span>}
    </div>
  );
}

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, id, ...props }: TextareaProps) {
  const field = useField();
  const isInvalid = invalid ?? field?.invalid ?? false;
  return (
    <textarea
      id={id ?? field?.id}
      aria-describedby={props['aria-describedby'] ?? field?.describedBy}
      aria-invalid={isInvalid || undefined}
      className={cn(
        'min-h-24 w-full resize-y rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted focus:border-fg focus:ring-1 focus:ring-fg disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60 aria-invalid:border-danger aria-invalid:ring-danger/20',
        className,
      )}
      {...props}
    />
  );
}
