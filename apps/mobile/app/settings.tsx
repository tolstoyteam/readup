import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import { PrimaryButton } from "@/shared/components/primary-button";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useThemePreference } from "@/shared/context/theme-preference-context";
import type { InterfaceLanguage } from "@/shared/i18n/interface-language";
import type { TranslationKey } from "@/shared/i18n/translations";
import type { ThemePreference } from "@/shared/theme/theme-preference";

const THEME_OPTIONS: { labelKey: TranslationKey; value: ThemePreference }[] = [
  { labelKey: "settings.themeLight", value: "light" },
  { labelKey: "settings.themeDark", value: "dark" },
  { labelKey: "settings.themeSystem", value: "system" },
];

const LANGUAGE_OPTIONS: {
  labelKey: TranslationKey;
  value: InterfaceLanguage;
}[] = [
  { labelKey: "settings.languageRussian", value: "ru" },
  { labelKey: "settings.languageEnglish", value: "en" },
  { labelKey: "settings.languageSpanish", value: "es" },
];

function hasEmailIdentity(
  user: { identities?: { provider: string }[] | null } | null,
): boolean {
  return user?.identities?.some((i) => i.provider === "email") ?? false;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function SettingsScreen() {
  const colors = useReadupColors();
  const { preference, setPreference } = useThemePreference();
  const { language, setLanguage, t } = useInterfaceLanguage();
  const { user, updateEmail, updatePassword, signOut } = useAuth();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [emailEditing, setEmailEditing] = useState(false);
  const [nextEmail, setNextEmail] = useState(user?.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);

  const [passwordEditing, setPasswordEditing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const emailEnabled = useMemo(() => hasEmailIdentity(user), [user]);

  if (!fontsLoaded) return null;
  if (!user) return null;

  const cardClass =
    "rounded-[20px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-4";

  async function onSaveEmail() {
    const trimmed = nextEmail.trim();
    if (!looksLikeEmail(trimmed)) {
      Alert.alert(
        t("settings.emailInvalidTitle"),
        t("settings.emailInvalidBody"),
      );
      return;
    }

    setSavingEmail(true);
    try {
      const { error } = await updateEmail(trimmed);
      if (error) {
        Alert.alert(t("settings.emailSaveFailed"), error.message);
        return;
      }
      setEmailEditing(false);
      Alert.alert(
        t("settings.emailUpdatedTitle"),
        t("settings.emailUpdatedBody"),
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function onSavePassword() {
    if (newPassword.length < 6) {
      Alert.alert(
        t("settings.passwordTooShortTitle"),
        t("settings.passwordTooShortBody"),
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("settings.passwordMismatchTitle"),
        t("settings.passwordMismatchBody"),
      );
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        Alert.alert(t("settings.passwordSaveFailed"), error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setPasswordEditing(false);
      Alert.alert(
        t("settings.passwordUpdatedTitle"),
        t("settings.passwordUpdatedBody"),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function onSignOut() {
    const { error } = await signOut();
    if (error) {
      Alert.alert(t("settings.signOutFailed"), error.message);
      return;
    }
    router.replace("/login");
  }

  function onDeleteAccount() {
    Alert.alert(
      t("settings.deleteAccountAlertTitle"),
      t("settings.deleteAccountAlertBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.deleteAccount"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("settings.deleteUnavailableTitle"),
              t("settings.deleteUnavailableBody"),
            );
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-[30px] pb-10 pt-3"
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            onPress={() => router.back()}
            hitSlop={10}
            className="active:opacity-70"
          >
            <ArrowLeft size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text
            className="text-[22px] leading-7 tracking-[-0.88px] text-[#1A2420] dark:text-[#F3F4EE]"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {t("settings.title")}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("settings.appearance")}
          </Text>

          <View className="mt-3 flex-row gap-1 rounded-xl border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-1">
            {THEME_OPTIONS.map((option) => {
              const active = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPreference(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
                    active
                      ? "bg-[#FBFAF2] dark:bg-[#101512]"
                      : "active:opacity-70"
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      active
                        ? "text-[#1A2420] dark:text-[#F3F4EE]"
                        : "text-[#7A7868] dark:text-[#8F9A93]"
                    }`}
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("settings.interfaceLanguage")}
          </Text>

          <View className="mt-3 flex-row gap-1 rounded-xl border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-1">
            {LANGUAGE_OPTIONS.map((option) => {
              const active = language === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setLanguage(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
                    active
                      ? "bg-[#FBFAF2] dark:bg-[#101512]"
                      : "active:opacity-70"
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      active
                        ? "text-[#1A2420] dark:text-[#F3F4EE]"
                        : "text-[#7A7868] dark:text-[#8F9A93]"
                    }`}
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            Email
          </Text>

          <View className="mt-2 gap-3">
            <Text
              className="text-[18px] font-medium tracking-[-0.72px]"
              style={{
                fontFamily: "Inter_500Medium",
                color: user.email ? colors.text : colors.textTertiary,
              }}
            >
              {user.email ?? t("common.notSpecified")}
            </Text>

            {!emailEnabled ? (
              <Text
                className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {t("settings.emailOauthUnavailable")}
              </Text>
            ) : null}

            {emailEditing ? (
              <View className="gap-3">
                <ReadupTextField
                  label={t("settings.newEmail")}
                  labelFontFamily="Inter_500Medium"
                  value={nextEmail}
                  onChangeText={setNextEmail}
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  style={{ fontFamily: "Inter_400Regular" }}
                />
                <PrimaryButton
                  label={t("common.save")}
                  loading={savingEmail}
                  disabled={!emailEnabled || savingEmail}
                  onPress={() => void onSaveEmail()}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={savingEmail}
                  onPress={() => {
                    setNextEmail(user.email ?? "");
                    setEmailEditing(false);
                  }}
                  className="items-center py-2 active:opacity-70"
                >
                  <Text
                    className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]"
                    style={{ fontFamily: "Inter_400Regular" }}
                  >
                    {t("common.cancel")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={!emailEnabled}
                onPress={() => setEmailEditing(true)}
                className="self-start active:opacity-70"
                style={{ opacity: emailEnabled ? 1 : 0.6 }}
              >
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#059669] dark:text-[#34D399]"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {t("common.change")}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("settings.password")}
          </Text>

          {passwordEditing ? (
            <View className="mt-3 gap-3">
              <ReadupTextField
                label={t("settings.newPassword")}
                labelFontFamily="Inter_500Medium"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder={t("settings.passwordPlaceholder")}
                secureTextEntry
                autoComplete="new-password"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              <ReadupTextField
                label={t("settings.repeatPassword")}
                labelFontFamily="Inter_500Medium"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t("settings.repeatPassword")}
                secureTextEntry
                autoComplete="new-password"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              <PrimaryButton
                label={t("common.save")}
                loading={savingPassword}
                disabled={savingPassword}
                onPress={() => void onSavePassword()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingPassword}
                onPress={() => {
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordEditing(false);
                }}
                className="items-center py-2 active:opacity-70"
              >
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {t("common.cancel")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-2 gap-3">
              <Text
                className="text-[14px] tracking-[-0.56px] text-[#7A7868] dark:text-[#8F9A93]"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {t("settings.updatePasswordHint")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPasswordEditing(true)}
                className="self-start active:opacity-70"
              >
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#059669] dark:text-[#34D399]"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {t("common.change")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("settings.session")}
          </Text>
          <View className="mt-3">
            <PrimaryButton
              label={t("settings.signOut")}
              onPress={() => void onSignOut()}
            />
          </View>
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("settings.dangerZone")}
          </Text>
          <Text
            className="mt-2 text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("settings.deleteAccountBody")}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onDeleteAccount}
            className="mt-3 items-center justify-center rounded-[100px] border px-4 py-3 active:opacity-80"
            style={{
              borderColor: "#DC2626",
              backgroundColor: "transparent",
            }}
          >
            <Text
              className="text-[18px] font-medium tracking-[-0.72px]"
              style={{ fontFamily: "Inter_500Medium", color: "#DC2626" }}
            >
              {t("settings.deleteAccount")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
