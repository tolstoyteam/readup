import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured (set SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, or EXPO_PUBLIC_SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function getBookCoversBucket(): string {
  const b = process.env.SUPABASE_BOOK_COVERS_BUCKET?.trim();
  if (!b) {
    throw new Error("SUPABASE_BOOK_COVERS_BUCKET is not set (your Storage bucket name).");
  }
  return b;
}

/** Private bucket for generated TTS MP3s (optional — when unset, audio is only streamed, not stored). */
export function getBookAudioBucket(): string | null {
  const b = process.env.SUPABASE_BOOK_AUDIO_BUCKET?.trim();
  return b || null;
}
