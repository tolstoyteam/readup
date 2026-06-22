import { Redirect, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchProfile, saveInterests } from "@/features/profile/api/profile";
import { INTEREST_GROUPS } from "@/features/setup/constants";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

export default function InterestsScreen() {
  const colors = useReadupColors();
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    let mounted = true;
    setLoadingProfile(true);
    void fetchProfile(user.id)
      .then((profile) => {
        if (mounted) setSelected(profile?.selected_interests ?? []);
      })
      .catch(() => {
        if (mounted) setSelected([]);
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggleInterest(interest: string) {
    setSelected((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function submit(nextInterests: string[]) {
    if (!user) return;
    setSaving(true);
    try {
      await saveInterests(user.id, nextInterests);
      router.replace("/(setup)/goal");
    } catch (error) {
      Alert.alert(
        "Не удалось сохранить интересы",
        error instanceof Error ? error.message : "Попробуйте еще раз.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || loadingProfile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512]">
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top", "bottom"]}
    >
      <View className="items-center pt-8">
        <ReadupLogo />
      </View>
      <Text className="mx-auto mt-[86px] w-[319px] text-center text-[34px] font-extrabold leading-[36px] tracking-[-1.36px] text-[#059669] dark:text-[#34D399]">
        Что тебя интересует?
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-[30px] pb-8 pt-[56px]"
      >
        {INTEREST_GROUPS.map((group) => (
          <View key={group.title} className="gap-2">
            <Text className="text-[18px] font-medium tracking-[-0.72px] text-[#1A2420] dark:text-[#F3F4EE]">
              {group.title}
            </Text>
            <View className="flex-row flex-wrap gap-1">
              {group.items.map((interest) => {
                const active = selectedSet.has(interest);
                return (
                  <Pressable
                    key={interest}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => toggleInterest(interest)}
                    className="rounded-full border px-3 py-1 active:opacity-80"
                    style={{
                      borderColor: colors.brand,
                      backgroundColor: active
                        ? colors.brand
                        : "transparent",
                    }}
                  >
                    <Text
                      className="text-center text-[14px] tracking-[-0.56px]"
                      style={{
                        color: active
                          ? colors.textInverse
                          : colors.text,
                      }}
                    >
                      {interest}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="px-8 pb-5">
        <PrimaryButton
          label="Продолжить"
          loading={saving}
          onPress={() => submit(selected)}
        />
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => submit([])}
          className="items-center py-3 active:opacity-70"
        >
          <Text className="text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]">
            Пропустить
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
