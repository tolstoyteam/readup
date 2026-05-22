import { getBookCoversBucket, getSupabaseAdmin } from "@/lib/supabase-storage";

const DEFAULT_TTL_SEC = 3600;

/**
 * Returns a time-limited URL for a private bucket object, or null if storage is not configured or the call fails.
 */
export async function getCoverImageSignedUrl(
  path: string,
  expiresSec: number = DEFAULT_TTL_SEC,
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getBookCoversBucket();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresSec);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
