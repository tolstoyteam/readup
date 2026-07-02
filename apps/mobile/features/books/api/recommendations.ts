import { supabase, supabaseCoverPublicUrl } from "@/shared/lib/supabase";

export type RecommendedBook = {
  id: number;
  bookId: string;
  title: string;
  author: string;
  cover: string | null;
  genres: string[];
  matchScore: number;
};

type RecommendationRow = {
  id: number;
  book_id: string;
  title: string;
  author: string | null;
  cover_image_url: string | null;
  genres: string[] | null;
  match_score: number | null;
};

export async function fetchRecommendedBooks(limit = 12): Promise<RecommendedBook[]> {
  const { data, error } = await supabase.rpc("get_recommended_books", {
    p_limit: limit,
  });
  if (error) throw error;
  const rows = (data ?? []) as RecommendationRow[];
  return rows.map((row) => ({
    id: row.id,
    bookId: row.book_id,
    title: row.title,
    author: row.author ?? "",
    cover: supabaseCoverPublicUrl(row.cover_image_url ?? undefined),
    genres: Array.isArray(row.genres) ? row.genres : [],
    matchScore: row.match_score ?? 0,
  }));
}

export type TrendingBookRow = {
  work_id: string;
  book_id: string;
  reader_count: number;
  completion_count: number;
};

export async function fetchTrendingBookIds(limit = 10): Promise<TrendingBookRow[]> {
  const { data, error } = await supabase
    .from("book_trending")
    .select("work_id, book_id, reader_count, completion_count")
    .order("reader_count", { ascending: false })
    .limit(limit);
  if (error) {
    if (__DEV__) {
      console.warn("[fetchTrendingBookIds] view missing or RLS denied", error.message);
    }
    return [];
  }
  return (data ?? []) as TrendingBookRow[];
}
