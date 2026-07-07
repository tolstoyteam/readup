import type { BookDocument } from "@readup/db/shared";
import {
  resolveBookAudioSource,
  type ResolvedBookAudioSource,
} from "@/features/books/api/book-audio";
import { fetchBookContent } from "@/features/books/api/book-content";
import { pickEditionBookId } from "@/features/books/lib/pick-edition";
import {
  isCompleted,
  useLibraryActions,
  useLibraryBook,
} from "@/features/library";
import { useReadingSessionTracker } from "@/features/reading-stats";
import { ReaderBookAudioProvider } from "@/features/reader/audio/reader-book-audio-context";
import { BookListenPlayer } from "@/features/reader/components/book-listen-player";
import { PageElements } from "@/features/reader/components/page-elements";
import { ReaderReadFooter } from "@/features/reader/components/reader-read-footer";
import { ReaderListenLoading } from "@/features/reader/components/reader-listen-states";
import { ReaderSettingsSheet } from "@/features/reader/components/reader-settings-sheet";
import { ReaderVoicePickerOverlay } from "@/features/reader/components/reader-voice-picker-sheet";
import { useReaderSettings } from "@/features/reader/settings/reader-settings-context";
import { bookHasPlayableQuiz } from "@/features/quiz/api/quiz";
import { useChapterQuotes, useQuotes } from "@/features/quotes";
import { SelectionToolbar } from "@/features/quotes/components/selection-toolbar";
import { resolveQuotePageIndex } from "@/features/quotes/lib/resolve-quote-navigation";
import {
  isQuoteSourceNavigation,
  logQuoteSourceNavigation,
  parseFocusQuoteIdParam,
  quoteEditionMatchesDocument,
  quoteSourceReaderPath,
  shouldSuppressEditionRedirect,
} from "@/features/quotes/lib/quote-source-navigation";
import type { TextSelectionState } from "@/features/quotes/lib/quote-types";
import { resolvePageIndex } from "@/features/reader/lib/resolve-reading-position";
import type { ReaderLanguage } from "@/features/reader/settings/reader-settings";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useReadupColors, statusBarStyleForScheme } from "@/shared/constants/readup-theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useIsFocused } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
  useFocusEffect,
  type Href,
} from "expo-router";
import {
  FileText,
  Headphones,
  Menu,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
  scrollViewRef,
  highlightsByBlockId,
  selectingBlockId,
  onBlockLongPress,
  onSelectionChange,
  onBlockLayoutY,
  onSelectionDismiss,
  selectionToolbarVisible,
  onSaveQuote,
  savingQuote,
  onDismissSelection,
  onOpenVoiceMenu,
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
  scrollViewRef: RefObject<ScrollView | null>;
  highlightsByBlockId: Map<string, import("@/features/quotes").QuoteRange[]>;
  selectingBlockId: string | null;
  onBlockLongPress: (blockStableId: string) => void;
  onSelectionChange: (
    blockStableId: string,
    start: number,
    end: number,
    selectedText: string,
  ) => void;
  onBlockLayoutY: (blockStableId: string, y: number) => void;
  onSelectionDismiss: () => void;
  selectionToolbarVisible: boolean;
  onSaveQuote: () => void;
  savingQuote: boolean;
  onDismissSelection: () => void;
  onOpenVoiceMenu?: () => void;
}) {
  const currentPage = pages[pageIndex] ?? null;
  const pageProgress =
    totalPages > 0 ? Math.min((pageIndex + 1) / totalPages, 1) : 0;
  const { settings } = useReaderSettings();
  const { t } = useInterfaceLanguage();

  return (
    <>
      <View className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]">
        {readMode === "read" && currentPage && (
          <View className="relative flex-1">
            <SelectionToolbar
              visible={selectionToolbarVisible}
              onSave={onSaveQuote}
              onDismiss={onDismissSelection}
              saving={savingQuote}
            />
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: settings.margin,
                paddingTop: 8,
                paddingBottom: 24,
              }}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={onDismissSelection}
            >
              <PageElements
                elements={currentPage.elements}
                bookId={document.book_id}
                pageNumber={currentPage.page_number}
                highlightsByBlockId={highlightsByBlockId}
                selectingBlockId={selectingBlockId}
                onBlockLongPress={onBlockLongPress}
                onSelectionChange={onSelectionChange}
                onBlockLayoutY={onBlockLayoutY}
                onSelectionDismiss={onSelectionDismiss}
              />
            </ScrollView>
          </View>
        )}
        {readMode === "listen" && hasAudio && (
          <BookListenPlayer
            document={document}
            onRetryAudio={onRetryAudio}
            onOpenVoiceMenu={onOpenVoiceMenu ?? (() => {})}
          />
        )}
      </View>

      {readMode === "read" ? (
        <>
          {showLastPageActions &&
          ((showFinishButton && onFinishBook) || onOpenQuiz) ? (
            <View className="flex-row items-center justify-center gap-3 bg-[#FBFAF2] dark:bg-[#101512] px-[22px] py-3">
              {showFinishButton && onFinishBook ? (
                <Pressable
                  onPress={onFinishBook}
                  disabled={finishing}
                  accessibilityRole="button"
                  accessibilityLabel={t("reader.finishBook")}
                  className={`min-h-[44px] items-center justify-center rounded-full border-2 border-[#047857] dark:border-[#10B981] bg-[#059669] px-6 active:opacity-90 ${finishing ? "opacity-70" : ""}`}
                >
                  {finishing ? (
                    <ActivityIndicator size="small" color="#FBFAF2" />
                  ) : (
                    <Text className="text-[14px] font-medium tracking-[-0.56px] text-[#FBFAF2]">
                      {t("reader.finishBook")}
                    </Text>
                  )}
                </Pressable>
              ) : null}
              {onOpenQuiz ? (
                <Pressable
                  onPress={onOpenQuiz}
                  accessibilityRole="button"
                  accessibilityLabel={t("bookDetail.takeQuiz")}
                  className="min-h-[44px] items-center justify-center rounded-full border border-[#059669] dark:border-[#34D399] bg-transparent px-6 active:opacity-80"
                >
                  <Text className="text-[14px] font-medium tracking-[-0.56px] text-[#059669] dark:text-[#34D399]">
                    {t("bookDetail.takeQuiz")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ReaderReadFooter
            document={document}
            hasAudio={hasAudio}
            pageIndex={pageIndex}
            pages={pages}
            totalPages={totalPages}
            pageLabel={pageLabel}
            pageProgress={pageProgress}
            goNext={goNext}
            goPrev={goPrev}
          />
        </>
      ) : null}
    </>
  );
}

export default function ReaderScreen() {
  const colors = useReadupColors();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { t } = useInterfaceLanguage();
  const { bookId: bookIdParam, mode: modeParam, focusQuoteId: focusQuoteIdParam } = useLocalSearchParams<{
    bookId: string;
    mode?: string;
    focusQuoteId?: string | string[];
  }>();
  const bookId = bookIdParam ? decodeURIComponent(bookIdParam) : "";
  const focusQuoteId = parseFocusQuoteIdParam(focusQuoteIdParam);
  const { settings, loaded: settingsLoaded, setLanguage } = useReaderSettings();
  const { record: libraryRecord, loading: libraryLoading } =
    useLibraryBook(bookId);
  const { recordReadingSession } = useLibraryActions();
  const wantsListenMode = modeParam === "listen";

  const { saveQuote: persistQuote, quotesById } = useQuotes();

  const quoteSourceSessionRef = useRef(!!focusQuoteId);
  if (focusQuoteId) {
    quoteSourceSessionRef.current = true;
  }
  const audioCheckedBookIdRef = useRef<string | null>(null);
  const resumeAppliedRef = useRef<string | null>(null);
  const quoteFocusAppliedRef = useRef<string | null>(null);
  const skipPageTrackingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const blockLayoutYRef = useRef<Map<string, number>>(new Map());

  const [selectingBlockId, setSelectingBlockId] = useState<string | null>(null);
  const [selectionState, setSelectionState] = useState<TextSelectionState | null>(
    null,
  );
  const [savingQuote, setSavingQuote] = useState(false);
  const [emphasizedQuoteId, setEmphasizedQuoteId] = useState<string | undefined>(
    focusQuoteId,
  );

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
  const [voiceMenuOpen, setVoiceMenuOpen] = useState(false);

  const dismissReaderChrome = useCallback(() => {
    setSettingsOpen(false);
    setVoiceMenuOpen(false);
    setSelectingBlockId(null);
    setSelectionState(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        dismissReaderChrome();
      };
    }, [dismissReaderChrome]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      dismissReaderChrome();
    });
    return unsubscribe;
  }, [dismissReaderChrome, navigation]);

  useEffect(() => {
    if (focusQuoteId) {
      setEmphasizedQuoteId(focusQuoteId);
    } else {
      quoteSourceSessionRef.current = false;
      setEmphasizedQuoteId(undefined);
    }
    audioCheckedBookIdRef.current = null;
    resumeAppliedRef.current = null;
    quoteFocusAppliedRef.current = null;
    setSelectingBlockId(null);
    setSelectionState(null);
    setSettingsOpen(false);
    setVoiceMenuOpen(false);
    setAudioState({ status: "checking", source: null, message: null });
    setHasQuiz(false);
  }, [bookId, focusQuoteId]);

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
            : t("reader.audioCheckingFailed"),
      });
    }
  }, [t]);

  const reloadAudio = useCallback(() => {
    if (!document?.book_id) return;
    void loadAudio(document.book_id);
  }, [document?.book_id, loadAudio]);

  const load = useCallback(async () => {
    if (!bookId) {
      setError(t("reader.missingBook"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setDocument(null);
      const row = await fetchBookContent(bookId);
      if (!row) {
        setError(t("bookDetail.bookNotFound"));
        setDocument(null);
        return;
      }
      setDocument(row.document);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("bookDetail.couldNotLoad"));
      setDocument(null);
    } finally {
      setLoading(false);
    }
  }, [bookId, t]);

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
  const chapterStableId =
    currentPage && "chapter_stable_id" in currentPage
      ? (currentPage as { chapter_stable_id?: string }).chapter_stable_id
      : undefined;

  const { highlightsByBlockId } = useChapterQuotes(
    document?.book_id,
    chapterStableId,
    emphasizedQuoteId,
  );

  useEffect(() => {
    blockLayoutYRef.current.clear();
  }, [pageIndex, chapterStableId]);

  const focusQuote = useMemo(() => {
    if (!focusQuoteId) return null;
    return quotesById.get(focusQuoteId) ?? null;
  }, [focusQuoteId, quotesById]);

  const sessionTracker = useReadingSessionTracker({
    enabled: !!user && !!document?.book_id && totalPages > 0,
    bookId: document?.book_id,
    pageLabel,
    totalPages,
    chapterStableId,
    recordReadingSession,
  });

  useEffect(() => {
    if (!bookId || !document || libraryLoading) return;
    if (
      isQuoteSourceNavigation({
        focusQuoteId,
        quoteSourceSession: quoteSourceSessionRef.current,
      })
    ) {
      return;
    }
    const workKey = document.work_id ?? bookId;
    if (resumeAppliedRef.current === workKey) return;

    if (pages.length === 0) return;

    resumeAppliedRef.current = workKey;
    const targetPage = resolvePageIndex(libraryRecord?.progress ?? null, pages);
    setPageIndex(targetPage);
    sessionTracker.resetPageTracking(targetPage);
  }, [
    bookId,
    document,
    focusQuoteId,
    libraryLoading,
    libraryRecord?.progress,
    pages,
    sessionTracker,
  ]);

  useEffect(() => {
    if (!document || !focusQuoteId || !focusQuote) return;
    if (!quoteEditionMatchesDocument(focusQuote, document.book_id)) {
      router.replace(quoteSourceReaderPath(focusQuote) as Href);
      return;
    }

    const focusKey = `${document.book_id}:${focusQuoteId}`;
    if (quoteFocusAppliedRef.current === focusKey) return;

    quoteFocusAppliedRef.current = focusKey;
    skipPageTrackingRef.current = true;
    const quotePageIndex = resolveQuotePageIndex(focusQuote, pages);
    setPageIndex(quotePageIndex);
  }, [document, focusQuoteId, focusQuote, pages, router]);

  useEffect(() => {
    if (!focusQuote || !focusQuoteId || !document?.book_id) return;
    if (!quoteEditionMatchesDocument(focusQuote, document.book_id)) return;
    const y = blockLayoutYRef.current.get(focusQuote.blockStableId);
    if (y === undefined) return;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(y - 24, 0),
        animated: true,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [document?.book_id, focusQuote, focusQuoteId, pageIndex]);

  useEffect(() => {
    if (!emphasizedQuoteId || !document?.book_id) return;
    const timer = setTimeout(() => {
      setEmphasizedQuoteId(undefined);
    }, 1400);
    return () => clearTimeout(timer);
  }, [document?.book_id, emphasizedQuoteId]);

  const hasAudio = audioState.status === "available";
  const audioChecking = audioState.status === "checking" && !!document;
  const isLastPage = pages.length > 0 && pageIndex === pages.length - 1;
  const showLastPageActions = isLastPage && !!user;
  const showFinishButton = showLastPageActions && !isCompleted(libraryRecord);

  const suppressEditionRedirect = shouldSuppressEditionRedirect({
    quoteSourceSession: quoteSourceSessionRef.current,
    focusQuoteId,
  });

  const preferredBookId = useMemo(() => {
    if (!document) return bookId;
    return pickEditionBookId(
      document.available_editions,
      settings.language,
      document.book_id,
    );
  }, [bookId, document, settings.language]);

  const needsEditionRedirect =
    settingsLoaded &&
    !!document &&
    preferredBookId !== bookId &&
    !suppressEditionRedirect;
  const awaitingEditionResolution = !settingsLoaded || needsEditionRedirect;

  useEffect(() => {
    if (!settingsLoaded || !document) return;

    const suppress = isQuoteSourceNavigation({
      focusQuoteId: parseFocusQuoteIdParam(focusQuoteIdParam),
      quoteSourceSession: quoteSourceSessionRef.current,
    });

    if (suppress) {
      logQuoteSourceNavigation("edition redirect suppressed", {
        bookId,
        preferredBookId,
        focusQuoteId: parseFocusQuoteIdParam(focusQuoteIdParam),
        quoteSourceSession: quoteSourceSessionRef.current,
      });
      return;
    }

    if (preferredBookId === bookId) return;

    logQuoteSourceNavigation("edition redirect", {
      fromBookId: bookId,
      toBookId: preferredBookId,
      settingsLanguage: settings.language,
    });

    const params = new URLSearchParams();
    if (wantsListenMode) params.set("mode", "listen");
    const suffix = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/reader/${encodeURIComponent(preferredBookId)}${suffix}`);
  }, [
    bookId,
    document,
    focusQuoteIdParam,
    preferredBookId,
    router,
    settings.language,
    settingsLoaded,
    wantsListenMode,
  ]);

  const handleLanguageChange = useCallback(
    (language: ReaderLanguage) => {
      quoteSourceSessionRef.current = false;
      logQuoteSourceNavigation("manual language change", { language });
      setLanguage(language);
    },
    [setLanguage],
  );

  const handleCloseReader = useCallback(() => {
    quoteSourceSessionRef.current = false;
    dismissReaderChrome();
    router.back();
  }, [dismissReaderChrome, router]);

  const handleOpenQuiz = useCallback(() => {
    if (!document?.book_id) return;
    dismissReaderChrome();
    router.push(`/quiz/${encodeURIComponent(document.book_id)}`);
  }, [dismissReaderChrome, document?.book_id, router]);

  const handleFinishBook = useCallback(async () => {
    if (!user || !document?.book_id || finishing) return;
    setFinishing(true);
    try {
      await sessionTracker.flush({ completing: true });
      dismissReaderChrome();
      router.dismissTo("/(tabs)");
    } catch {
      Alert.alert(
        t("reader.finishBook"),
        t("common.tryAgain"),
      );
    } finally {
      setFinishing(false);
    }
  }, [dismissReaderChrome, document?.book_id, finishing, router, sessionTracker, t, user]);

  useEffect(() => {
    if (!user || !document?.book_id || pages.length === 0) return;
    if (skipPageTrackingRef.current) {
      skipPageTrackingRef.current = false;
      return;
    }
    sessionTracker.onPageChange(pageIndex);
  }, [document?.book_id, pageIndex, pages.length, sessionTracker, user]);

  const dismissSelection = useCallback(() => {
    setSelectingBlockId(null);
    setSelectionState(null);
  }, []);

  const handleBlockLongPress = useCallback(
    (blockStableId: string) => {
      if (!user) {
        Alert.alert(t("quotes.signInRequiredTitle"), t("quotes.signInRequiredBody"));
        return;
      }
      setSelectingBlockId(blockStableId);
      setSelectionState(null);
    },
    [t, user],
  );

  const handleSelectionChange = useCallback(
    (blockStableId: string, start: number, end: number, selectedText: string) => {
      if (start === end || !selectedText.trim()) {
        setSelectionState(null);
        return;
      }
      setSelectionState({
        blockStableId,
        start,
        end,
        selectedText,
      });
    },
    [],
  );

  const handleBlockLayoutY = useCallback((blockStableId: string, y: number) => {
    blockLayoutYRef.current.set(blockStableId, y);
  }, []);

  const handleSaveQuote = useCallback(async () => {
    if (!user || !document || !currentPage || !selectionState) return;
    if (!selectionState.selectedText.trim()) {
      Alert.alert(t("quotes.nothingSelectedTitle"), t("quotes.nothingSelectedBody"));
      return;
    }

    const chapterTitle = currentPage.elements.find(
      (element) => element.type === "chapter_name",
    )?.content;

    setSavingQuote(true);
    try {
      await persistQuote({
        workId: document.work_id ?? document.book_id,
        editionBookId: Number(document.book_id),
        language: document.language,
        chapterStableId:
          (currentPage as { chapter_stable_id?: string }).chapter_stable_id ??
          `legacy:${document.book_id}:${currentPage.page_number}`,
        chapterTitle: chapterTitle ?? null,
        pageNumber: currentPage.page_number,
        blockStableId: selectionState.blockStableId,
        startOffset: selectionState.start,
        endOffset: selectionState.end,
        selectedText: selectionState.selectedText,
      });
      dismissSelection();
    } catch (error) {
      Alert.alert(
        t("reader.saveQuoteFailed"),
        error instanceof Error ? error.message : t("common.tryAgain"),
      );
    } finally {
      setSavingQuote(false);
    }
  }, [
    currentPage,
    dismissSelection,
    document,
    persistQuote,
    selectionState,
    t,
    user,
  ]);

  const goNext = () => {
    dismissSelection();
    if (pageIndex < pages.length - 1) setPageIndex((i) => i + 1);
  };

  const goPrev = () => {
    dismissSelection();
    if (pageIndex > 0) setPageIndex((i) => i - 1);
  };

  const quoteChromeProps = {
    scrollViewRef,
    highlightsByBlockId,
    selectingBlockId,
    onBlockLongPress: handleBlockLongPress,
    onSelectionChange: handleSelectionChange,
    onBlockLayoutY: handleBlockLayoutY,
    onSelectionDismiss: dismissSelection,
    selectionToolbarVisible: !!selectingBlockId && !!selectionState?.selectedText,
    onSaveQuote: handleSaveQuote,
    savingQuote,
    onDismissSelection: dismissSelection,
  };

  const showAudioChrome =
    !loading &&
    !awaitingEditionResolution &&
    !error &&
    !!document &&
    !audioChecking &&
    hasAudio &&
    audioState.status === "available";

  const readerBody = (
    <View className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]">
      {(loading || awaitingEditionResolution) && (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      )}
      {!loading && !awaitingEditionResolution && error && (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="mb-4 text-center text-base text-[#4A5550] dark:text-[#B8C1BB]">
            {error}
          </Text>
          <Pressable
            onPress={load}
            className="min-h-[54px] items-center justify-center rounded-full border-2 border-[#047857] dark:border-[#10B981] bg-[#059669] px-6 active:opacity-90"
          >
            <Text className="text-lg font-medium text-[#FBFAF2]">
              {t("common.retry")}
            </Text>
          </Pressable>
        </View>
      )}
      {!loading &&
        !awaitingEditionResolution &&
        !error &&
        document &&
        audioChecking && (
        <ReaderListenLoading message={t("reader.loadingAudioAvailability")} />
      )}
      {showAudioChrome ? (
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
          onOpenVoiceMenu={() => setVoiceMenuOpen(true)}
          {...quoteChromeProps}
        />
      ) : null}
      {!loading &&
        !awaitingEditionResolution &&
        !error &&
        document &&
        !audioChecking &&
        !showAudioChrome ? (
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
          {...quoteChromeProps}
        />
      ) : null}
    </View>
  );

  const readerHeader = (
    <View className="flex-row items-center justify-between border-b border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512] px-3 pb-2.5">
      <Pressable
        onPress={handleCloseReader}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
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
              {t("reader.read")}
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
              {t("reader.listen")}
            </Text>
          </Pressable>
        </View>
      ) : document ? (
        <View className="flex-row items-center gap-1.5 rounded-[10px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-4 py-2">
          <FileText size={18} color={colors.textTertiary} strokeWidth={2} />
          <Text className="text-[13px] font-semibold text-[#7A7868] dark:text-[#8F9A93]">
            {t("reader.read")}
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
          accessibilityLabel={t("settings.title")}
        >
          <Menu size={26} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Pressable
          onPress={() => setSettingsOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("settings.appearance")}
        >
          <Text className="text-lg font-semibold text-[#1A2420] dark:text-[#F3F4EE]">
            AA
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const readerOverlays = (
    <>
      <ReaderSettingsSheet
        visible={isFocused && settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLanguageChange={handleLanguageChange}
      />
      {showAudioChrome ? (
        <ReaderVoicePickerOverlay
          visible={isFocused && voiceMenuOpen}
          onClose={() => setVoiceMenuOpen(false)}
        />
      ) : null}
    </>
  );

  const readerShell = (
    <View className="relative flex-1">
      {readerHeader}
      {readerBody}
      {readerOverlays}
    </View>
  );

  return (
    <SafeAreaView
      className="relative flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top", "left", "right"]}
    >
      <StatusBar style={statusBarStyleForScheme(colorScheme)} />

      {showAudioChrome && document ? (
        <ReaderBookAudioProvider
          bookId={document.book_id}
          initialSource={audioState.source}
          onSessionFlush={(audioPositionMs) =>
            sessionTracker.flush({ audioPositionMs })
          }
        >
          {readerShell}
        </ReaderBookAudioProvider>
      ) : (
        readerShell
      )}
    </SafeAreaView>
  );
}
