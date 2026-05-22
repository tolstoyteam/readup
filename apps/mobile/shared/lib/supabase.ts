import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

/** Prefer JWT anon key; newer projects may only set the publishable key. */
const supabasePublicKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
  "";

/** From app.config.ts `extra` (reads SUPABASE_* buckets at config time). */
const storageBucketFromExtra = (
  Constants.expoConfig?.extra?.supabaseBookCoversBucket as string | undefined
)?.trim();

const storageBucket =
  process.env.EXPO_PUBLIC_SUPABASE_BOOK_COVERS_BUCKET?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() ||
  storageBucketFromExtra ||
  process.env.SUPABASE_BOOK_COVERS_BUCKET?.trim() ||
  "public";

/**
 * Book-audio bucket id for Storage API and public URLs.
 * Prefer `app.config` `extra.supabaseBookAudioBucket` (from SUPABASE_BOOK_AUDIO_BUCKET at build time)
 * because non-EXPO_PUBLIC env vars are not available in the client bundle.
 */
export function getBookAudioStorageBucket(): string {
  const fromExtra = (
    Constants.expoConfig?.extra?.supabaseBookAudioBucket as string | undefined
  )?.trim();
  if (fromExtra) return fromExtra;
  return (
    process.env.EXPO_PUBLIC_SUPABASE_BOOK_AUDIO_BUCKET?.trim() || "book-audio"
  );
}

if (!supabaseUrl || !supabasePublicKey) {
  console.warn(
    "Supabase: set EXPO_PUBLIC_SUPABASE_URL and either EXPO_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabasePublicKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

function encodeStoragePath(path: string): string {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export function supabaseCoverPublicUrl(path: string | undefined): string | null {
  if (!path || !supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${storageBucket}/${encodeStoragePath(path)}`;
}

/** Full public URL for an object in the book-audio bucket (e.g. `book_<id>/tts/part-000-nova.mp3`). */
export function supabaseBookAudioPublicUrl(path: string | undefined): string | null {
  if (!path || !supabaseUrl) return null;
  const bucket = getBookAudioStorageBucket();
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(path)}`;
}
