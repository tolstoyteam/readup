import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform } from "react-native";
import "react-native-reanimated";

import { AuthProvider } from "@/shared/context/auth-context";
import { OnboardingProvider } from "@/features/onboarding/context/onboarding-context";
import { InterfaceLanguageProvider } from "@/shared/context/interface-language-context";
import { ThemePreferenceProvider } from "@/shared/context/theme-preference-context";
import { LibraryProvider } from "@/features/library";
import { PushNotificationsRegistrar } from "@/features/notifications/components/push-notifications-registrar";
import { QuotesProvider } from "@/features/quotes";
import { ReaderSettingsProvider } from "@/features/reader/settings/reader-settings-context";
import { SubscriptionProvider } from "@/features/subscription";
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
          <InterfaceLanguageProvider>
            <AuthProvider>
              <OnboardingProvider>
              <PushNotificationsRegistrar />
              <SubscriptionProvider>
                <LibraryProvider>
                  <QuotesProvider>
                    <ReaderSettingsProvider>
                      <Stack>
                        <Stack.Screen
                          name="(intro)"
                          options={{ headerShown: false }}
                        />
                        <Stack.Screen
                          name="onboarding"
                          options={{ headerShown: false, gestureEnabled: false }}
                        />
                        <Stack.Screen
                          name="(tabs)"
                          options={{
                            headerShown: false,
                            gestureEnabled: false,
                          }}
                        />
                        <Stack.Screen
                          name="explore"
                          options={{
                            headerShown: false,
                            animation: "none",
                          }}
                        />
                        <Stack.Screen
                          name="(auth)"
                          options={{
                            headerShown: false,
                            ...(Platform.OS === "ios"
                              ? {
                                  presentation: "transparentModal" as const,
                                  animation: "none" as const,
                                  contentStyle: { backgroundColor: "transparent" },
                                }
                              : {
                                  presentation: "formSheet" as const,
                                  sheetAllowedDetents: [0.9, 1],
                                  sheetInitialDetentIndex: 0,
                                  sheetGrabberVisible: true,
                                  contentStyle: {
                                    backgroundColor:
                                      colorScheme === "dark"
                                        ? ReadupDarkColors.background
                                        : ReadupColors.background,
                                  },
                                }),
                          }}
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
                          options={{
                            headerShown: false,
                            animation: "slide_from_right",
                          }}
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
                            presentation: "formSheet",
                            sheetAllowedDetents: [0.92, 1],
                            sheetInitialDetentIndex: 0,
                            sheetGrabberVisible: true,
                            sheetExpandsWhenScrolledToEdge: false,
                            sheetCornerRadius: 28,
                            contentStyle: {
                              backgroundColor:
                                colorScheme === "dark"
                                  ? ReadupDarkColors.background
                                  : ReadupColors.background,
                            },
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
                            ...(Platform.OS === "ios"
                              ? {
                                  presentation: "transparentModal" as const,
                                  animation: "none" as const,
                                  contentStyle: { backgroundColor: "transparent" },
                                }
                              : {
                                  presentation: "formSheet" as const,
                                  sheetAllowedDetents: [0.9, 1],
                                  sheetInitialDetentIndex: 0,
                                  sheetGrabberVisible: true,
                                  contentStyle: {
                                    backgroundColor:
                                      colorScheme === "dark"
                                        ? ReadupDarkColors.background
                                        : ReadupColors.background,
                                  },
                                }),
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
              </SubscriptionProvider>
              </OnboardingProvider>
            </AuthProvider>
            <StatusBar style="auto" />
          </InterfaceLanguageProvider>
        </ThemeProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}
