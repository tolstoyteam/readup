import { supabase } from "@/shared/lib/supabase";

export type SearchHistoryEntry = {
  query: string;
  searchedAt: string;
};

const MAX_HISTORY = 10;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export async function recordSearch(userId: string, query: string): Promise<void> {
  const normalized = normalizeQuery(query);
  if (!normalized) return;
  const { error } = await supabase
    .from("user_search_history")
    .upsert(
      {
        user_id: userId,
        query: normalized,
        searched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,query" },
    );
  if (error && __DEV__) {
    console.warn("[recordSearch] failed", error.message);
  }
}

export async function fetchSearchHistory(userId: string): Promise<SearchHistoryEntry[]> {
  const { data, error } = await supabase
    .from("user_search_history")
    .select("query, searched_at")
    .eq("user_id", userId)
    .order("searched_at", { ascending: false })
    .limit(MAX_HISTORY);
  if (error) {
    if (__DEV__) console.warn("[fetchSearchHistory] failed", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => {
      if (
        !row ||
        typeof (row as { query?: unknown }).query !== "string" ||
        typeof (row as { searched_at?: unknown }).searched_at !== "string"
      ) {
        return null;
      }
      return {
        query: (row as { query: string }).query,
        searchedAt: (row as { searched_at: string }).searched_at,
      };
    })
    .filter((row): row is SearchHistoryEntry => !!row);
}

export async function removeSearchHistoryEntry(
  userId: string,
  query: string,
): Promise<void> {
  await supabase
    .from("user_search_history")
    .delete()
    .eq("user_id", userId)
    .eq("query", normalizeQuery(query));
}
