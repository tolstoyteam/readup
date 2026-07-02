import {
  type BookTtsAudio,
  type BookTtsVoicePaths,
  type TtsVoiceId,
} from "@readup/db";
import {
  getBookAudioStorageBucket,
  supabase,
  supabaseBookAudioPublicUrl,
} from "@/shared/lib/supabase";

export type BookAudioVoice = TtsVoiceId;

export const BOOK_AUDIO_VOICES: { id: BookAudioVoice; label: string }[] = [
  { id: "nova", label: "Nova" },
  { id: "alloy", label: "Alloy" },
  { id: "ash", label: "Ash" },
];

const SIGNED_URL_TTL_SEC = 21_600; // 6 hours

export type ResolvedBookAudioSource = {
  voice: BookAudioVoice;
  url: string;
};

function parseNumericBookId(bookId: string): number | null {
  const id = Number(bookId.trim());
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

function voiceOrder(preferred: BookAudioVoice): BookAudioVoice[] {
  return [
    preferred,
    ...BOOK_AUDIO_VOICES.map((v) => v.id).filter((v) => v !== preferred),
  ];
}

/**
 * Loads canonical TTS metadata from `books.tts_audio`.
 */
export async function fetchBookTtsAudio(
  bookId: string,
): Promise<BookTtsAudio | null> {
  const numericId = parseNumericBookId(bookId);
  if (numericId === null) return null;

  const { data, error } = await supabase
    .from("books")
    .select("tts_audio")
    .eq("id", numericId)
    .maybeSingle();

  if (error || !data) return null;

  const tts = (data as { tts_audio?: BookTtsAudio | null }).tts_audio;
  if (!tts?.parts || typeof tts.parts !== "object") return null;
  return tts;
}

/**
 * Resolves a playable URL for a storage object path (signed URL, then public HEAD).
 */
export async function resolvePlaybackUrlForStoragePath(
  path: string,
): Promise<string | null> {
  const trimmed = path.trim();
  if (!trimmed) return null;

  const bucket = getBookAudioStorageBucket();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(trimmed, SIGNED_URL_TTL_SEC);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  const publicUrl = supabaseBookAudioPublicUrl(trimmed);
  if (!publicUrl) return null;

  if (await publicAudioObjectExists(publicUrl)) {
    return publicUrl;
  }

  return null;
}

async function resolveFromTtsMetadata(
  tts: BookTtsAudio,
  preferredVoice: BookAudioVoice,
  partIndex: number,
): Promise<ResolvedBookAudioSource | null> {
  const partKey = String(partIndex);
  let paths: BookTtsVoicePaths | undefined = tts.parts[partKey];

  if (!paths && partIndex === 0) {
    const firstKey = Object.keys(tts.parts).sort((a, b) => Number(a) - Number(b))[0];
    if (firstKey != null) paths = tts.parts[firstKey];
  }

  if (!paths || typeof paths !== "object") return null;

  for (const voice of voiceOrder(preferredVoice)) {
    const storagePath = paths[voice];
    if (typeof storagePath !== "string" || !storagePath.trim()) continue;
    const url = await resolvePlaybackUrlForStoragePath(storagePath);
    if (url) return { voice, url };
  }

  return null;
}

/**
 * Resolves a playable URL (signed when Storage policy allows it, otherwise public URL).
 */
export async function resolveBookAudioPlaybackUrl(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): Promise<string | null> {
  const source = await resolveBookAudioSource(bookId, voice, partIndex);
  return source?.url ?? null;
}

export async function resolveBookAudioSource(
  bookId: string,
  preferredVoice: BookAudioVoice = "nova",
  partIndex = 0,
): Promise<ResolvedBookAudioSource | null> {
  const tts = await fetchBookTtsAudio(bookId);
  if (tts) {
    const fromDb = await resolveFromTtsMetadata(tts, preferredVoice, partIndex);
    if (fromDb) return fromDb;
  }

  for (const voice of voiceOrder(preferredVoice)) {
    for (const path of guessedStoragePaths(bookId, voice, partIndex)) {
      const url = await resolvePlaybackUrlForStoragePath(path);
      if (url) return { voice, url };
    }
  }

  return null;
}

/**
 * Returns true if any known voice file exists for this book in the configured audio bucket.
 */
export async function bookHasAudioInStorage(bookId: string): Promise<boolean> {
  const tts = await fetchBookTtsAudio(bookId);
  if (tts?.parts && Object.keys(tts.parts).length > 0) {
    return true;
  }
  return (await resolveBookAudioSource(bookId)) != null;
}

async function publicAudioObjectExists(url: string): Promise<boolean> {
  try {
    let res = await fetch(url, { method: "HEAD" });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { headers: { Range: "bytes=0-0" } });
    }
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
}

/** Admin layout: `editions/{numericBookId}/tts/part-000-nova.mp3` */
export function adminTtsObjectPath(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): string {
  const numericId = parseNumericBookId(bookId) ?? bookId.trim();
  const part = String(partIndex).padStart(3, "0");
  return `editions/${numericId}/tts/part-${part}-${voice}.mp3`;
}

export function legacyAdminTtsObjectPath(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): string {
  const numericId = parseNumericBookId(bookId) ?? bookId.trim();
  const part = String(partIndex).padStart(3, "0");
  return `${numericId}/tts/part-${part}-${voice}.mp3`;
}

/** Legacy guessed layout: `book_{id}/tts/part-000-nova.mp3` */
export function legacyBookAudioObjectPath(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): string {
  const trimmed = bookId.trim();
  const folder = trimmed.startsWith("book_") ? trimmed : `book_${trimmed}`;
  const part = String(partIndex).padStart(3, "0");
  return `${folder}/tts/part-${part}-${voice}.mp3`;
}

function guessedStoragePaths(
  bookId: string,
  voice: BookAudioVoice,
  partIndex: number,
): string[] {
  const admin = adminTtsObjectPath(bookId, voice, partIndex);
  const legacyAdmin = legacyAdminTtsObjectPath(bookId, voice, partIndex);
  const legacy = legacyBookAudioObjectPath(bookId, voice, partIndex);
  return [...new Set([admin, legacyAdmin, legacy])];
}

/** @deprecated Use adminTtsObjectPath; kept for callers that import the old name. */
export function bookAudioObjectPath(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): string {
  return adminTtsObjectPath(bookId, voice, partIndex);
}

/** @deprecated Use legacyBookAudioObjectPath for the prefixed folder convention. */
export function bookAudioFolderPrefix(bookId: string): string {
  const trimmed = bookId.trim();
  if (trimmed.startsWith("book_")) return trimmed;
  return `book_${trimmed}`;
}
