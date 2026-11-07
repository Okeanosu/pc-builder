import type { LlmMessage } from './llm/types';

/** A VND amount written in assistant text. `approximate` = written with a unit word (triệu, tr, tỷ, nghìn). */
export interface PriceMention {
  text: string;
  amount: number;
  approximate: boolean;
}

/** Stored on the assistant row of an AI-mode turn; the reply text itself is never changed. */
export interface PriceCheck {
  mentions: number;
  unmatched: Array<{ text: string; amount: number }>;
}

const NUMBER = String.raw`\d+(?:[.,]\d+)*`;
// One number or a range ("20-25"), then an optional unit; the lookarounds keep "RTX 4060", "750W", "2K" out.
const AMOUNT = new RegExp(
  String.raw`(?<![\p{L}\p{N}.,])(${NUMBER})(?:\s*[-–]\s*(${NUMBER}))?(?:\s*(triệu|tr|tỷ|tỉ|nghìn|ngàn|₫|đồng|đ|vnđ|vnd))?(?![\p{L}\p{N}])`,
  'giu',
);
const UNIT_MULTIPLIER: Record<string, number> = {
  triệu: 1e6,
  tr: 1e6,
  tỷ: 1e9,
  tỉ: 1e9,
  nghìn: 1e3,
  ngàn: 1e3,
};
const THOUSANDS = /^\d{1,3}(?:([.,])\d{3})(?:\1\d{3})*$/;
const MILLIONS_GROUPED = /^\d{1,3}([.,])\d{3}\1\d{3}(?:\1\d{3})*$/;

/** "24.850.000" and "1.500" are thousands groups; "24,5" and "21.3" are decimals. */
function toNumber(raw: string): number {
  return THOUSANDS.test(raw) ? Number(raw.replace(/[.,]/g, '')) : Number(raw.replace(',', '.'));
}

export function extractVndAmounts(text: string): PriceMention[] {
  const out: PriceMention[] = [];
  for (const m of text.matchAll(AMOUNT)) {
    const [whole, first, second, rawUnit] = m;
    const unit = rawUnit?.toLowerCase();
    const numbers = second === undefined ? [first!] : [first!, second];
    const multiplier = unit ? (UNIT_MULTIPLIER[unit] ?? 1) : 1;
    const approximate = unit !== undefined && unit in UNIT_MULTIPLIER;
    for (const raw of numbers) {
      // Without a unit only an unmistakable money figure counts: at least two thousands groups.
      if (!unit && !MILLIONS_GROUPED.test(raw)) continue;
      const amount = Math.round(toNumber(raw) * multiplier);
      if (Number.isFinite(amount) && amount > 0) out.push({ text: whole.trim(), amount, approximate });
    }
  }
  return out;
}

const TOLERANCE = 0.01;
const MILLION = 1_000_000;

/** Within ±1% of a known amount, or (for "25 triệu"-style mentions) equal to it rounded to the triệu. */
export function isKnownAmount(mention: PriceMention, known: readonly number[]): boolean {
  return known.some(
    (k) =>
      k > 0 &&
      (Math.abs(mention.amount - k) <= TOLERANCE * k ||
        (mention.approximate && Math.round(k / MILLION) * MILLION === mention.amount)),
  );
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Amounts a reply may legitimately quote without being stated literally by a tool. */
function derived(o: Record<string, unknown>, out: number[]): void {
  if (typeof o.totalPrice === 'number' && isRecord(o.allocation)) {
    for (const share of Object.values(o.allocation)) {
      if (typeof share === 'number') out.push(Math.round(share * o.totalPrice));
    }
  }
  if (!Array.isArray(o.builds)) return;
  const totals = o.builds.flatMap((b) =>
    isRecord(b) && typeof b.totalPrice === 'number' ? [b.totalPrice] : [],
  );
  if (typeof o.budget === 'number') for (const t of totals) out.push(o.budget - t);
  for (const [i, a] of totals.entries()) for (const b of totals.slice(i + 1)) out.push(Math.abs(a - b));
}

function collect(value: unknown, out: number[]): void {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) out.push(value);
  } else if (typeof value === 'string') {
    for (const m of extractVndAmounts(value)) out.push(m.amount);
  } else if (Array.isArray(value)) {
    for (const v of value) collect(v, out);
  } else if (isRecord(value)) {
    for (const v of Object.values(value)) collect(v, out);
    derived(value, out);
  }
}

/**
 * Every amount the model was given: this turn's tool arguments and results, tool data and customer messages
 * already in the history, and the customer's new message. Earlier model text is left out on purpose, so a past
 * invented price cannot vouch for itself.
 */
export function referenceAmounts(sources: {
  toolCalls: ReadonlyArray<{ args: Record<string, unknown>; response: Record<string, unknown> }>;
  history?: readonly LlmMessage[];
  userText?: string;
}): number[] {
  const out: number[] = [];
  for (const call of sources.toolCalls) collect([call.args, call.response], out);
  for (const message of sources.history ?? []) {
    for (const part of message.parts) {
      if ('functionCall' in part) collect(part.functionCall.args, out);
      else if ('functionResponse' in part) collect(part.functionResponse.response, out);
      else if (message.role === 'user') collect(part.text, out);
    }
  }
  if (sources.userText) collect(sources.userText, out);
  return out;
}

export function checkPriceMentions(text: string, known: readonly number[]): PriceCheck {
  const mentions = extractVndAmounts(text);
  return {
    mentions: mentions.length,
    unmatched: mentions
      .filter((m) => !isKnownAmount(m, known))
      .map(({ text: mentionText, amount }) => ({ text: mentionText, amount })),
  };
}
