import type { BookDocument } from "@readup/db";
import {
  resolveBookAudioSource,
  type ResolvedBookAudioSource,
} from "@/features/books/api/book-audio";
import { fetchBookContent } from "@/features/books/api/book-content";
import {
  isCompleted,
  useLibraryActions,
  useLibraryBook,
} from "@/features/library";
import { useReadingSessionTracker } from "@/features/reading-stats";
import { ReaderBookAudioProvider } from "@/features/reader/audio/reader-book-audio-context";
import { BookListenPlayer } from "@/features/reader/components/book-listen-player";
import { PageElements } from "@/features/reader/components/page-elements";
import { ReaderBottomNowPlaying } from "@/features/reader/components/reader-bottom-now-playing";
import { ReaderBottomReadingProgress } from "@/features/reader/components/reader-bottom-reading-progress";
import { ReaderListenLoading } from "@/features/reader/components/reader-listen-states";
import { ReaderSettingsSheet } from "@/features/reader/components/reader-settings-sheet";
import { useReaderSettings } from "@/features/reader/settings/reader-settings-context";
import { bookHasPlayableQuiz } from "@/features/quiz/api/quiz";
import { pageIndexFromSavedPage } from "@/features/reader/lib/page-index";
import { useAuth } from "@/shared/context/auth-context";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Headphones,
  Menu,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReadMode = "read" | "listen";

type ReaderAudioState =
  | { status: "checking"; source: null; message: null }
  | { status: "available"; source: ResolvedBookAudioSource; message: null }
  | { status: "unavailable"; source: null; message: null }
  | { status: "error"; source: null; message: string };

function ReaderChrome({
  document,
  hasAudio,
  readMode,
  pageIndex,
  pages,
  totalPages,
  goNext,
  goPrev,
  pageLabel,
  onRetryAudio,
  showFinishButton,
  onFinishBook,
  finishing,
  onOpenQuiz,
  showLastPageActions,
}: {
  document: BookDocument;
  hasAudio: boolean;
  readMode: ReadMode;
  pageIndex: number;
  pages: NonNullable<BookDocument["pages"]>;
  totalPages: number;
  goNext: () => void;
  goPrev: () => void;
  pageLabel: number;
  onRetryAudio?: () => void;
  showFinishButton?: boolean;
  onFinishBook?: () => void;
  finishing?: boolean;
  onOpenQuiz?: () => void;
  showLastPageActions?: boolean;
}) {
  const currentPage = pages[pageIndex] ?? null;
  const pageProgress =
    totalPages > 0 ? Math.min((pageIndex + 1) / totalPages, 1) : 0;
  const { settings } = useReaderSettings();

  return (
    <>
      <View className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]">
        {readMode === "read" && currentPage && (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: settings.margin,
              paddingTop: 8,
              paddingBottom: 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            <PageElements elements={currentPage.elements} />
          </ScrollView>
        )}
        {readMode === "listen" && hasAudio && (
          <BookListenPlayer document={document} onRetryAudio={onRetryAudio} />
        )}
      </View>

      {showLastPageActions &&
      ((showFinishButton && onFinishBook) || onOpenQuiz) ? (
        <View className="flex-row items-center justify-center gap-3 bg-[#FBFAF2] dark:bg-[#101512] px-[22px] py-3">
          {showFinishButton && onFinishBook ? (
            <Pressable
              onPress={onFinishBook}
              disabled={finishing}
              accessibilityRole="button"
              accessibilityLabel="Закончить книгу"
              className={`min-h-[44px] items-center justify-center rounded-full border-2 border-[#047857] dark:border-[#10B981] bg-[#059669] px-6 active:opacity-90 ${finishing ? "opacity-70" : ""}`}
            >
              {finishing ? (
                <ActivityIndicator size="small" color="#FBFAF2" />
              ) : (
                <Text className="text-[14px] font-medium tracking-[-0.56px] text-[#FBFAF2]">
                  Закончить книгу
                </Text>
              )}
            </Pressable>
          ) : null}
          {onOpenQuiz ? (
            <Pressable
              onPress={onOpenQuiz}
              accessibilityRole="button"
              accessibilityLabel="Пройти тест"
              className="min-h-[44px] items-center justify-center rounded-full border border-[#059669] dark:border-[#34D399] bg-transparent px-6 active:opacity-80"
            >
              <Text className="text-[14px] font-medium tracking-[-0.56px] text-[#059669] dark:text-[#34D399]">
                Пройти тест
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View className="flex-row items-center justify-center gap-5 border-t border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] py-3">
        <Pressable
          onPress={goPrev}
          disabled={pageIndex <= 0}
          className={`h-10 w-10 items-center justify-center rounded-[10px] ${
            pageIndex <= 0
              ? "border border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512]"
              : "border border-[#C8C6B2] dark:border-[#3A4740] bg-[#FBFAF2] dark:bg-[#101512] active:opacity-80"
          }`}
        >
          <ChevronLeft
            size={22}
            color={pageIndex <= 0 ? "#A8A58F" : "#1A2420"}
            strokeWidth={2}
          />
        </Pressable>
        <Text className="min-w-[72px] text-center text-sm font-medium text-[#4A5550] dark:text-[#B8C1BB]">
          {pageLabel} of {totalPages || pages.length}
        </Text>
        <Pressable
          onPress={goNext}
          disabled={pageIndex >= pages.length - 1}
          className={`h-10 w-10 items-center justify-center rounded-[10px] ${
            pageIndex >= pages.length - 1
              ? "border border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512]"
              : "border border-[#C8C6B2] dark:border-[#3A4740] bg-[#FBFAF2] dark:bg-[#101512] active:opacity-80"
          }`}
        >
          <ChevronRight
            size={22}
            color={pageIndex >= pages.length - 1 ? "#A8A58F" : "#1A2420"}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {hasAudio ? (
        <ReaderBottomNowPlaying document={document} />
      ) : (
        <ReaderBottomReadingProgress
          document={document}
          pageProgress={pageProgress}
        />
      )}
    </>
  );
}

export default function ReaderScreen() {
  const colors = useReadupColors();
  const router = useRouter();
  const { user } = useAuth();
  const { bookId: bookIdParam, mode: modeParam } = useLocalSearchParams<{
    bookId: string;
    mode?: string;
  }>();
  const bookId = bookIdParam ? decodeURIComponent(bookIdParam) : "";
  const { record: libraryRecord, loading: libraryLoading } =
    useLibraryBook(bookId);
  const { recordReadingSession } = useLibraryActions();
  const wantsListenMode = modeParam === "listen";

  const audioCheckedBookIdRef = useRef<string | null>(null);
  const resumeAppliedRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<BookDocument | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [readMode, setReadMode] = useState<ReadMode>("read");
  const [audioState, setAudioState] = useState<ReaderAudioState>({
    status: "checking",
    source: null,
    message: null,
  });
  const [finishing, setFinishing] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    audioCheckedBookIdRef.current = null;
    resumeAppliedRef.current = null;
    setAudioState({ status: "checking", source: null, message: null });
    setHasQuiz(false);
  }, [bookId]);

  useEffect(() => {
    if (!bookId) return;
    void bookHasPlayableQuiz(bookId)
      .then(setHasQuiz)
      .catch(() => setHasQuiz(false));
  }, [bookId]);

  const loadAudio = useCallback(async (targetBookId: string) => {
    setAudioState({ status: "checking", source: null, message: null });
    try {
      const source = await resolveBookAudioSource(targetBookId);
      setAudioState(
        source
          ? { status: "available", source, message: null }
          : { status: "unavailable", source: null, message: null },
      );
    } catch (e) {
      setAudioState({
        status: "error",
        source: null,
        message:
          e instanceof Error
            ? e.message
            : "Не удалось проверить наличие аудио. Проверьте подключение к сети.",
      });
    }
  }, []);

  const reloadAudio = useCallback(() => {
    if (!document?.book_id) return;
    void loadAudio(document.book_id);
  }, [document?.book_id, loadAudio]);

  const load = useCallback(async () => {
    if (!bookId) {
      setError("Missing book");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setDocument(null);
      const row = await fetchBookContent(bookId);
      if (!row) {
        setError("Book not found");
        setDocument(null);
        return;
      }
      setDocument(row.document);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load book");
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!document?.book_id) return;
    if (audioCheckedBookIdRef.current === document.book_id) return;
    audioCheckedBookIdRef.current = document.book_id;
    void loadAudio(document.book_id);
  }, [document?.book_id, loadAudio]);

  useEffect(() => {
    if (audioState.status !== "available") {
      setReadMode("read");
      return;
    }
    if (wantsListenMode) {
      setReadMode("listen");
    }
  }, [audioState.status, wantsListenMode]);

  const pages = useMemo(() => {
    if (!document?.pages?.length) return [];
    return [...document.pages].sort((a, b) => a.page_number - b.page_number);
  }, [document]);

  const currentPage = pages[pageIndex] ?? null;
  const totalPages = pages.length;
  const pageLabel = currentPage?.page_number ?? pageIndex + 1;
  const sessionTracker = useReadingSessionTracker({
    enabled: !!user && !!document?.book_id && totalPages > 0,
    bookId: document?.book_id,
    pageLabel,
    totalPages,
    recordReadingSession,
  });

  useEffect(() => {
    if (!bookId || !document || libraryLoading) return;
    if (resumeAppliedRef.current === bookId) return;

    if (pages.length === 0) return;

    resumeAppliedRef.current = bookId;
    const savedPage = libraryRecord?.progress?.page ?? 0;
    const targetPage = pageIndexFromSavedPage(savedPage, pages);
    setPageIndex(targetPage);
    sessionTracker.resetPageTracking(targetPage);
  }, [
    bookId,
    document,
    libraryLoading,
    libraryRecord?.progress?.page,
    pages,
    sessionTracker,
  ]);

  const hasAudio = audioState.status === "available";
  const audioChecking = audioState.status === "checking" && !!document;
  const isLastPage = pages.length > 0 && pageIndex === pages.length - 1;
  const showLastPageActions = isLastPage && !!user;
  const showFinishButton = showLastPageActions && !isCompleted(libraryRecord);

  const handleOpenQuiz = useCallback(() => {
    if (!document?.book_id) return;
    router.push(`/quiz/${encodeURIComponent(document.book_id)}`);
  }, [document?.book_id, router]);

  const handleFinishBook = useCallback(async () => {
    if (!user || !document?.book_id || finishing) return;
    setFinishing(true);
    try {
      await sessionTracker.flush({ completing: true });
      router.replace("/(tabs)");
    } catch {
      Alert.alert(
        "Не удалось завершить книгу",
        "Проверьте подключение к сети и попробуйте снова.",
      );
    } finally {
      setFinishing(false);
    }
  }, [document?.book_id, finishing, router, sessionTracker, user]);

  useEffect(() => {
    if (!user || !document?.book_id || pages.length === 0) return;
    sessionTracker.onPageChange(pageIndex);
  }, [document?.book_id, pageIndex, pages.length, sessionTracker, user]);

  const goNext = () => {
    if (pageIndex < pages.length - 1) setPageIndex((i) => i + 1);
  };

  const goPrev = () => {
    if (pageIndex > 0) setPageIndex((i) => i - 1);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top", "left", "right"]}
    >
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between border-b border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512] px-3 pb-2.5">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close reader"
          className="active:opacity-70"
        >
          <X size={28} color={colors.text} strokeWidth={2} />
        </Pressable>

        {audioState.status === "checking" && document ? (
          <View className="h-10 min-w-[120px] items-center justify-center rounded-[10px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-4">
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : hasAudio ? (
          <View className="flex-row gap-1 rounded-[12px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-0.5">
            <Pressable
              onPress={() => setReadMode("read")}
              className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                readMode === "read" ? "bg-[#FBFAF2] dark:bg-[#101512]" : ""
              }`}
            >
              <FileText
                size={18}
                color={readMode === "read" ? "#1A2420" : "#7A7868"}
                strokeWidth={2}
              />
              <Text
                className={`text-[13px] font-semibold ${
                  readMode === "read"
                    ? "text-[#1A2420] dark:text-[#F3F4EE]"
                    : "text-[#7A7868] dark:text-[#8F9A93]"
                }`}
              >
                Read
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setReadMode("listen")}
              className={`flex-row items-center gap-1.5 rounded-lg px-3 py-2 ${
                readMode === "listen" ? "bg-[#FBFAF2] dark:bg-[#101512]" : ""
              }`}
            >
              <Headphones
                size={18}
                color={readMode === "listen" ? "#1A2420" : "#7A7868"}
                strokeWidth={2}
              />
              <Text
                className={`text-[13px] font-semibold ${
                  readMode === "listen"
                    ? "text-[#1A2420] dark:text-[#F3F4EE]"
                    : "text-[#7A7868] dark:text-[#8F9A93]"
                }`}
              >
                Listen
              </Text>
            </Pressable>
          </View>
        ) : document ? (
          <View className="flex-row items-center gap-1.5 rounded-[10px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-4 py-2">
            <FileText size={18} color={colors.textTertiary} strokeWidth={2} />
            <Text className="text-[13px] font-semibold text-[#7A7868] dark:text-[#8F9A93]">
              Read
            </Text>
          </View>
        ) : (
          <View className="h-10 w-[120px]" />
        )}

        <View className="flex-row items-center gap-3.5">
          <Pressable
            onPress={() => setSettingsOpen(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open reader settings"
          >
            <Menu size={26} color={colors.text} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open reader text settings"
          >
            <Text className="text-lg font-semibold text-[#1A2420] dark:text-[#F3F4EE]">
              AA
            </Text>
          </Pressable>
        </View>
      </View>

      <ReaderSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <View className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]">
        {loading && (
          <View className="flex-1 items-center justify-center p-6">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        )}
        {!loading && error && (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="mb-4 text-center text-base text-[#4A5550] dark:text-[#B8C1BB]">
              {error}
            </Text>
            <Pressable
              onPress={load}
              className="min-h-[54px] items-center justify-center rounded-full border-2 border-[#047857] dark:border-[#10B981] bg-[#059669] px-6 active:opacity-90"
            >
              <Text className="text-lg font-medium text-[#FBFAF2]">Retry</Text>
            </Pressable>
          </View>
        )}
        {!loading && !error && document && audioChecking && (
          <ReaderListenLoading message="Проверяем наличие аудио…" />
        )}
        {!loading &&
          !error &&
          document &&
          !audioChecking &&
          (hasAudio && audioState.status === "available" ? (
            <ReaderBookAudioProvider
              bookId={document.book_id}
              initialSource={audioState.source}
              onSessionFlush={(audioPositionMs) =>
                sessionTracker.flush({ audioPositionMs })
              }
            >
              <ReaderChrome
                document={document}
                hasAudio
                readMode={readMode}
                pageIndex={pageIndex}
                pages={pages}
                totalPages={totalPages}
                goNext={goNext}
                goPrev={goPrev}
                pageLabel={pageLabel}
                onRetryAudio={reloadAudio}
                showLastPageActions={showLastPageActions}
                showFinishButton={showFinishButton}
                onFinishBook={handleFinishBook}
                finishing={finishing}
                onOpenQuiz={hasQuiz ? handleOpenQuiz : undefined}
              />
            </ReaderBookAudioProvider>
          ) : (
            <ReaderChrome
              document={document}
              hasAudio={false}
              readMode={readMode}
              pageIndex={pageIndex}
              pages={pages}
              totalPages={totalPages}
              goNext={goNext}
              goPrev={goPrev}
              pageLabel={pageLabel}
              showLastPageActions={showLastPageActions}
              showFinishButton={showFinishButton}
              onFinishBook={handleFinishBook}
              finishing={finishing}
              onOpenQuiz={hasQuiz ? handleOpenQuiz : undefined}
            />
          ))}
      </View>
    </SafeAreaView>
  );
}
