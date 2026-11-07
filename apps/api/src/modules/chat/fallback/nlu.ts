import { MAX_BUDGET, MIN_BUDGET, type Preferences, type Purpose } from '@pc/shared';

export type WantsChange = 'cheaper' | 'stronger' | 'swap-gpu-brand' | 'swap-cpu-brand';

export interface ParsedIntent {
  budget?: number;
  budgetRange?: [number, number];
  purpose?: Purpose;
  preferences: Preferences;
  wantsChange?: WantsChange;
}

type CpuBrand = NonNullable<Preferences['cpuBrand']>;
type GpuBrand = NonNullable<Preferences['gpuBrand']>;

const MILLION = 1_000_000;
const STEP = 500_000;
const MAX_MILLIONS = MAX_BUDGET / MILLION;
/** A number not glued to a preceding letter/digit, so "B650M" or "RTX4060" never start an amount. */
const NUM = String.raw`(?<![a-z\d.,#])\d+(?:[.,]\d+)?`;

/** Lower-cased NFC text (keeps diacritics) and an ASCII-folded copy used by most patterns. */
interface Prepared {
  raw: string;
  low: string;
  norm: string;
}

export function foldVietnamese(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd');
}

const SHORT_NUMBER_BEFORE = /(?<![\p{L}\d.,])(\d{1,3}(?:[.,]\d+)?)\s*$/u;

/**
 * Folding merges "củ" (slang for a million) with "cũ" (used), "cụ", "cừ"…. "củ" always stays the money unit; an
 * unaccented "cu" only after a short number (≤ 200, not a model number, not after a component word) or a
 * Vietnamese number word; every other form becomes "cux", which matches nothing.
 */
function disambiguateCu(low: string): string {
  return low.replace(/(?<!\p{L})c[uùúủũụưừứửữự](?!\p{L})/gu, (word, offset: number) => {
    if (word === 'củ') return 'cu';
    if (word !== 'cu') return 'cux';
    const before = low.slice(0, offset);
    const number = SHORT_NUMBER_BEFORE.exec(before);
    if (number) {
      const afterProduct = PRODUCT_BEFORE.test(foldVietnamese(before.slice(0, number.index)));
      return toNum(number[1] ?? '0') <= MAX_MILLIONS && !afterProduct ? 'cu' : 'cux';
    }
    const lastWord = /(\p{L}+)\s*$/u.exec(before)?.[1];
    return lastWord && NUMBER_WORDS.has(foldVietnamese(lastWord)) ? 'cu' : 'cux';
  });
}

function prepare(text: string): Prepared {
  const low = disambiguateCu(
    text
      .toLowerCase()
      .normalize('NFC')
      .replace(/(?<![\p{L}\d])t[ỷỉ](?!\p{L})/gu, 'ty'),
  );
  return { raw: text, low, norm: foldVietnamese(low).replace(/\s+/g, ' ').trim() };
}

const toNum = (s: string) => Number.parseFloat(s.replace(',', '.'));
const roundStep = (n: number) => Math.round(n / STEP) * STEP;
const clamp = (n: number) => Math.min(MAX_BUDGET, Math.max(MIN_BUDGET, n));

// ---------- money ----------

interface Amount {
  value: number;
  start: number;
  /** Direction suggested by the word before the amount; resolved against the previous budget in parseIntent. */
  sign: -1 | 0 | 1;
  /** "verb" (thêm/bớt…) is always a delta; "comparative" (rẻ/mạnh hơn…) only for small amounts. */
  cue?: 'verb' | 'comparative';
  /** Preceded by "lên/xuống/còn/thành/tối đa": an explicit target, never reinterpreted as a delta. */
  anchored: boolean;
  /** A unit-less number with no budget cue ("25", "có 25"): only fills an empty budget. */
  bare?: boolean;
}

const UNIT_MULT: Record<string, number> = {
  trieu: MILLION,
  tr: MILLION,
  cu: MILLION,
  m: MILLION,
  ty: 1_000 * MILLION,
  nghin: 1_000,
  ngan: 1_000,
};

const DIGIT_WORDS: Record<string, number> = {
  khong: 0,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
};
const ONES_AFTER_TENS: Record<string, number> = { ...DIGIT_WORDS, tu: 4, lam: 5 };
const NUMBER_WORDS = new Set([...Object.keys(ONES_AFTER_TENS), 'muoi', 'tram', 'linh', 'le']);
const WORD_UNITS = new Set(['trieu', 'tr', 'cu', 'ty']);

/** Parses 1..999 written in Vietnamese words ("hai mươi lăm", "hai lăm", "một trăm linh năm"). */
export function parseVietnameseNumber(words: string[]): number | undefined {
  if (words.length === 0) return undefined;
  let i = 0;
  let total = 0;
  const hundreds = DIGIT_WORDS[words[0] ?? ''];
  if (hundreds !== undefined && words[1] === 'tram') {
    total = hundreds * 100;
    i = 2;
    if (words[i] === 'linh' || words[i] === 'le') {
      const ones = DIGIT_WORDS[words[i + 1] ?? ''];
      return ones !== undefined && i + 2 === words.length ? total + ones : undefined;
    }
  }
  let afterTens = false;
  const head = words[i];
  const tens = DIGIT_WORDS[head ?? ''];
  const next = words[i + 1] ?? '';
  if (head === 'muoi') {
    total += 10;
    i += 1;
    afterTens = true;
  } else if (tens !== undefined && tens >= 1 && next === 'muoi') {
    total += tens * 10;
    i += 2;
    afterTens = true;
  } else if (
    tens !== undefined &&
    tens >= 2 &&
    i + 2 === words.length &&
    ['lam', 'mot', 'tu'].includes(next)
  ) {
    return total + tens * 10 + (ONES_AFTER_TENS[next] ?? 0);
  }
  if (i < words.length) {
    const ones = (afterTens ? ONES_AFTER_TENS : DIGIT_WORDS)[words[i] ?? ''];
    if (ones === undefined) return undefined;
    total += ones;
    i += 1;
  }
  return i === words.length && total > 0 ? total : undefined;
}

const APPROX = String.raw`(?:\s+(?:tam|khoang|chung|co))?\s*$`;
const ABSOLUTE_BEFORE = new RegExp(String.raw`\b(len|xuong|con|thanh|toi da)${APPROX}`);
const VERB_MINUS_BEFORE = new RegExp(String.raw`\b(bot|giam|tru)(?:\s+(?:di|bot|them))?${APPROX}`);
const VERB_PLUS_BEFORE = new RegExp(String.raw`\b(them|tang|cong)(?:\s+them)?${APPROX}`);
const COMPARATIVE_MINUS_BEFORE = new RegExp(String.raw`\b(re hon|tiet kiem hon)${APPROX}`);
const COMPARATIVE_PLUS_BEFORE = new RegExp(
  String.raw`\b(manh hon|khoe hon|xin hon|tot hon|cao hon|dat hon)${APPROX}`,
);
/** A component/model word right before a number means it is a model or spec, not money ("ram 16 cu"). */
const PRODUCT_BEFORE =
  /\b(card|vga|gpu|rtx|gtx|rx|radeon|geforce|arc|ram|cpu|chip|ssd|hdd|nvme|main|mainboard|nguon|psu|case|tan nhiet|tan|man|monitor|i[3579]|ryzen|core|ultra)\s*$/;

/** What sits right before an amount: an anchor ("lên/còn"), a ± verb ("thêm/bớt") or a comparative ("rẻ hơn"). */
function amountContext(norm: string, start: number): Pick<Amount, 'sign' | 'cue' | 'anchored'> {
  const before = norm.slice(Math.max(0, start - 24), start);
  if (ABSOLUTE_BEFORE.test(before)) return { sign: 0, anchored: true };
  if (VERB_MINUS_BEFORE.test(before)) return { sign: -1, cue: 'verb', anchored: false };
  if (VERB_PLUS_BEFORE.test(before)) return { sign: 1, cue: 'verb', anchored: false };
  if (COMPARATIVE_MINUS_BEFORE.test(before)) return { sign: -1, cue: 'comparative', anchored: false };
  if (COMPARATIVE_PLUS_BEFORE.test(before)) return { sign: 1, cue: 'comparative', anchored: false };
  return { sign: 0, anchored: false };
}

function mask(s: string, start: number, end: number): string {
  return s.slice(0, start) + '#'.repeat(end - start) + s.slice(end);
}

/** 4+ digit integers in front of a million unit are GPU/CPU model numbers (3060, 4060, 1080, 7800), not budgets. */
const isModelNumber = (digits: string) => /^\d{4,}$/.test(digits);

interface Money {
  range?: [number, number];
  amounts: Amount[];
}

function extractMoney(norm: string): Money {
  let text = norm;
  const amounts: Amount[] = [];
  const consume = (start: number, end: number) => {
    text = mask(text, start, end);
  };
  const push = (value: number, start: number, end: number, bare = false) => {
    consume(start, end);
    amounts.push({ value, start, ...amountContext(norm, start), ...(bare ? { bare } : {}) });
  };

  for (const m of norm.matchAll(/(?<![\d.,])\d{1,3}([.,])\d{3}(?:\1\d{3})+(?!\d)/g)) {
    push(Number(m[0].replace(/[.,]/g, '')), m.index, m.index + m[0].length);
  }
  for (const m of text.matchAll(/(?<![\d.,#])\d{7,12}(?![\d.,])/g)) {
    push(Number(m[0]), m.index, m.index + m[0].length);
  }

  const range = new RegExp(
    String.raw`(${NUM})\s*(?:trieu|tr|cu|m)?\s*(?:-|–|—|~|den|toi)\s*(${NUM})\s*(trieu|tr|cu|m)(?![a-z])`,
  ).exec(text);
  if (range) {
    const a = toNum(range[1] ?? '0');
    const b = toNum(range[2] ?? '0');
    if (a > 0 && b > 0 && a <= MAX_MILLIONS && b <= MAX_MILLIONS) {
      return { range: [Math.min(a, b) * MILLION, Math.max(a, b) * MILLION], amounts };
    }
  }

  const unitRe = new RegExp(String.raw`(${NUM})\s*(trieu|tr|cu|ty)(\d{1,3})?(?![a-z\d])(\s+ruoi)?`, 'g');
  for (const m of text.matchAll(unitRe)) {
    const digits = m[1] ?? '0';
    const unit = m[2] ?? 'tr';
    const end = m.index + m[0].length;
    const productBefore = PRODUCT_BEFORE.test(norm.slice(Math.max(0, m.index - 16), m.index));
    if ((unit !== 'ty' && isModelNumber(digits)) || (unit === 'cu' && productBefore)) {
      consume(m.index, end);
      continue;
    }
    const frac = m[3] ? Number.parseFloat(`0.${m[3]}`) : 0;
    const half = m[4] ? 0.5 : 0;
    push((toNum(digits) + frac + half) * (UNIT_MULT[unit] ?? MILLION), m.index, end);
  }
  for (const m of text.matchAll(new RegExp(String.raw`(${NUM})m(?![a-z\d.])`, 'g'))) {
    const digits = m[1] ?? '0';
    const end = m.index + m[0].length;
    if (isModelNumber(digits) || PRODUCT_BEFORE.test(norm.slice(Math.max(0, m.index - 16), m.index))) {
      consume(m.index, end);
      continue;
    }
    push(toNum(digits) * MILLION, m.index, end);
  }
  for (const m of text.matchAll(new RegExp(String.raw`(${NUM})\s*(nghin|ngan)(?![a-z])`, 'g'))) {
    push(toNum(m[1] ?? '0') * 1_000, m.index, m.index + m[0].length);
  }

  const tokens = [...text.matchAll(/[a-z]+|\S/g)].map((m) => ({ t: m[0], i: m.index }));
  tokens.forEach((tok, idx) => {
    if (!WORD_UNITS.has(tok.t)) return;
    let from = idx;
    while (from > 0 && idx - from < 7 && NUMBER_WORDS.has(tokens[from - 1]?.t ?? '')) from -= 1;
    for (let s = from; s < idx; s += 1) {
      const n = parseVietnameseNumber(tokens.slice(s, idx).map((x) => x.t));
      if (n === undefined) continue;
      const half = tokens[idx + 1]?.t === 'ruoi' ? 0.5 : 0;
      const start = tokens[s]?.i ?? 0;
      amounts.push({
        value: (n + half) * (UNIT_MULT[tok.t] ?? MILLION),
        start,
        ...amountContext(norm, start),
      });
      return;
    }
  });

  if (amounts.length === 0) {
    const tail = String.raw`(?=\s*$|\s*[,.;!?]|\s+(?:thoi|nhe|nha|a|ha|thi|de|cho|choi|lam|dung)\b)`;
    const cuedMatch = new RegExp(
      String.raw`\b(?:ngan sach|budget|tam|khoang|duoi|tren|toi da|max)\s+(${NUM})${tail}`,
    ).exec(text);
    const cued = cuedMatch && !PRODUCT_BEFORE.test(norm.slice(0, cuedMatch.index)) ? cuedMatch : null;
    const loose =
      new RegExp(String.raw`\bco\s+(${NUM})${tail}`).exec(text) ?? /^(\d{1,3}(?:[.,]\d+)?)$/.exec(text);
    const hit = cued ?? loose;
    const n = hit ? toNum(hit[1] ?? '0') : 0;
    if (hit && n >= 3 && n <= MAX_MILLIONS) {
      push(n * MILLION, hit.index, hit.index + hit[0].length, hit !== cued);
    }
  }
  return { amounts };
}

// ---------- purpose ----------

const PURPOSE_PATTERNS: Record<Purpose, RegExp> = {
  gaming:
    /\b(choi game|game|games|gaming|gamer|valorant|pubg|lol|lien minh|cs ?go|cs2|fifa|fo4|fc online|gta|cyberpunk|elden ring|dota|genshin|minecraft|wukong|black myth|esports?|fps|apex|fortnite|overwatch|roblox|stream game)\b/g,
  graphics:
    /\b(do hoa|render|blender|premiere|after ?effects?|photoshop|lightroom|illustrator|edit video|edit anh|dung phim|dung video|lam video|chinh sua video|3d|3ds ?max|maya|autocad|cad|revit|sketchup|davinci|cinema ?4d|c4d|vray|thiet ke|design|designer|youtuber)\b/g,
  ai: /\b(tri tue nhan tao|deep learning|machine learning|hoc may|hoc sau|train model|train ai|training|llm|lap trinh|code|coding|coder|developer|dev|data science|khoa hoc du lieu|stable diffusion|pytorch|tensorflow|cuda|lam ai|chay ai|hoc ai|nganh ai|model ai|ai model|gen ai|ai\/ml|a\.i)\b/g,
  office:
    /\b(van phong|ke toan|word|excel|powerpoint|office|hoc tap|hoc online|hoc sinh|sinh vien|luot web|xem phim|youtube|zoom|google meet|ban hang|quan ly|giai tri nhe|soan thao|nhap lieu)\b/g,
};

/** Upper-case "AI" as a workload, not the user addressing the bot ("AI ơi", "bạn là AI"). */
function workloadAiMention(raw: string): number | undefined {
  for (const m of raw.matchAll(/(?<![A-Za-z])AI(?![A-Za-z])/g)) {
    const before = foldVietnamese(raw.slice(Math.max(0, m.index - 12), m.index).toLowerCase());
    const after = foldVietnamese(raw.slice(m.index + 2, m.index + 8).toLowerCase());
    if (/^\s*(oi|a\b|ha\b|\?)/.test(after) || /\b(ban|em|la|voi|hoi)\s*$/.test(before)) continue;
    return m.index;
  }
  return undefined;
}

function detectPurpose(p: Prepared): Purpose | undefined {
  let best: { purpose: Purpose; hits: number; first: number } | undefined;
  for (const purpose of Object.keys(PURPOSE_PATTERNS) as Purpose[]) {
    const matches = [...p.norm.matchAll(PURPOSE_PATTERNS[purpose])];
    let hits = matches.length;
    let first = matches[0]?.index ?? Number.POSITIVE_INFINITY;
    const aiAt = purpose === 'ai' ? workloadAiMention(p.raw) : undefined;
    if (aiAt !== undefined) {
      hits += 1;
      first = Math.min(first, aiAt);
    }
    if (hits === 0) continue;
    if (!best || hits > best.hits || (hits === best.hits && first < best.first)) {
      best = { purpose, hits, first };
    }
  }
  return best?.purpose;
}

// ---------- brands ----------

const NEGATIONS = new Set(['khong', 'ko', 'k', 'kg', 'hong', 'hok', 'chang', 'tranh', 'ghet']);
const GPU_CONTEXT = new Set(['card', 'vga', 'gpu']);
const CPU_CONTEXT = new Set(['cpu', 'chip', 'main', 'mainboard']);
const PUNCT = /^[,;.!?+/()]$/;

interface BrandMention {
  kind: 'cpu' | 'gpu';
  brand: CpuBrand | GpuBrand;
  index: number;
  negated: boolean;
}

function brandTokens(norm: string): string[] {
  return norm
    .replace(/\b(vi xu ly|bo xu ly)\b/g, 'cpu')
    .replace(/\bcard (do hoa|man hinh)\b/g, 'card')
    .replace(/([,;.!?+/()])/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean);
}

function lookBack(
  tokens: string[],
  index: number,
  span: number,
  pick: (t: string) => boolean,
): string | undefined {
  for (let j = index - 1; j >= 0 && index - j <= span; j -= 1) {
    const t = tokens[j] ?? '';
    if (PUNCT.test(t)) return undefined;
    if (pick(t)) return t;
  }
  return undefined;
}

function findBrands(tokens: string[]): BrandMention[] {
  const out: BrandMention[] = [];
  tokens.forEach((t, i) => {
    const next = tokens[i + 1] ?? '';
    const prev = tokens[i - 1] ?? '';
    let kind: BrandMention['kind'] | undefined;
    let brand: BrandMention['brand'] | undefined;
    if (t === 'ryzen' || t === 'threadripper') [kind, brand] = ['cpu', 'AMD'];
    else if (t === 'radeon' || /^rx\d{3,4}/.test(t) || (t === 'rx' && /^\d{3,4}/.test(next)))
      [kind, brand] = ['gpu', 'AMD'];
    else if (/^(rtx|gtx|geforce|quadro)(\d|$)/.test(t)) [kind, brand] = ['gpu', 'NVIDIA'];
    else if (t === 'arc' && (prev === 'intel' || /^[ab]\d{3}/.test(next))) [kind, brand] = ['gpu', 'Intel'];
    else if (
      /^i[3579](-?\d{3,5}[a-z]*)?$/.test(t) ||
      t === 'pentium' ||
      t === 'celeron' ||
      (t === 'core' && /^(i[3579]|ultra)/.test(next))
    )
      [kind, brand] = ['cpu', 'Intel'];
    else if (t === 'nvidia') [kind, brand] = ['gpu', 'NVIDIA'];
    else if (t === 'intel' && next !== 'arc') {
      const ctx = lookBack(tokens, i, 4, (x) => GPU_CONTEXT.has(x) || CPU_CONTEXT.has(x));
      [kind, brand] = [ctx && GPU_CONTEXT.has(ctx) ? 'gpu' : 'cpu', 'Intel'];
    } else if (t === 'amd') {
      const ctx = lookBack(tokens, i, 4, (x) => GPU_CONTEXT.has(x) || CPU_CONTEXT.has(x));
      [kind, brand] = [ctx && GPU_CONTEXT.has(ctx) ? 'gpu' : 'cpu', 'AMD'];
    }
    if (!kind || !brand) return;
    const negated = lookBack(tokens, i, 3, (x) => NEGATIONS.has(x)) !== undefined;
    out.push({ kind, brand, index: i, negated });
  });
  return out;
}

const otherCpu = (b?: CpuBrand): CpuBrand => (b === 'Intel' ? 'AMD' : b === 'AMD' ? 'Intel' : 'Intel');
const otherGpu = (b?: GpuBrand): GpuBrand => (b === 'AMD' || b === 'Intel' ? 'NVIDIA' : 'AMD');

// ---------- other preferences ----------

function isNegated(foldedBefore: string): boolean {
  return /\b(khong|ko|k|kg|hong|chang)\s+(can|co|dung|thich|muon|lay)?\s*$/.test(foldedBefore);
}

const COLOR_CONTEXT = '(?:mau sac|mau|case|vo|tong|full|all|build|setup|led|phong cach|may)';
const TRAILING_COLOR_CONTEXT = new RegExp(String.raw`(?:\b${COLOR_CONTEXT}\s+)+$`);

/** Diacritic forms are matched on `low` ("đen" ≠ "đến"); bare ASCII forms need a context word first. */
function detectColor(p: Prepared): Preferences['color'] {
  const folded = foldVietnamese(p.low);
  const hits: { color: 'white' | 'black'; at: number }[] = [];
  const add = (color: 'white' | 'black', at: number) => {
    const before = folded.slice(Math.max(0, at - 24), at).replace(TRAILING_COLOR_CONTEXT, '');
    if (!isNegated(before)) hits.push({ color, at });
  };
  for (const m of p.low.matchAll(/trắng|\bwhite\b/gu)) add('white', m.index);
  for (const m of p.low.matchAll(/(?<!\p{L})đen(?!\p{L})|\bblack\b/gu)) add('black', m.index);
  for (const m of folded.matchAll(new RegExp(String.raw`\b${COLOR_CONTEXT}\s+(trang|den)\b`, 'g'))) {
    add(m[1] === 'trang' ? 'white' : 'black', m.index + m[0].length - (m[1]?.length ?? 0));
  }
  hits.sort((a, b) => a.at - b.at);
  return hits.at(-1)?.color;
}

function detectResolution(norm: string): Preferences['resolution'] {
  if (/\b(4k|2160p|uhd)\b/.test(norm)) return '4k';
  if (/\b(2k|1440p|qhd|2[.,]5k|2k5)\b/.test(norm)) return '1440p';
  if (/\b(1080p|fhd|full ?hd)\b/.test(norm)) return '1080p';
  return undefined;
}

const RAM_SIZES = new Set([8, 16, 24, 32, 48, 64, 96, 128]);

function detectRam(norm: string): number | undefined {
  const m = /\bram\s*(\d{1,3})\s*(?:gb|g)?\b/.exec(norm) ?? /\b(\d{1,3})\s*(?:gb|g)\s*ram\b/.exec(norm);
  const n = m ? Number(m[1]) : 0;
  return RAM_SIZES.has(n) ? n : undefined;
}

function detectStorage(norm: string): number | undefined {
  const m =
    /\b(?:ssd|nvme|hdd|o cung|o)\s*(\d+(?:[.,]\d+)?)\s*(tb|gb)\b/.exec(norm) ??
    /\b(\d+(?:[.,]\d+)?)\s*(tb|gb)\s*(?:ssd|nvme|hdd)\b/.exec(norm);
  if (!m) return undefined;
  const gb = Math.round(toNum(m[1] ?? '0') * (m[2] === 'tb' ? 1000 : 1));
  return gb >= 128 ? gb : undefined;
}

function detectFormFactor(norm: string): Preferences['formFactor'] {
  if (/\b(mini[- ]?itx|itx)\b/.test(norm)) return 'ITX';
  if (/\b(m-?atx|micro[- ]?atx)\b/.test(norm)) return 'mATX';
  if (/\batx\b/.test(norm)) return 'ATX';
  return undefined;
}

function detectWifi(norm: string): boolean | undefined {
  const m = /\b(wifi|wi-fi|wi fi|wireless|khong day)\b/.exec(norm);
  if (!m) return undefined;
  return !isNegated(norm.slice(Math.max(0, m.index - 20), m.index));
}

function detectDiscreteGpu(norm: string): boolean | undefined {
  if (/\b(onboard|igpu|apu|card tich hop|do hoa tich hop)\b/.test(norm)) return false;
  if (/\b(khong|ko|k|chang)\s+can\s+(card|vga|gpu)\b/.test(norm)) return false;
  const m = /\b(card|vga|gpu)( do hoa)? roi\b/.exec(norm);
  if (!m) return undefined;
  return !isNegated(norm.slice(Math.max(0, m.index - 20), m.index));
}

// ---------- change requests ----------

const CHEAPER_RE =
  /\b(re hon|re chut|re lai|re bot|giam gia|giam ngan sach|bot tien|bot ngan sach|ha ngan sach|tiet kiem hon|dat qua|mac qua|it tien hon|thap hon|giam bot|bot di|giam di)\b/;
const STRONGER_RE =
  /\b(manh hon|khoe hon|xin hon|tot hon|ngon hon|cao cap hon|nang cap|manh nhat|tang ngan sach|them ngan sach|them tien|tang tien|cao hon)\b/;
const BUDGET_VERB_RE = /\b(giam|bot|ha|xuong|tang|len|nang|them|re hon|dat hon)\b/;

function comparativeDirection(norm: string): 'cheaper' | 'stronger' | undefined {
  const cheaper = CHEAPER_RE.exec(norm)?.index ?? Number.POSITIVE_INFINITY;
  const stronger = STRONGER_RE.exec(norm)?.index ?? Number.POSITIVE_INFINITY;
  if (cheaper === stronger) return undefined;
  return cheaper < stronger ? 'cheaper' : 'stronger';
}

function detectSwapTarget(p: Prepared, tokens: string[], brands: BrandMention[]): 'cpu' | 'gpu' | undefined {
  const verbLow = /đổi|chuyển|thay thế/.test(p.low);
  const verbNorm = /\b(doi|chuyen|thay) (sang|qua|bang|card|vga|gpu|cpu|chip|hang)\b/.test(p.norm);
  if (!verbLow && !verbNorm) return undefined;
  const verbIdx = tokens.findIndex((t) => t === 'doi' || t === 'chuyen' || t === 'thay');
  for (let i = Math.max(0, verbIdx + 1); i < tokens.length; i += 1) {
    const t = tokens[i] ?? '';
    const brand = brands.find((b) => b.index === i);
    if (GPU_CONTEXT.has(t) || brand?.kind === 'gpu') return 'gpu';
    if (CPU_CONTEXT.has(t) || brand?.kind === 'cpu') return 'cpu';
  }
  return undefined;
}

function omitUndefined<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

/** Rule-based Vietnamese intent parser used when Gemini is unavailable; merges onto the previous turn. */
export function parseIntent(text: string, previous?: ParsedIntent): ParsedIntent {
  const p = prepare(text);
  const money = extractMoney(p.norm);
  const tokens = brandTokens(p.norm);
  const brands = findBrands(tokens);
  const prevPrefs = previous?.preferences ?? {};

  const current: Preferences = omitUndefined({
    color: detectColor(p),
    resolution: detectResolution(p.norm),
    minRamGB: detectRam(p.norm),
    minStorageGB: detectStorage(p.norm),
    formFactor: detectFormFactor(p.norm),
    needWifi: detectWifi(p.norm),
    requireDiscreteGpu: detectDiscreteGpu(p.norm),
  });
  for (const b of brands) {
    if (b.kind === 'cpu')
      current.cpuBrand = b.negated ? otherCpu(b.brand as CpuBrand) : (b.brand as CpuBrand);
    else current.gpuBrand = b.negated ? otherGpu(b.brand as GpuBrand) : (b.brand as GpuBrand);
  }

  const prevBudget = previous?.budget;
  let budget = prevBudget;
  let budgetRange = previous?.budgetRange;
  let direction: 'cheaper' | 'stronger' | undefined;
  const phrase = comparativeDirection(p.norm);
  const phraseSign = phrase === 'cheaper' ? -1 : phrase === 'stronger' ? 1 : 0;
  // Verbs (thêm/bớt) are always deltas. Comparatives (rẻ/mạnh hơn), also when separated from the amount as in
  // "mạnh hơn bản trước 5 triệu", are deltas only for amounts below half the current budget; else a target.
  const resolveSign = (a: Amount): -1 | 0 | 1 => {
    if (prevBudget === undefined || a.anchored) return 0;
    if (a.cue === 'verb') return a.sign;
    const comparative = a.cue === 'comparative' ? a.sign : phraseSign;
    return comparative !== 0 && a.value < prevBudget / 2 ? comparative : 0;
  };
  const amounts = money.amounts
    .filter((a) => !(a.bare && prevBudget !== undefined))
    .map((a): Amount => ({ ...a, sign: resolveSign(a) }));
  const absolute = amounts.filter((a) => a.sign === 0);
  const deltas = amounts.filter((a) => a.sign !== 0);

  if (money.range) {
    budgetRange = [Math.min(money.range[0], MAX_BUDGET), Math.min(money.range[1], MAX_BUDGET)];
    budget = budgetRange[1];
  } else if (absolute.length > 0) {
    budget = Math.min(MAX_BUDGET, Math.max(...absolute.map((a) => a.value)));
    budgetRange = undefined;
    if (prevBudget && (phrase || BUDGET_VERB_RE.test(p.norm)) && budget !== prevBudget) {
      direction = budget < prevBudget ? 'cheaper' : 'stronger';
    }
  } else if (deltas.length > 0) {
    const delta = deltas.reduce((sum, a) => sum + a.sign * a.value, 0);
    direction = delta < 0 ? 'cheaper' : 'stronger';
    if (prevBudget) {
      budget = clamp(prevBudget + delta);
      budgetRange = undefined;
    }
  } else if (phrase) {
    direction = phrase;
    if (prevBudget) {
      budget = clamp(roundStep(prevBudget * (direction === 'cheaper' ? 0.9 : 1.1)));
      budgetRange = undefined;
    }
  }

  let wantsChange: WantsChange | undefined = direction;
  const swap = detectSwapTarget(p, tokens, brands);
  if (swap === 'gpu') {
    wantsChange = 'swap-gpu-brand';
    current.gpuBrand ??= otherGpu(prevPrefs.gpuBrand);
  } else if (swap === 'cpu') {
    wantsChange = 'swap-cpu-brand';
    current.cpuBrand ??= otherCpu(prevPrefs.cpuBrand);
  }

  return omitUndefined({
    budget,
    budgetRange,
    purpose: detectPurpose(p) ?? previous?.purpose,
    preferences: { ...prevPrefs, ...current },
    wantsChange,
  });
}
