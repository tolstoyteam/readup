import { TTS_VOICE_IDS, type TtsVoiceId } from "@readup/db";
import { getBookAudioSignedUrl } from "@/lib/book-audio-storage";
import { getBookWithContent } from "@/lib/book-relational";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

/**
 * Returns signed URLs for stored `tts_audio` paths (for the upload/edit page player).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return Response.json({ error: "Invalid book id" }, { status: 400 });
  }

  const book = await getBookWithContent(id);
  if (!book) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const parts = book.ttsAudio?.parts;
  if (!parts || typeof parts !== "object") {
    return Response.json({ previewUrls: {} as Record<string, Partial<Record<TtsVoiceId, string>>> });
  }

  const previewUrls: Record<string, Partial<Record<TtsVoiceId, string>>> = {};

  for (const [chunkKey, paths] of Object.entries(parts)) {
    if (!paths || typeof paths !== "object") continue;
    const chunkPreview: Partial<Record<TtsVoiceId, string>> = {};
    for (const voice of TTS_VOICE_IDS) {
      const p = paths[voice];
      if (typeof p !== "string" || !p.trim()) continue;
      const url = await getBookAudioSignedUrl(p.trim());
      if (url) chunkPreview[voice] = url;
    }
    if (Object.keys(chunkPreview).length > 0) {
      previewUrls[chunkKey] = chunkPreview;
    }
  }

  return Response.json({ previewUrls });
}
