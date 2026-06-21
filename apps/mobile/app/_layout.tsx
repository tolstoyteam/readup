import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AuthProvider } from "@/shared/context/auth-context";
import { LibraryProvider } from "@/features/library";
import { ReaderSettingsProvider } from "@/features/reader/settings/reader-settings-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import "../global.css";

export const unstable_settings = {
  /** Default stack base when dismissing modals / nested stacks (For you tab). */
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <LibraryProvider>
          <ReaderSettingsProvider>
          <Stack>
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(setup)" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen name="reader/[bookId]" options={{ headerShown: false }} />
            <Stack.Screen
              name="book/[bookId]"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="quiz/[bookId]"
              options={{ headerShown: false, animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="streak"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="achievements"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
            <Stack.Screen
              name="subscription"
              options={{ headerShown: false, animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="notifications"
              options={{ headerShown: false, animation: "slide_from_right" }}
            />
          </Stack>
          </ReaderSettingsProvider>
          </LibraryProvider>
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
