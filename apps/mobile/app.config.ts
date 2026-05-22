import { config } from "dotenv";
import path from "path";
import type { ConfigContext, ExpoConfig } from "expo/config";

config({ path: path.resolve(__dirname, "../../.env") });

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins ?? [])];
  const hasExpoAudio = plugins.some(
    (p) => p === "expo-audio" || (Array.isArray(p) && p[0] === "expo-audio"),
  );
  if (!hasExpoAudio) {
    plugins.push([
      "expo-audio",
      {
        enableBackgroundPlayback: true,
        recordAudioAndroid: false,
      },
    ]);
  }

  return {
    ...config,
    plugins,
    extra: {
      ...config.extra,
      supabaseBookCoversBucket:
        process.env.EXPO_PUBLIC_SUPABASE_BOOK_COVERS_BUCKET?.trim() ||
        process.env.SUPABASE_BOOK_COVERS_BUCKET?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() ||
        "public",
      supabaseBookAudioBucket:
        process.env.SUPABASE_BOOK_AUDIO_BUCKET?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_BOOK_AUDIO_BUCKET?.trim() ||
        "book-audio",
    },
  } as ExpoConfig;
};
