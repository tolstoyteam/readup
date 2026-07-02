import { supabase } from "@/shared/lib/supabase";

const workIdCache = new Map<string, string>();

export async function resolveWorkId(bookId: string): Promise<string | null> {
  const trimmed = bookId.trim();
  if (!trimmed) return null;

  const cached = workIdCache.get(trimmed);
  if (cached) return cached;

  const numericId = Number(trimmed);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    workIdCache.set(trimmed, trimmed);
    return trimmed;
  }

  const { data, error } = await supabase
    .from("books")
    .select("work_id")
    .eq("id", numericId)
    .maybeSingle();

  if (error) throw error;
  const workId =
    typeof (data as { work_id?: string | null } | null)?.work_id === "string"
      ? (data as { work_id: string }).work_id
      : trimmed;

  workIdCache.set(trimmed, workId);
  return workId;
}

export function buildEditionToWorkMap(
  editions: Array<{ bookId: string; workId: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const edition of editions) {
    map.set(edition.bookId, edition.workId);
    workIdCache.set(edition.bookId, edition.workId);
  }
  return map;
}

export function clearWorkIdCache(): void {
  workIdCache.clear();
}
