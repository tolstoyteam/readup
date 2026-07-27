/** Prepare book text for TTS without changing meaning (normalize unicode, drop unsupported chars). */
export function sanitizeTextForTts(text: string): string {
  let t = text.normalize("NFKC");

  t = t
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "—")
    .replace(/\u2026/g, "...")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Remove emoji and pictographs; keep letters, numbers, punctuation, whitespace.
  t = t.replace(/\p{Extended_Pictographic}/gu, "");

  // Strip control chars except newline and tab.
  t = t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return t.replace(/\s+\n/g, "\n").trim();
}
