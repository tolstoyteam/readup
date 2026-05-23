import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Clock,
  Layers,
  ListChecks,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchBookDetail, type BookDetail } from "@/features/books/api/book-detail";
import {
  fetchLibraryItem,
  removeLibraryItem,
  setLibraryStatus,
  type LibraryItem,
} from "@/features/library/api/library";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

function formatReadingTime(minutes: number | null, totalPages: number | null): string {
  if (minutes && minutes > 0) {
    return `~${minutes} мин`;
  }
  if (totalPages && totalPages > 0) {
    return `~${Math.max(Math.round(totalPages * 0.8), 5)} мин`;
  }
  return "~10–15 мин";
}

export default function BookDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ bookId: string }>();
  const bookId = params.bookId ? decodeURIComponent(params.bookId) : "";

  const [book, setBook] = useState<BookDetail | null>(null);
  const [library, setLibrary] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!bookId) {
      setError("Книга не найдена");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [detail, libItem] = await Promise.all([
        fetchBookDetail(bookId),
        user ? fetchLibraryItem(user.id, bookId) : Promise.resolve(null),
      ]);
      if (!detail) {
        setError("Книга не найдена");
        setBook(null);
        setLibrary(null);
        return;
      }
      setBook(detail);
      setLibrary(libItem);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить книгу");
    } finally {
      setLoading(false);
    }
  }, [bookId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const isSaved =
    library?.status === "saved" ||
    library?.status === "in_progress" ||
    library?.status === "completed";
  const isInProgress = library?.status === "in_progress";
  const progressPage = library?.progress?.page ?? 0;
  const totalPages = library?.progress?.total_pages ?? book?.totalPages ?? null;

  async function toggleSaved() {
    if (!user || !book || savingAction) return;
    setSavingAction(true);
    try {
      if (library) {
        await removeLibraryItem(user.id, book.bookId);
        setLibrary(null);
      } else {
        const next = await setLibraryStatus(user.id, book.bookId, "saved");
        setLibrary(next);
      }
    } catch {
      // intentional silent; UI keeps previous state
    } finally {
      setSavingAction(false);
    }
  }

  function openReader() {
    if (!book) return;
    router.push(`/reader/${encodeURIComponent(book.bookId)}`);
  }

  function openQuiz() {
    if (!book) return;
    router.push(`/quiz/${encodeURIComponent(book.bookId)}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] active:opacity-80"
        >
          <ArrowLeft size={22} color={ReadupColors.text} strokeWidth={2} />
        </Pressable>
        {book ? (
          <Pressable
            onPress={toggleSaved}
            disabled={!user || savingAction}
            accessibilityRole="button"
            accessibilityState={{ selected: isSaved }}
            accessibilityLabel={isSaved ? "Убрать из библиотеки" : "Сохранить"}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] active:opacity-80"
          >
            <Bookmark
              size={20}
              color={isSaved ? ReadupColors.brand : ReadupColors.text}
              fill={isSaved ? ReadupColors.brand : "transparent"}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ReadupColors.brand} />
        </View>
      ) : error || !book ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-4 text-center text-[15px] leading-6 text-[#4A5550]">
            {error ?? "Книга не найдена"}
          </Text>
          <Pressable
            onPress={load}
            className="rounded-full bg-[#059669] px-6 py-3 active:opacity-90"
          >
            <Text className="text-[15px] font-semibold text-[#FBFAF2]">
              Повторить
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center px-6 pb-6 pt-3">
            <View
              className="overflow-hidden rounded-[16px]"
              style={{
                width: 190,
                height: 274,
                backgroundColor: ReadupColors.surface,
              }}
            >
              {book.cover ? (
                <Image
                  source={{ uri: book.cover }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={180}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View className="h-full items-center justify-center px-4">
                  <Text className="text-center text-[14px] font-medium text-[#4A5550]">
                    {book.title}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="px-6">
            <Text
              className="text-center text-[26px] font-semibold leading-[32px] tracking-[-1.04px] text-[#1A2420]"
              numberOfLines={3}
            >
              {book.title}
            </Text>
            {book.author ? (
              <Text className="mt-2 text-center text-[15px] tracking-[-0.6px] text-[#4A5550]">
                {book.author}
              </Text>
            ) : null}

            {book.genres.length > 0 ? (
              <View className="mt-4 flex-row flex-wrap justify-center gap-2">
                {book.genres.slice(0, 4).map((genre) => (
                  <View
                    key={genre}
                    className="rounded-full border border-[#059669] px-3 py-1"
                  >
                    <Text className="text-[12px] tracking-[-0.48px] text-[#059669]">
                      {genre}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="mt-6 flex-row justify-between rounded-[20px] bg-[#F2F0E6] px-5 py-4">
              <Stat
                icon={<Clock size={18} color={ReadupColors.text} strokeWidth={2} />}
                label="Время"
                value={formatReadingTime(book.readingTimeMinutes, book.totalPages)}
              />
              <Stat
                icon={<Layers size={18} color={ReadupColors.text} strokeWidth={2} />}
                label="Сложность"
                value={book.difficulty ?? "—"}
              />
              <Stat
                icon={<BookOpen size={18} color={ReadupColors.text} strokeWidth={2} />}
                label="Страниц"
                value={book.totalPages ? String(book.totalPages) : "—"}
              />
            </View>

            {isInProgress && totalPages && totalPages > 0 ? (
              <View className="mt-5 rounded-[16px] bg-[#F2F0E6] px-5 py-4">
                <Text className="text-[13px] tracking-[-0.52px] text-[#4A5550]">
                  Вы остановились на странице {progressPage} из {totalPages}
                </Text>
                <View className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#E8E6D8]">
                  <View
                    className="h-full rounded-full bg-[#059669]"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (progressPage / totalPages) * 100),
                      )}%`,
                    }}
                  />
                </View>
              </View>
            ) : null}

            <View className="mt-6 gap-3">
              <Pressable
                onPress={openReader}
                accessibilityRole="button"
                className="min-h-[54px] flex-row items-center justify-center gap-2 rounded-full border-2 border-[#047857] bg-[#059669] px-6 active:opacity-90"
              >
                <BookOpen size={20} color={ReadupColors.textInverse} strokeWidth={2.2} />
                <Text className="text-[18px] font-medium tracking-[-0.36px] text-[#FBFAF2]">
                  {isInProgress ? "Продолжить чтение" : "Начать чтение"}
                </Text>
              </Pressable>

              {book.hasQuiz ? (
                <Pressable
                  onPress={openQuiz}
                  accessibilityRole="button"
                  className="min-h-[54px] flex-row items-center justify-center gap-2 rounded-full border border-[#059669] bg-transparent px-6 active:opacity-80"
                >
                  <ListChecks size={20} color={ReadupColors.brand} strokeWidth={2.2} />
                  <Text className="text-[18px] font-medium tracking-[-0.36px] text-[#059669]">
                    Пройти тест
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 items-center">
      <View className="mb-1.5">{icon}</View>
      <Text className="text-[11px] uppercase tracking-[-0.44px] text-[#7A7868]">
        {label}
      </Text>
      <Text
        className="mt-0.5 text-[14px] font-semibold tracking-[-0.56px] text-[#1A2420]"
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
