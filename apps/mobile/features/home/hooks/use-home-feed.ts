import { useCallback, useEffect, useMemo, useState } from "react";

import { coverUrl, fetchBooks } from "@/features/books/api/books";
import { fetchGenres } from "@/features/books/api/genres";
import type { BookCardItem } from "@/features/books/components/book-card";
import {
  buildGenreFeedSections,
  genresFromBooks,
  type GenreOption,
} from "@/features/books/lib/genre-filters";
import {
  fetchRecommendedBooks,
  fetchTrendingBookIds,
  type RecommendedBook,
} from "@/features/books/api/recommendations";
import { useLibrary } from "@/features/library";
import { useReaderSettings } from "@/features/reader/settings/reader-settings-context";
import { useAuth } from "@/shared/context/auth-context";

export type HomeBook = BookCardItem & {
  genres: string[];
  workId: string;
};

export type HomeSection = {
  title: string;
  data: HomeBook[];
};

export function useHomeFeed() {
  const { user } = useAuth();
  const { settings, loaded: settingsLoaded } = useReaderSettings();
  const { continueBook: continueRecord, registerEditionMapping } = useLibrary();
  const [items, setItems] = useState<HomeBook[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [recommended, setRecommended] = useState<RecommendedBook[]>([]);
  const [trendingIds, setTrendingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const preferredLanguage = settingsLoaded ? settings.language : undefined;
      const [{ books }, recs, trending, catalogGenres] = await Promise.all([
        fetchBooks(preferredLanguage),
        user ? fetchRecommendedBooks(12).catch(() => []) : Promise.resolve([]),
        fetchTrendingBookIds(12).catch(() => []),
        fetchGenres().catch(() => null),
      ]);

      const mapped: HomeBook[] = books.map((r) => ({
        id: r.id,
        title: r.document.title,
        author: r.document.author,
        bookId: r.document.book_id,
        workId: r.document.work_id ?? r.document.book_id,
        cover: coverUrl(r.document.cover_image_path),
        genres: r.document.genres,
      }));

      setItems(mapped);
      for (const item of mapped) {
        registerEditionMapping(item.bookId, item.workId);
      }
      for (const row of books) {
        for (const edition of row.document.available_editions ?? []) {
          registerEditionMapping(
            edition.book_id,
            row.document.work_id ?? row.document.book_id,
          );
        }
      }
      setRecommended(recs);
      setTrendingIds(trending.map((row) => row.work_id || row.book_id));
      setGenres(catalogGenres ?? genresFromBooks(mapped));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load books");
      setItems([]);
      setRecommended([]);
      setTrendingIds([]);
      setGenres([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [settings.language, settingsLoaded, user, registerEditionMapping]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const continueBook = useMemo(() => {
    if (!continueRecord) return null;
    return (
      items.find((item) => item.workId === continueRecord.workId) ??
      items.find((item) => item.bookId === continueRecord.bookId) ??
      null
    );
  }, [continueRecord, items]);

  const sections = useMemo<HomeSection[]>(() => {
    const byBookId = new Map(items.map((item) => [item.bookId, item]));
    const byWorkId = new Map(items.map((item) => [item.workId, item]));

    const recommendedSection: HomeBook[] = recommended
      .map((rec) => byBookId.get(rec.bookId) ?? byWorkId.get(rec.bookId))
      .filter((item): item is HomeBook => !!item);

    const trendingSection: HomeBook[] = trendingIds
      .map((id) => byBookId.get(id) ?? byWorkId.get(id))
      .filter((item): item is HomeBook => !!item);

    const trendingFallback =
      trendingSection.length > 0 ? trendingSection : items.slice(0, 10);

    const genreSections = buildGenreFeedSections(items, genres).map(
      (section) => ({
        title: section.title,
        data: section.data,
      }),
    );

    return [
      { title: "Рекомендации", data: recommendedSection },
      { title: "В тренде", data: trendingFallback },
      ...genreSections,
    ].filter((section) => section.data.length > 0);
  }, [items, recommended, trendingIds, genres]);

  return {
    items,
    loading,
    refreshing,
    error,
    continueBook,
    sections,
    load,
    onRefresh,
  };
}
