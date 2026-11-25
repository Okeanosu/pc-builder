export interface VietQrInput {
  bankBin: string;
  accountNo: string;
  accountName: string;
  /** Integer VND. */
  amount: number;
  /** Transfer content the customer's banking app pre-fills; we use the order code. */
  addInfo: string;
}

export function buildVietQrUrl(input: VietQrInput): string {
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    throw new Error(`VietQR amount must be a non-negative integer, got ${input.amount}`);
  }
  const path = `${encodeURIComponent(input.bankBin)}-${encodeURIComponent(input.accountNo)}-compact2.png`;
  const query = [
    `amount=${input.amount}`,
    `addInfo=${encodeURIComponent(input.addInfo)}`,
    `accountName=${encodeURIComponent(input.accountName)}`,
  ].join('&');
  return `https://img.vietqr.io/image/${path}?${query}`;
}
