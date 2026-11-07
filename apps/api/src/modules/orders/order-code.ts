import { customAlphabet } from 'nanoid';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Bank transfer content must survive banks that strip lowercase/punctuation, hence uppercase base32. */
export const newOrderCode = (() => {
  const suffix = customAlphabet(BASE32, 8);
  return () => `PCB${suffix()}`;
})();

/** Finds an order code inside free-form transfer content (banks may prepend/append their own text). */
export const ORDER_CODE_IN_TEXT = /PCB[A-Z2-7]{8}/;
const ORDER_CODE_EXACT = /^PCB[A-Z2-7]{8}$/;

export const isOrderCode = (value: string) => ORDER_CODE_EXACT.test(value);

export function findOrderCode(content: string): string | null {
  return ORDER_CODE_IN_TEXT.exec(content.toUpperCase())?.[0] ?? null;
}

/** Every distinct order code in the text, in order of appearance (customers sometimes paste a wrong one first). */
export function findOrderCodes(content: string): string[] {
  const all = content.toUpperCase().match(new RegExp(ORDER_CODE_IN_TEXT.source, 'g')) ?? [];
  return [...new Set(all)];
}
