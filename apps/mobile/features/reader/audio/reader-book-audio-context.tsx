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
  status: ReturnType<typeof useAudioPlayerStatus>;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seekToFraction: (fraction: number) => void;
};

const ReaderBookAudioContext =
  createContext<ReaderBookAudioContextValue | null>(null);

export function ReaderBookAudioProvider({
  bookId,
  initialSource,
  children,
}: {
  bookId: string;
  initialSource: ResolvedBookAudioSource;
  children: ReactNode;
}) {
  const [voice, setVoice] = useState<BookAudioVoice>(initialSource.voice);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(initialSource.url);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  useEffect(() => {
    setVoice(initialSource.voice);
    setPlaybackUrl(initialSource.url);
    setIsAudioLoading(false);
  }, [bookId, initialSource.voice, initialSource.url]);

  useEffect(() => {
    if (voice === initialSource.voice) {
      setPlaybackUrl(initialSource.url);
      setIsAudioLoading(false);
      return;
    }

    let cancelled = false;
    setPlaybackUrl(null);
    setIsAudioLoading(true);
    void (async () => {
      try {
        const url = await resolveBookAudioPlaybackUrl(bookId, voice);
        if (!cancelled) setPlaybackUrl(url);
      } catch {
        if (!cancelled) setPlaybackUrl(null);
      } finally {
        if (!cancelled) setIsAudioLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, initialSource.voice, initialSource.url, voice]);

  const player = useAudioPlayer(playbackUrl, {
    updateInterval: 250,
    downloadFirst: false,
  });
  const status = useAudioPlayerStatus(player);
  const statusRef = useRef(status);
  statusRef.current = status;

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

  const value = useMemo(
    () => ({
      voice,
      setVoice,
      voices: BOOK_AUDIO_VOICES,
      /** Resolved signed or public URL used by the native player. */
      audioUrl: playbackUrl,
      isAudioLoading,
      status,
      play,
      pause,
      togglePlayback,
      seekToFraction,
    }),
    [
      voice,
      playbackUrl,
      isAudioLoading,
      status,
      play,
      pause,
      togglePlayback,
      seekToFraction,
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
