import type { QuoteRange } from "@/features/quotes/lib/quote-types";

export type HighlightSegment = {
  text: string;
  highlighted: boolean;
  quoteId?: string;
  emphasize?: boolean;
};

function mergeRanges(ranges: QuoteRange[]): QuoteRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: QuoteRange[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
      if (current.emphasize) {
        last.emphasize = true;
      }
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

export function buildHighlightSegments(
  text: string,
  ranges: QuoteRange[],
): HighlightSegment[] {
  if (ranges.length === 0) {
    return [{ text, highlighted: false }];
  }

  const merged = mergeRanges(ranges);
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of merged) {
    const start = Math.max(0, Math.min(range.start, text.length));
    const end = Math.max(start, Math.min(range.end, text.length));
    if (start > cursor) {
      segments.push({
        text: text.slice(cursor, start),
        highlighted: false,
      });
    }
    if (end > start) {
      segments.push({
        text: text.slice(start, end),
        highlighted: true,
        quoteId: range.quoteId,
        emphasize: range.emphasize,
      });
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      highlighted: false,
    });
  }

  return segments.length > 0 ? segments : [{ text, highlighted: false }];
}

export function selectionTextFromOffsets(
  text: string,
  start: number,
  end: number,
): string {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  return text.slice(safeStart, safeEnd).trim();
}
