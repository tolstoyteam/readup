import { config } from "dotenv";
import path from "path";
import type { ConfigContext, ExpoConfig } from "expo/config";

config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

function hasPlugin(
  plugins: ExpoConfig["plugins"],
  name: string,
): boolean {
  return (plugins ?? []).some(
    (p) => p === name || (Array.isArray(p) && p[0] === name),
  );
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins = [...(config.plugins ?? [])];

  for (const name of [
    "expo-font",
    "expo-image",
    "expo-localization",
    "expo-status-bar",
    "expo-web-browser",
    "expo-dev-client",
  ] as const) {
    if (!hasPlugin(plugins, name)) {
      plugins.push(name);
    }
  }

  if (!hasPlugin(plugins, "expo-audio")) {
    plugins.push([
      "expo-audio",
      {
        enableBackgroundPlayback: true,
        recordAudioAndroid: false,
      },
    ]);
  }
  if (!hasPlugin(plugins, "expo-notifications")) {
    plugins.push([
      "expo-notifications",
      {
        color: "#2F7D5B",
        defaultChannel: "default",
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
