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

import { fetchBooks } from "@/features/books/api/books";
import {
  BookCard,
  type BookCardItem,
} from "@/features/books/components/book-card";
import {
  buildBookCatalogMap,
  joinLibraryBooks,
  type LibraryBookCard,
  type LibrarySection,
  useLibrary,
} from "@/features/library";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { useReadupColors } from "@/shared/constants/readup-theme";

const SECTION_OPTIONS: {
  value: LibrarySection;
  label: string;
  empty: string;
}[] = [
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
    empty: "Books move here after you tap Finish on the last page.",
  },
];

export default function LibraryScreen() {
  const colors = useReadupColors();
  const router = useRouter();
  const listRef = useRef<FlatListType<LibraryBookCard>>(null);
  const skipInitialScrollReset = useRef(true);
  const [activeSection, setActiveSection] = useState<LibrarySection>("saved");
  const [catalogBooks, setCatalogBooks] = useState<LibraryBookCard[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const {
    records,
    savedBooks,
    inProgressBooks,
    completedBooks,
    loading,
    error,
    refresh,
  } = useLibrary();

  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const { books } = await fetchBooks();
      const catalog = buildBookCatalogMap(books);
      setCatalogBooks(joinLibraryBooks(records, catalog));
    } catch {
      setCatalogBooks([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [records]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (skipInitialScrollReset.current) {
      skipInitialScrollReset.current = false;
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [activeSection]);

  const sectionRecords = useMemo(() => {
    switch (activeSection) {
      case "saved":
        return savedBooks;
      case "in_progress":
        return inProgressBooks;
      case "completed":
        return completedBooks;
    }
  }, [activeSection, savedBooks, inProgressBooks, completedBooks]);

  const visibleBooks = useMemo(() => {
    const bookIds = new Set(sectionRecords.map((record) => record.bookId));
    return catalogBooks.filter((book) => bookIds.has(book.bookId));
  }, [catalogBooks, sectionRecords]);

  const activeEmpty =
    SECTION_OPTIONS.find((option) => option.value === activeSection)?.empty ??
    "No books in this shelf yet.";

  const isLoading = loading || catalogLoading;

  function openBook(item: BookCardItem) {
    router.push(`/book/${encodeURIComponent(item.bookId)}`);
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      <FlatList
        ref={listRef}
        data={visibleBooks}
        extraData={activeSection}
        keyExtractor={(item) => `${activeSection}-${item.id}-${item.bookId}`}
        numColumns={2}
        columnWrapperClassName="gap-5 px-8"
        contentContainerClassName="gap-6 pb-8"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-5 px-8 pt-8">
            <View className="flex-row items-center justify-between">
              <ReadupLogo />
              <Text className="text-[22px] font-semibold tracking-[-0.88px] text-[#1A2420] dark:text-[#F3F4EE]">
                Library
              </Text>
            </View>

            <View className="flex-row rounded-full bg-[#F2F0E6] dark:bg-[#19211D] p-1">
              {SECTION_OPTIONS.map((option) => {
                const active = option.value === activeSection;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setActiveSection(option.value)}
                    className="flex-1 items-center rounded-full px-2 py-2 active:opacity-80"
                    style={{
                      backgroundColor: active
                        ? colors.brand
                        : "transparent",
                    }}
                  >
                    <Text
                      className="text-[12px] font-medium"
                      style={{
                        color: active
                          ? colors.textInverse
                          : colors.textSecondary,
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
            {isLoading ? (
              <ActivityIndicator size="large" color={colors.brand} />
            ) : error ? (
              <Text className="text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
                {error}
              </Text>
            ) : (
              <Text className="text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
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
