const vnd = new Intl.NumberFormat('vi-VN');

/** 25000000 → "25.000.000₫" */
export function formatVnd(amount: number): string {
  return `${vnd.format(Math.round(amount))}₫`;
}

/** Compact million-based label used on chips and summaries (one decimal place). */
export function formatVndShort(amount: number): string {
  if (amount >= 1_000_000) {
    const m = Math.round((amount / 1_000_000) * 10) / 10;
    return `${new Intl.NumberFormat('vi-VN').format(m)} triệu`;
  }
  return formatVnd(amount);
}
