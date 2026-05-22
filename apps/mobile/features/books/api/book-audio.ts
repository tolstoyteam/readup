import {
  getBookAudioStorageBucket,
  supabase,
  supabaseBookAudioPublicUrl,
} from "@/shared/lib/supabase";

export type BookAudioVoice = "nova" | "alloy" | "ash";

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

/**
 * Resolves a playable URL (signed when Storage policy allows it, otherwise public URL).
 */
export async function resolveBookAudioPlaybackUrl(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): Promise<string | null> {
  const source = await resolveBookAudioSourceForVoice(bookId, voice, partIndex);
  return source?.url ?? null;
}

export async function resolveBookAudioSource(
  bookId: string,
  preferredVoice: BookAudioVoice = "nova",
  partIndex = 0,
): Promise<ResolvedBookAudioSource | null> {
  const voices = [
    preferredVoice,
    ...BOOK_AUDIO_VOICES.map((v) => v.id).filter((v) => v !== preferredVoice),
  ];

  for (const voice of voices) {
    const source = await resolveBookAudioSourceForVoice(bookId, voice, partIndex);
    if (source) return source;
  }

  return null;
}

async function resolveBookAudioSourceForVoice(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): Promise<ResolvedBookAudioSource | null> {
  const path = bookAudioObjectPath(bookId, voice, partIndex);
  const bucket = getBookAudioStorageBucket();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (!error && data?.signedUrl) {
    return { voice, url: data.signedUrl };
  }

  const publicUrl = supabaseBookAudioPublicUrl(path);
  if (!publicUrl) return null;

  if (await publicAudioObjectExists(publicUrl)) {
    return { voice, url: publicUrl };
  }

  return null;
}

/**
 * Returns true if any known voice file exists for this book in the configured audio bucket.
 */
export async function bookHasAudioInStorage(bookId: string): Promise<boolean> {
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

/** Storage folder prefix: `book_<bookId>` (matches `book-audio` bucket layout). */
export function bookAudioFolderPrefix(bookId: string): string {
  const trimmed = bookId.trim();
  if (trimmed.startsWith("book_")) return trimmed;
  return `book_${trimmed}`;
}

/**
 * Object path for the first TTS segment (extend with more parts when needed).
 * Example: `book_<id>/tts/part-000-nova.mp3`
 */
export function bookAudioObjectPath(
  bookId: string,
  voice: BookAudioVoice,
  partIndex = 0,
): string {
  const folder = bookAudioFolderPrefix(bookId);
  const part = String(partIndex).padStart(3, "0");
  return `${folder}/tts/part-${part}-${voice}.mp3`;
}
