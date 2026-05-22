import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

function hasEmailIdentity(
  user: { identities?: { provider: string }[] | null } | null,
): boolean {
  return user?.identities?.some((i) => i.provider === "email") ?? false;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function SettingsScreen() {
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

  const cardClass = "rounded-[20px] border border-[#E8E6D8] bg-[#F2F0E6] p-4";

  async function onSaveEmail() {
    const trimmed = nextEmail.trim();
    if (!looksLikeEmail(trimmed)) {
      Alert.alert("Некорректный email", "Пожалуйста, введите корректный адрес.");
      return;
    }

    setSavingEmail(true);
    try {
      const { error } = await updateEmail(trimmed);
      if (error) {
        Alert.alert("Не удалось изменить email", error.message);
        return;
      }
      setEmailEditing(false);
      Alert.alert(
        "Email обновлён",
        "Проверьте почту, чтобы подтвердить новый email (если требуется).",
      );
    } finally {
      setSavingEmail(false);
    }
  }

  async function onSavePassword() {
    if (newPassword.length < 6) {
      Alert.alert("Слишком короткий пароль", "Минимальная длина пароля — 6 символов.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Пароли не совпадают", "Проверьте поля и попробуйте ещё раз.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        Alert.alert("Не удалось изменить пароль", error.message);
        return;
      }
      setNewPassword("");
      setConfirmPassword("");
      setPasswordEditing(false);
      Alert.alert("Пароль обновлён", "Теперь вы можете войти с новым паролем.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function onSignOut() {
    const { error } = await signOut();
    if (error) {
      Alert.alert("Не удалось выйти", error.message);
      return;
    }
    router.replace("/login");
  }

  function onDeleteAccount() {
    Alert.alert(
      "Удалить аккаунт?",
      "Это действие необратимо. Профиль и данные будут удалены.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Функция пока не подключена",
              "Чтобы удалить аккаунт безопасно, нужна серверная функция Supabase (Edge Function) с правами администратора. Мы можем подключить её следующим шагом.",
            );
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-[30px] pb-10 pt-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={() => router.back()}
            hitSlop={10}
            className="active:opacity-70">
            <ArrowLeft size={22} color={ReadupColors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text
            className="text-[22px] leading-7 tracking-[-0.88px] text-[#1A2420]"
            style={{ fontFamily: "Inter_600SemiBold" }}>
            Настройки
          </Text>
          <View style={{ width: 22 }} />
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550]"
            style={{ fontFamily: "Inter_400Regular" }}>
            Email
          </Text>

          <View className="mt-2 gap-3">
            <Text
              className="text-[18px] font-medium tracking-[-0.72px]"
              style={{
                fontFamily: "Inter_500Medium",
                color: user.email ? ReadupColors.text : ReadupColors.textTertiary,
              }}>
              {user.email ?? "Не указан"}
            </Text>

            {!emailEnabled ? (
              <Text
                className="text-[12px] tracking-[-0.48px] text-[#7A7868]"
                style={{ fontFamily: "Inter_400Regular" }}>
                Изменение email недоступно для входа через OAuth.
              </Text>
            ) : null}

            {emailEditing ? (
              <View className="gap-3">
                <ReadupTextField
                  label="Новый email"
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
                  label="Сохранить"
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
                  className="items-center py-2 active:opacity-70">
                  <Text
                    className="text-[12px] tracking-[-0.48px] text-[#7A7868]"
                    style={{ fontFamily: "Inter_400Regular" }}>
                    Отмена
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={!emailEnabled}
                onPress={() => setEmailEditing(true)}
                className="self-start active:opacity-70"
                style={{ opacity: emailEnabled ? 1 : 0.6 }}>
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#059669]"
                  style={{ fontFamily: "Inter_400Regular" }}>
                  Изменить
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550]"
            style={{ fontFamily: "Inter_400Regular" }}>
            Пароль
          </Text>

          {passwordEditing ? (
            <View className="mt-3 gap-3">
              <ReadupTextField
                label="Новый пароль"
                labelFontFamily="Inter_500Medium"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Введите новый пароль"
                secureTextEntry
                autoComplete="new-password"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              <ReadupTextField
                label="Повторите пароль"
                labelFontFamily="Inter_500Medium"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Повторите пароль"
                secureTextEntry
                autoComplete="new-password"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              <PrimaryButton
                label="Сохранить"
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
                className="items-center py-2 active:opacity-70">
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#7A7868]"
                  style={{ fontFamily: "Inter_400Regular" }}>
                  Отмена
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-2 gap-3">
              <Text
                className="text-[14px] tracking-[-0.56px] text-[#7A7868]"
                style={{ fontFamily: "Inter_400Regular" }}>
                Обновите пароль для входа по email.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPasswordEditing(true)}
                className="self-start active:opacity-70">
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#059669]"
                  style={{ fontFamily: "Inter_400Regular" }}>
                  Изменить
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550]"
            style={{ fontFamily: "Inter_400Regular" }}>
            Сессия
          </Text>
          <View className="mt-3">
            <PrimaryButton label="Выйти" onPress={() => void onSignOut()} />
          </View>
        </View>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550]"
            style={{ fontFamily: "Inter_400Regular" }}>
            Опасная зона
          </Text>
          <Text
            className="mt-2 text-[12px] tracking-[-0.48px] text-[#7A7868]"
            style={{ fontFamily: "Inter_400Regular" }}>
            Удаление аккаунта необратимо. Это действие удалит ваши данные.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onDeleteAccount}
            className="mt-3 items-center justify-center rounded-[100px] border px-4 py-3 active:opacity-80"
            style={{
              borderColor: "#DC2626",
              backgroundColor: "transparent",
            }}>
            <Text
              className="text-[18px] font-medium tracking-[-0.72px]"
              style={{ fontFamily: "Inter_500Medium", color: "#DC2626" }}>
              Удалить аккаунт
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

