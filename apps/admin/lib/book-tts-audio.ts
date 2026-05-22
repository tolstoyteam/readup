import { TTS_VOICE_IDS, type BookTtsAudio, type BookTtsVoicePaths } from "@readup/db";

export function mergeBookTtsPart(
  existing: BookTtsAudio | undefined,
  chunkIndex: number,
  paths: BookTtsVoicePaths,
): BookTtsAudio {
  const parts = { ...(existing?.parts ?? {}) };
  parts[String(chunkIndex)] = paths;
  return { parts, updated_at: new Date().toISOString() };
}

/** Chunk indexes that have all three voice files recorded in `tts_audio`. */
export function fullTtsChunkIndexes(tts: BookTtsAudio | undefined): number[] {
  if (!tts?.parts) return [];
  const out: number[] = [];
  for (const [key, paths] of Object.entries(tts.parts)) {
    if (!paths || typeof paths !== "object") continue;
    const ok = TTS_VOICE_IDS.every((v) => {
      const p = paths[v];
      return typeof p === "string" && p.length > 0;
    });
    if (ok) {
      const n = Number.parseInt(key, 10);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}
