'use client';

import { Input, type InputProps } from '@/components/ui/Input';

const groups = new Intl.NumberFormat('vi-VN');

/** Integer VND input shown with vi-VN grouping ("12.290.000"); emits a number or null. */
export function MoneyInput({
  value,
  onValueChange,
  ...props
}: Omit<InputProps, 'value' | 'onChange' | 'type'> & {
  value: number | null;
  onValueChange: (v: number | null) => void;
}) {
  return (
    <Input
      {...props}
      className="tabular-nums"
      inputMode="numeric"
      autoComplete="off"
      trailing="₫"
      value={value === null ? '' : groups.format(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
        onValueChange(digits ? Number(digits) : null);
      }}
    />
  );
}
