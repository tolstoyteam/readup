import { useRouter } from "expo-router";
import { Search as SearchIcon, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { coverUrl, fetchBooks } from "@/features/books/api/books";
import { fetchGenres } from "@/features/books/api/genres";
import {
  BookCard,
  type BookCardItem,
} from "@/features/books/components/book-card";
import {
  bookMatchesGenres,
  genresBySlugs,
  genresFromBooks,
  type GenreOption,
} from "@/features/books/lib/genre-filters";
import {
  fetchUserLibrary,
  removeLibraryItem,
  setLibraryStatus,
} from "@/features/library/api/library";
import { GenreChipRow } from "@/features/search/components/genre-chip-row";
import {
  fetchSearchHistory,
  recordSearch,
  removeSearchHistoryEntry,
  type SearchHistoryEntry,
} from "@/features/search/api/search-history";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

type SearchBook = BookCardItem & {
  genres: string[];
};

export default function SearchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<SearchBook[]>([]);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [query, setQuery] = useState("");
  const [selectedGenreSlugs, setSelectedGenreSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const recordDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [{ books: rows }, catalogGenres] = await Promise.all([
        fetchBooks(),
        fetchGenres().catch(() => null),
      ]);

      const mapped: SearchBook[] = rows.map((row) => ({
        id: row.id,
        bookId: row.document.book_id,
        title: row.document.title,
        author: row.document.author,
        cover: coverUrl(row.document.cover_image_path),
        genres: row.document.genres,
      }));

      setBooks(mapped);
      setGenres(catalogGenres ?? genresFromBooks(mapped));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load books");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      setHistory([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchUserLibrary(user.id, "saved").catch(() => []),
      fetchSearchHistory(user.id).catch(() => []),
    ]).then(([items, entries]) => {
      if (cancelled) return;
      setSavedIds(new Set(items.map((item) => item.book_id)));
      setHistory(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    if (recordDebounceRef.current) clearTimeout(recordDebounceRef.current);
    recordDebounceRef.current = setTimeout(() => {
      void recordSearch(user.id, trimmed).then(() => {
        fetchSearchHistory(user.id)
          .then((entries) => setHistory(entries))
          .catch(() => undefined);
      });
    }, 1200);
    return () => {
      if (recordDebounceRef.current) clearTimeout(recordDebounceRef.current);
    };
  }, [query, user]);

  async function clearHistoryEntry(entry: SearchHistoryEntry) {
    if (!user) return;
    setHistory((prev) => prev.filter((row) => row.query !== entry.query));
    try {
      await removeSearchHistoryEntry(user.id, entry.query);
    } catch {
      /* ignore */
    }
  }

  const selectedSlugsSet = useMemo(
    () => new Set(selectedGenreSlugs),
    [selectedGenreSlugs],
  );

  const selectedGenreOptions = useMemo(
    () => genresBySlugs(genres, selectedGenreSlugs),
    [genres, selectedGenreSlugs],
  );

  function toggleGenre(slug: string) {
    setSelectedGenreSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    );
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesText =
        !needle ||
        book.title.toLowerCase().includes(needle) ||
        book.author?.toLowerCase().includes(needle);

      const matchesGenres = bookMatchesGenres(
        book,
        selectedGenreOptions,
        "and",
      );

      return matchesText && matchesGenres;
    });
  }, [books, query, selectedGenreOptions]);

  function openBook(item: BookCardItem) {
    router.push(`/book/${encodeURIComponent(item.bookId)}`);
  }

  async function toggleSavedBook(item: BookCardItem) {
    if (!user) return;
    const wasSaved = savedIds.has(item.bookId);

    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) {
        next.delete(item.bookId);
      } else {
        next.add(item.bookId);
      }
      return next;
    });

    try {
      if (wasSaved) {
        await removeLibraryItem(user.id, item.bookId);
      } else {
        await setLibraryStatus(user.id, item.bookId, "saved");
      }
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) {
          next.add(item.bookId);
        } else {
          next.delete(item.bookId);
        }
        return next;
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${item.bookId}`}
        numColumns={2}
        columnWrapperClassName="gap-5 px-8"
        contentContainerClassName="gap-6 pb-8"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-5 px-8 pt-8">
            <View className="flex-row items-center justify-between">
              <ReadupLogo />
              <Text className="text-[22px] font-semibold tracking-[-0.88px] text-[#1A2420]">
                Search
              </Text>
            </View>

            <View className="h-12 flex-row items-center gap-2 rounded-[30px] border border-[#E8E6D8] bg-[#F2F0E6] px-4">
              <SearchIcon size={18} color={ReadupColors.textTertiary} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by title or author"
                placeholderTextColor={ReadupColors.textTertiary}
                className="flex-1 text-[14px] tracking-[-0.56px] text-[#1A2420]"
                autoCapitalize="none"
              />
            </View>

            {genres.length > 0 ? (
              <GenreChipRow
                label="Жанр"
                genres={genres}
                selectedSlugs={selectedSlugsSet}
                onToggle={toggleGenre}
              />
            ) : null}

            {query.trim().length === 0 && history.length > 0 ? (
              <View className="gap-2">
                <Text className="text-[13px] font-medium tracking-[-0.52px] text-[#4A5550]">
                  Недавние запросы
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {history.map((entry) => (
                    <View
                      key={entry.query}
                      className="flex-row items-center gap-1 rounded-full border border-[#E8E6D8] bg-[#F2F0E6] px-3 py-1.5"
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Search ${entry.query}`}
                        onPress={() => setQuery(entry.query)}
                      >
                        <Text className="text-[13px] tracking-[-0.52px] text-[#1A2420]">
                          {entry.query}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${entry.query}`}
                        hitSlop={8}
                        onPress={() => clearHistoryEntry(entry)}
                      >
                        <X size={14} color={ReadupColors.textTertiary} strokeWidth={2} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="min-h-[220px] items-center justify-center px-8">
            {loading ? (
              <ActivityIndicator size="large" color={ReadupColors.brand} />
            ) : error ? (
              <Text className="text-center text-[15px] leading-6 text-[#4A5550]">
                {error}
              </Text>
            ) : (
              <Text className="text-center text-[15px] leading-6 text-[#4A5550]">
                Nothing matched that search. Try a broader category or shorter query.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isSaved = savedIds.has(item.bookId);
          return (
            <View className="w-[136px] gap-2">
              <BookCard item={item} onPress={openBook} />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSaved }}
                onPress={() => toggleSavedBook(item)}
                className="items-center rounded-full border px-3 py-1.5 active:opacity-80"
                style={{
                  borderColor: ReadupColors.brand,
                  backgroundColor: isSaved ? ReadupColors.brand : "transparent",
                }}
              >
                <Text
                  className="text-[12px] font-medium"
                  style={{
                    color: isSaved ? ReadupColors.textInverse : ReadupColors.brand,
                  }}
                >
                  {isSaved ? "Unsave" : "Save"}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
