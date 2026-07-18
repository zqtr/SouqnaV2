/**
 * QAR price extraction from Instagram captions (and free-text chat
 * answers). Pure — used three ways:
 *
 *  1. As the deterministic backfill/cross-check after vision analysis
 *     (`normalizeDrafts` trusts a regex hit over a null from the model).
 *  2. As the zero-AI path for chat answers to price questions.
 *  3. Its rules are restated verbatim in the vision system prompt so the
 *     model and the regex agree on what counts as a price.
 *
 * Rules: a number only counts as a price when a QAR currency marker
 * (QAR, QR, q.r., ر.ق, ريال / ريال قطري, riyal) sits directly before or
 * after it. Bare numbers are ignored — Qatari phone numbers are 8 digits
 * and captions are full of order codes. Ranges ("200-250 QR") resolve to
 * the lower bound. Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) digits,
 * Arabic thousands/decimal separators (٬ ٫) and the Arabic comma (،) are
 * normalized first.
 */

export type QarPriceResult = { priceQar: number | null; dmForPrice: boolean };

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeArabicDigits(text: string): string {
  return text
    .replace(/[٠-٩]/gu, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/gu, (d) => String(EASTERN_ARABIC.indexOf(d)))
    .replace(/[٬،]/gu, ',')
    .replace(/٫/gu, '.');
}

// "1,200.50" | "1200" | "199.5" — thousands groups must be full triples so
// "55,12" never parses.
const NUM = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;
// Currency markers. `QR` is bounded on both sides so "QR code" URLs and
// "qrcode" never anchor a price; Arabic markers rely on number adjacency
// (JS \b is ASCII-only and useless around Arabic script).
const CUR = String.raw`QAR|Q\.?\s?R\.?s?|riyals?|ر\.?\s?ق(?!\p{L})|ريال(?:\s?قطري)?`;
const RANGE = String.raw`(?:\s*[-–—~]\s*(${NUM}))?`;

// "250 QR" / "200-250 ر.ق" — number(s) then marker.
const NUM_THEN_CUR = new RegExp(
  String.raw`(?<![\d.,])(${NUM})${RANGE}\s*(?:${CUR})(?![A-Za-z])`,
  'giu',
);
// "QAR 250" / "ر.ق ٢٥٠" — marker then number(s).
const CUR_THEN_NUM = new RegExp(
  String.raw`(?<![A-Za-z\p{L}])(?:${CUR})\s*[:\-]?\s*(${NUM})${RANGE}(?![\d.,])`,
  'giu',
);

// "DM for price", "price in DMs", "whatsapp for price" — needs both a
// channel word and a price word within one clause.
const DM_PRICE_EN =
  /(?:\b(?:dm|dms|inbox|whatsapp|whats\s?app|pm)\b[^.\n]{0,24}\bprices?\b)|(?:\bprices?\b[^.\n]{0,24}\b(?:dm|dms|inbox|whatsapp|whats\s?app|pm)\b)/iu;
// "السعر بالخاص" and friends. "بالخاص" alone ("in private") is the
// standard GCC sales-caption idiom, so it fires on its own.
const DM_PRICE_AR =
  /السعر\s*(?:بال|في\s*ال)?خاص|بالخاص|في\s*الخاص|(?:دايركت|واتساب|راسل\S*)\s*للسعر|للسعر\s*(?:دايركت|واتساب|خاص)/u;

function toPrice(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/gu, ''));
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null;
  return n;
}

export function parseQarPrice(text: string | null | undefined): QarPriceResult {
  if (!text) return { priceQar: null, dmForPrice: false };
  const normalized = normalizeArabicDigits(text);
  const dmForPrice = DM_PRICE_EN.test(normalized) || DM_PRICE_AR.test(normalized);

  const candidates: Array<{ index: number; price: number }> = [];
  for (const re of [NUM_THEN_CUR, CUR_THEN_NUM]) {
    re.lastIndex = 0;
    for (const match of normalized.matchAll(re)) {
      const low = toPrice(match[1] ?? '');
      const high = match[2] ? toPrice(match[2]) : null;
      const price = low !== null && high !== null ? Math.min(low, high) : (low ?? high);
      if (price !== null) candidates.push({ index: match.index ?? 0, price });
    }
  }
  candidates.sort((a, b) => a.index - b.index);
  return { priceQar: candidates[0]?.price ?? null, dmForPrice };
}
