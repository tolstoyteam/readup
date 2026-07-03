import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type FlatList as FlatListType,
  Pressable,
  ScrollView,
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
  bookGridColumnWrapperStyle,
  bookGridContentContainerStyle,
  useBookGridLayout,
} from "@/features/books/hooks/use-book-grid-layout";
import {
  buildBookCatalogMap,
  joinLibraryBooks,
  type LibraryBookCard,
  type LibrarySection,
  useLibrary,
} from "@/features/library";
import {
  QuoteCard,
  type QuoteCardItem,
} from "@/features/quotes/components/quote-card";
import { useQuotes } from "@/features/quotes";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import type { TranslationKey } from "@/shared/i18n/translations";

const SECTION_OPTIONS: {
  value: LibrarySection;
  labelKey: TranslationKey;
  emptyKey: TranslationKey;
}[] = [
  {
    value: "saved",
    labelKey: "library.saved",
    emptyKey: "library.savedEmpty",
  },
  {
    value: "in_progress",
    labelKey: "library.inProgress",
    emptyKey: "library.inProgressEmpty",
  },
  {
    value: "completed",
    labelKey: "library.completed",
    emptyKey: "library.completedEmpty",
  },
  {
    value: "quotes",
    labelKey: "library.quotes",
    emptyKey: "library.quotesEmpty",
  },
];

export default function LibraryScreen() {
  const colors = useReadupColors();
  const { cardWidth } = useBookGridLayout();
  const router = useRouter();
  const { language, t } = useInterfaceLanguage();
  const listRef = useRef<FlatListType<LibraryBookCard>>(null);
  const quotesListRef = useRef<FlatListType<QuoteCardItem>>(null);
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
    registerEditionMapping,
  } = useLibrary();
  const {
    quotes,
    loading: quotesLoading,
    error: quotesError,
    refresh: refreshQuotes,
  } = useQuotes();

  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      const preferredLanguage = language;
      const { books } = await fetchBooks(preferredLanguage);
      const catalog = buildBookCatalogMap(books);
      for (const ref of catalog.editionRefs) {
        registerEditionMapping(ref.bookId, ref.workId);
      }
      setCatalogBooks(joinLibraryBooks(records, catalog, preferredLanguage));
    } catch {
      setCatalogBooks([]);
    } finally {
      setCatalogLoading(false);
    }
  }, [language, records, registerEditionMapping]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshQuotes();
    }, [refresh, refreshQuotes]),
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (skipInitialScrollReset.current) {
      skipInitialScrollReset.current = false;
      return;
    }
    if (activeSection === "quotes") {
      quotesListRef.current?.scrollToOffset({ offset: 0, animated: true });
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
      case "quotes":
        return [];
    }
  }, [activeSection, savedBooks, inProgressBooks, completedBooks]);

  const visibleBooks = useMemo(() => {
    const workIds = new Set(sectionRecords.map((record) => record.workId));
    return catalogBooks.filter((book) => workIds.has(book.workId));
  }, [catalogBooks, sectionRecords]);

  const titleByWorkId = useMemo(() => {
    const map = new Map<string, string>();
    for (const book of catalogBooks) {
      map.set(book.workId, book.title);
    }
    return map;
  }, [catalogBooks]);

  const quoteItems = useMemo<QuoteCardItem[]>(
    () =>
      quotes.map((quote) => ({
        ...quote,
        bookTitle: titleByWorkId.get(quote.workId),
      })),
    [quotes, titleByWorkId],
  );

  const activeEmpty =
    SECTION_OPTIONS.find((option) => option.value === activeSection)
      ?.emptyKey ?? "library.savedEmpty";

  const isLoading =
    activeSection === "quotes" ? quotesLoading : loading || catalogLoading;
  const activeError = activeSection === "quotes" ? quotesError : error;

  function openBook(item: BookCardItem) {
    router.push(`/book/${encodeURIComponent(item.bookId)}`);
  }

  const header = (
    <View className="gap-5 px-8 pt-8">
      <View className="flex-row items-center justify-between">
        <ReadupLogo />
        <Text className="text-[22px] font-semibold tracking-[-0.88px] text-[#1A2420] dark:text-[#F3F4EE]">
          {t("library.title")}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row rounded-full bg-[#F2F0E6] dark:bg-[#19211D] p-1"
      >
        {SECTION_OPTIONS.map((option) => {
          const active = option.value === activeSection;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setActiveSection(option.value)}
              className="items-center rounded-full px-4 py-2 active:opacity-80"
              style={{
                backgroundColor: active ? colors.brand : "transparent",
              }}
            >
              <Text
                className="text-[12px] font-medium"
                style={{
                  color: active ? colors.textInverse : colors.textSecondary,
                }}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      {activeSection === "quotes" ? (
        <FlatList
          key="library-quotes-list"
          ref={quotesListRef}
          data={quoteItems}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-6 pb-8"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View className="min-h-[320px] items-center justify-center px-8">
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.brand} />
              ) : activeError ? (
                <Text className="text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
                  {activeError}
                </Text>
              ) : (
                <Text className="text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
                  {t(activeEmpty)}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View className="px-8">
              <QuoteCard item={item} />
            </View>
          )}
        />
      ) : (
        <FlatList
          key="library-books-list"
          ref={listRef}
          data={visibleBooks}
          extraData={{ activeSection, cardWidth }}
          keyExtractor={(item) =>
            `${activeSection}-${item.workId}-${item.bookId}`
          }
          numColumns={2}
          columnWrapperStyle={bookGridColumnWrapperStyle}
          contentContainerStyle={bookGridContentContainerStyle}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View className="min-h-[320px] items-center justify-center px-8">
              {isLoading ? (
                <ActivityIndicator size="large" color={colors.brand} />
              ) : activeError ? (
                <Text className="text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
                  {activeError}
                </Text>
              ) : (
                <Text className="text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
                  {t(activeEmpty)}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <BookCard
              item={item}
              onPress={openBook}
              width={cardWidth}
              layout="grid"
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
