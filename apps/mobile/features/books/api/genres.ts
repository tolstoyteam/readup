import { genreRuLabel, isBookGenre } from "@readup/db";

import type { GenreOption } from "@/features/books/lib/genre-filters";
import { sortGenresByLabel } from "@/features/books/lib/genre-filters";
import { supabase } from "@/shared/lib/supabase";

type GenreRow = {
  name: string;
  name_ru: string | null;
};

export async function fetchGenres(): Promise<GenreOption[]> {
  const { data, error } = await supabase
    .from("genres")
    .select("name, name_ru")
    .order("name_ru", { ascending: true });

  if (error) throw error;

  const genres = (data as GenreRow[] | null ?? []).map((row) => {
    const slug = row.name.trim();
    const labelRu =
      (row.name_ru ?? "").trim() ||
      (isBookGenre(slug) ? genreRuLabel(slug) : slug);
    return { slug, labelRu };
  });

  return sortGenresByLabel(genres);
}
