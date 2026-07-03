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
import { InterfaceLanguageProvider } from "@/shared/context/interface-language-context";
import { ThemePreferenceProvider } from "@/shared/context/theme-preference-context";
import { LibraryProvider } from "@/features/library";
import { QuotesProvider } from "@/features/quotes";
import { ReaderSettingsProvider } from "@/features/reader/settings/reader-settings-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import {
  ReadupColors,
  ReadupDarkColors,
} from "@/shared/constants/readup-theme";
import "../global.css";

const lightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: ReadupColors.brand,
    background: ReadupColors.background,
    card: ReadupColors.surface,
    text: ReadupColors.text,
    border: ReadupColors.border,
  },
};

const darkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: ReadupDarkColors.brand,
    background: ReadupDarkColors.background,
    card: ReadupDarkColors.surface,
    text: ReadupDarkColors.text,
    border: ReadupDarkColors.border,
    notification: ReadupDarkColors.brand,
  },
};

export const unstable_settings = {
  /** Default stack base when dismissing modals / nested stacks (For you tab). */
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <ThemeProvider
          value={
            colorScheme === "dark" ? darkNavigationTheme : lightNavigationTheme
          }
        >
          <AuthProvider>
            <InterfaceLanguageProvider>
              <LibraryProvider>
                <QuotesProvider>
                  <ReaderSettingsProvider>
                    <Stack>
                      <Stack.Screen
                        name="(onboarding)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(auth)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="(setup)"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="settings"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="reader/[bookId]"
                        options={{ headerShown: false }}
                      />
                      <Stack.Screen
                        name="book/[bookId]"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="quiz/[bookId]"
                        options={{
                          headerShown: false,
                          animation: "slide_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="streak"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="achievements"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                      <Stack.Screen
                        name="subscription"
                        options={{
                          headerShown: false,
                          animation: "slide_from_bottom",
                        }}
                      />
                      <Stack.Screen
                        name="notifications"
                        options={{
                          headerShown: false,
                          animation: "slide_from_right",
                        }}
                      />
                    </Stack>
                  </ReaderSettingsProvider>
                </QuotesProvider>
              </LibraryProvider>
            </InterfaceLanguageProvider>
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
