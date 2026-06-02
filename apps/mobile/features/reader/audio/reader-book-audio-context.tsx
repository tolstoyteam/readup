import {
  BOOK_AUDIO_VOICES,
  type BookAudioVoice,
  type ResolvedBookAudioSource,
  resolveBookAudioPlaybackUrl,
} from "@/features/books/api/book-audio";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ReaderBookAudioContextValue = {
  voice: BookAudioVoice;
  setVoice: (v: BookAudioVoice) => void;
  voices: typeof BOOK_AUDIO_VOICES;
  audioUrl: string | null;
  isAudioLoading: boolean;
  loadError: string | null;
  status: ReturnType<typeof useAudioPlayerStatus>;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seekToFraction: (fraction: number) => void;
  retryVoiceLoad: () => void;
};

const ReaderBookAudioContext =
  createContext<ReaderBookAudioContextValue | null>(null);

const LISTEN_FLUSH_INTERVAL_MS = 60_000;

export function ReaderBookAudioProvider({
  bookId,
  initialSource,
  onSessionFlush,
  children,
}: {
  bookId: string;
  initialSource: ResolvedBookAudioSource;
  /** Called periodically while audio plays and on pause/unmount. */
  onSessionFlush?: (audioPositionMs: number) => void | Promise<void>;
  children: ReactNode;
}) {
  const [voice, setVoice] = useState<BookAudioVoice>(initialSource.voice);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(initialSource.url);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [voiceReloadKey, setVoiceReloadKey] = useState(0);

  useEffect(() => {
    setVoice(initialSource.voice);
    setPlaybackUrl(initialSource.url);
    setIsAudioLoading(false);
    setLoadError(null);
  }, [bookId, initialSource.voice, initialSource.url]);

  useEffect(() => {
    if (voice === initialSource.voice) {
      setPlaybackUrl(initialSource.url);
      setIsAudioLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setPlaybackUrl(null);
    setIsAudioLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const url = await resolveBookAudioPlaybackUrl(bookId, voice);
        if (cancelled) return;
        if (url) {
          setPlaybackUrl(url);
        } else {
          setLoadError("Не удалось загрузить аудио для выбранного голоса.");
        }
      } catch {
        if (!cancelled) {
          setPlaybackUrl(null);
          setLoadError("Не удалось загрузить аудио. Проверьте подключение к сети.");
        }
      } finally {
        if (!cancelled) setIsAudioLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, initialSource.voice, initialSource.url, voice, voiceReloadKey]);

  const retryVoiceLoad = useCallback(() => {
    setLoadError(null);
    setVoiceReloadKey((k) => k + 1);
  }, []);

  const player = useAudioPlayer(playbackUrl, {
    updateInterval: 250,
    downloadFirst: false,
  });
  const status = useAudioPlayerStatus(player);
  const statusRef = useRef(status);
  statusRef.current = status;
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "duckOthers",
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    });
  }, []);

  const play = useCallback(() => {
    if (!playbackUrl) return;
    player.play();
  }, [playbackUrl, player]);

  const pause = useCallback(() => {
    player.pause();
  }, [player]);

  const togglePlayback = useCallback(() => {
    if (!playbackUrl) return;
    if (player.playing) {
      player.pause();
      return;
    }
    const s = statusRef.current;
    if (s.duration > 0 && s.currentTime >= s.duration - 0.25) {
      void player.seekTo(0);
    }
    player.play();
  }, [playbackUrl, player]);

  const seekToFraction = useCallback(
    (fraction: number) => {
      const d = statusRef.current.duration;
      if (!d || !Number.isFinite(d)) return;
      const t = Math.max(0, Math.min(1, fraction)) * d;
      void player.seekTo(t);
    },
    [player],
  );

  const flushListeningSession = useCallback(() => {
    if (!onSessionFlush) return;
    const s = statusRef.current;
    const audioPositionMs = Math.max(0, Math.round(s.currentTime * 1000));
    void onSessionFlush(audioPositionMs);
  }, [onSessionFlush]);

  useEffect(() => {
    if (!onSessionFlush || !player.playing) return;

    const interval = setInterval(() => {
      flushListeningSession();
    }, LISTEN_FLUSH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [flushListeningSession, onSessionFlush, player.playing]);

  useEffect(() => {
    if (!onSessionFlush) return;
    if (wasPlayingRef.current && !player.playing) {
      flushListeningSession();
    }
    wasPlayingRef.current = player.playing;
  }, [flushListeningSession, onSessionFlush, player.playing]);

  useEffect(() => {
    return () => {
      flushListeningSession();
    };
  }, [flushListeningSession]);

  const value = useMemo(
    () => ({
      voice,
      setVoice,
      voices: BOOK_AUDIO_VOICES,
      /** Resolved signed or public URL used by the native player. */
      audioUrl: playbackUrl,
      isAudioLoading,
      loadError,
      status,
      play,
      pause,
      togglePlayback,
      seekToFraction,
      retryVoiceLoad,
    }),
    [
      voice,
      playbackUrl,
      isAudioLoading,
      loadError,
      status,
      play,
      pause,
      togglePlayback,
      seekToFraction,
      retryVoiceLoad,
    ],
  );

  return (
    <ReaderBookAudioContext.Provider value={value}>
      {children}
    </ReaderBookAudioContext.Provider>
  );
}

export function useReaderBookAudio(): ReaderBookAudioContextValue {
  const ctx = useContext(ReaderBookAudioContext);
  if (!ctx) {
    throw new Error("useReaderBookAudio must be used within ReaderBookAudioProvider");
  }
  return ctx;
}
