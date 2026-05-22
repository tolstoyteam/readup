import { coverUrl, fetchBooks } from "@/features/books/api/books";
import {
  BookCard,
  type BookCardItem,
} from "@/features/books/components/book-card";
import {
  fetchUserLibrary,
  setLibraryStatus,
  type LibraryItem,
} from "@/features/library/api/library";
import { Image } from "expo-image";
import { ChevronRight, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

type HomeBook = BookCardItem & {
  genres: string[];
};

type Section = {
  title: string;
  data: HomeBook[];
};

function sectionTitle(genre: string) {
  const normalized = genre.trim().toLowerCase();
  if (normalized.includes("драма") || normalized.includes("drama")) return "Драма";
  if (normalized.includes("фанта") || normalized.includes("sci")) return "Фантастика";
  if (normalized.includes("детектив") || normalized.includes("detect")) return "Детектив";
  return genre.trim();
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<HomeBook[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [{ books }, library] = await Promise.all([
        fetchBooks(),
        user ? fetchUserLibrary(user.id) : Promise.resolve([]),
      ]);
      setItems(
        books.map((r) => ({
          id: r.id,
          title: r.document.title,
          author: r.document.author,
          bookId: r.document.book_id,
          cover: coverUrl(r.document.cover_image_path),
          genres: r.document.genres,
        })),
      );
      setLibraryItems(library);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load books");
      setItems([]);
      setLibraryItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const continueBook = useMemo(() => {
    const inProgress = libraryItems.find((item) => item.status === "in_progress");
    return items.find((item) => item.bookId === inProgress?.book_id) ?? items[0] ?? null;
  }, [items, libraryItems]);

  const sections = useMemo<Section[]>(() => {
    const genreSections = new Map<string, HomeBook[]>();
    for (const item of items) {
      for (const genre of item.genres) {
        const title = sectionTitle(genre);
        if (!title) continue;
        genreSections.set(title, [...(genreSections.get(title) ?? []), item]);
      }
    }

    return [
      { title: "В тренде", data: items.slice(0, 10) },
      ...Array.from(genreSections.entries())
        .filter(([, data]) => data.length > 0)
        .slice(0, 4)
        .map(([title, data]) => ({ title, data })),
    ].filter((section) => section.data.length > 0);
  }, [items]);

  async function openBook(item: BookCardItem) {
    if (user) {
      void setLibraryStatus(user.id, item.bookId, "in_progress").catch(() => undefined);
    }
    router.push(`/reader/${encodeURIComponent(item.bookId)}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ReadupColors.brand}
            colors={[ReadupColors.brand]}
            progressBackgroundColor={ReadupColors.surface}
          />
        }
        contentContainerClassName="pb-8"
      >
        <View className="flex-row items-center justify-between px-8 pb-7 pt-8">
          <ReadupLogo />
          <Pressable
            accessibilityRole="button"
            className="h-8 w-8 items-center justify-center rounded-full bg-[#F2F0E6] active:opacity-80"
          >
            <Zap size={20} color={ReadupColors.text} strokeWidth={2} />
          </Pressable>
        </View>

        {loading ? (
          <View className="min-h-[420px] items-center justify-center p-6">
            <ActivityIndicator size="large" color={ReadupColors.brand} />
          </View>
        ) : error ? (
          <View className="min-h-[420px] items-center justify-center px-6">
            <Text className="mb-4 text-center text-[15px] leading-[22px] text-[#4A5550]">
              {error}
            </Text>
            <Pressable
              onPress={load}
              className="rounded-full bg-[#059669] px-6 py-3 active:opacity-90"
            >
              <Text className="text-[15px] font-semibold text-[#FBFAF2]">
                Retry
              </Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View className="min-h-[420px] items-center justify-center px-6">
            <Text className="text-center text-[15px] leading-[22px] text-[#4A5550]">
              No books yet. Add rows to public.books and make sure anon SELECT
              policy is enabled.
            </Text>
          </View>
        ) : (
          <>
            {continueBook ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openBook(continueBook)}
                className="mx-8 mb-7 h-32 overflow-hidden rounded-[20px] bg-[#F2F0E6] active:opacity-90"
              >
                <View className="h-full flex-row items-center justify-between pl-3">
                  <View className="max-w-[154px] gap-10">
                    <Text
                      className="text-[18px] font-medium leading-[22px] tracking-[-0.72px] text-[#1A2420]"
                      numberOfLines={2}
                    >
                      {continueBook.title}
                    </Text>
                    <Text className="text-[14px] tracking-[-0.56px] text-[#059669]">
                      продолжить читать
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="h-[118px] w-[82px] overflow-hidden rounded-[10px] bg-[#F2F0E6]">
                      {continueBook.cover ? (
                        <Image
                          source={{ uri: continueBook.cover }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={180}
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View className="h-full items-center justify-center px-2">
                          <Text
                            className="text-center text-[11px] font-medium text-[#4A5550]"
                            numberOfLines={4}
                          >
                            {continueBook.title}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="ml-2 mr-[-20px] h-10 w-10 items-center justify-center rounded-full bg-[#FBFAF2]">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F2F0E6]">
                        <ChevronRight
                          size={20}
                          color={ReadupColors.text}
                          strokeWidth={2}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : null}

            {sections.map((section) => (
              <View key={section.title} className="mb-8">
                <Text className="px-8 text-[22px] font-semibold tracking-[-0.88px] text-black">
                  {section.title}
                </Text>
                <FlatList
                  horizontal
                  data={section.data}
                  keyExtractor={(item) => `${section.title}-${item.id}-${item.bookId}`}
                  renderItem={({ item }) => (
                    <BookCard item={item} onPress={openBook} />
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 px-8 pt-4"
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
