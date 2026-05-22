import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type FlatList as FlatListType,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { coverUrl, fetchBooks } from "@/features/books/api/books";
import {
  BookCard,
  type BookCardItem,
} from "@/features/books/components/book-card";
import {
  fetchUserLibrary,
  setLibraryStatus,
  type LibraryItem,
  type LibraryStatus,
} from "@/features/library/api/library";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

const STATUS_OPTIONS: { value: LibraryStatus; label: string; empty: string }[] = [
  {
    value: "saved",
    label: "Saved",
    empty: "Save books from Search and they will collect here.",
  },
  {
    value: "in_progress",
    label: "In progress",
    empty: "Open a book to start tracking it here.",
  },
  {
    value: "completed",
    label: "Completed",
    empty: "Books move here when you reach the final page.",
  },
];

type LibraryBook = BookCardItem & {
  status: LibraryStatus;
  updatedAt: string | null;
};

export default function LibraryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const listRef = useRef<FlatListType<LibraryBook>>(null);
  const skipInitialScrollReset = useRef(true);
  const [activeStatus, setActiveStatus] = useState<LibraryStatus>("saved");
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLibraryBooks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [{ books }, library] = await Promise.all([
        fetchBooks(),
        fetchUserLibrary(user.id),
      ]);
      const byBookId = new Map(
        books.map((row) => [
          row.document.book_id,
          {
            id: row.id,
            bookId: row.document.book_id,
            title: row.document.title,
            author: row.document.author,
            cover: coverUrl(row.document.cover_image_path),
          },
        ]),
      );

      setLibraryBooks(
        library
          .map((item) => toLibraryBook(item, byBookId))
          .filter((item): item is LibraryBook => !!item),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load library",
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (skipInitialScrollReset.current) {
      skipInitialScrollReset.current = false;
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [activeStatus]);

  const visibleBooks = useMemo(
    () => libraryBooks.filter((book) => book.status === activeStatus),
    [activeStatus, libraryBooks],
  );

  const activeEmpty =
    STATUS_OPTIONS.find((option) => option.value === activeStatus)?.empty ??
    "No books in this shelf yet.";

  async function openBook(item: BookCardItem) {
    if (user) {
      void setLibraryStatus(user.id, item.bookId, "in_progress").catch(() => undefined);
    }
    router.push(`/reader/${encodeURIComponent(item.bookId)}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <FlatList
        ref={listRef}
        data={visibleBooks}
        extraData={activeStatus}
        keyExtractor={(item) => `${item.status}-${item.id}-${item.bookId}`}
        numColumns={2}
        columnWrapperClassName="gap-5 px-8"
        contentContainerClassName="gap-6 pb-8"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-5 px-8 pt-8">
            <View className="flex-row items-center justify-between">
              <ReadupLogo />
              <Text className="text-[22px] font-semibold tracking-[-0.88px] text-[#1A2420]">
                Library
              </Text>
            </View>

            <View className="flex-row rounded-full bg-[#F2F0E6] p-1">
              {STATUS_OPTIONS.map((option) => {
                const active = option.value === activeStatus;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setActiveStatus(option.value)}
                    className="flex-1 items-center rounded-full px-2 py-2 active:opacity-80"
                    style={{
                      backgroundColor: active ? ReadupColors.brand : "transparent",
                    }}
                  >
                    <Text
                      className="text-[12px] font-medium"
                      style={{
                        color: active
                          ? ReadupColors.textInverse
                          : ReadupColors.textSecondary,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="min-h-[320px] items-center justify-center px-8">
            {loading ? (
              <ActivityIndicator size="large" color={ReadupColors.brand} />
            ) : error ? (
              <Text className="text-center text-[15px] leading-6 text-[#4A5550]">
                {error}
              </Text>
            ) : (
              <Text className="text-center text-[15px] leading-6 text-[#4A5550]">
                {activeEmpty}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View className="w-[136px]">
            <BookCard item={item} onPress={openBook} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function toLibraryBook(
  item: LibraryItem,
  booksById: Map<string, BookCardItem>,
): LibraryBook | null {
  const book = booksById.get(item.book_id);
  if (!book) return null;

  return {
    ...book,
    status: item.status,
    updatedAt: item.updated_at,
  };
}
