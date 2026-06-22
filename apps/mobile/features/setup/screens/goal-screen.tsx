import { Redirect, router } from "expo-router";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchProfile, saveGoal } from "@/features/profile/api/profile";
import { GOALS } from "@/features/setup/constants";
import { PrimaryButton } from "@/shared/components/primary-button";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

export default function GoalScreen() {
  const colors = useReadupColors();
  const { user, loading } = useAuth();
  const [goal, setGoal] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
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
        if (mounted) setGoal(profile?.reading_goal ?? null);
      })
      .catch(() => {
        if (mounted) setGoal(null);
      })
      .finally(() => {
        if (mounted) setLoadingProfile(false);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  async function submit(nextGoal: string | null) {
    if (!user) return;
    setSaving(true);
    try {
      await saveGoal(user.id, nextGoal);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Не удалось сохранить цель",
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
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-[37px] pt-[154px]"
      >
        <Text className="mx-auto w-[319px] text-center text-[34px] font-extrabold leading-[36px] tracking-[-1.36px] text-[#059669] dark:text-[#34D399]">
          Какой цели вы хотите достичь?
        </Text>

        <View className="mt-[84px]">
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((value) => !value)}
            className="h-[48px] flex-row items-center justify-between rounded-[30px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] px-4 active:opacity-80"
          >
            <Text
              className="flex-1 text-[14px] tracking-[-0.56px]"
              style={{
                color: goal ? colors.text : colors.textTertiary,
              }}
              numberOfLines={1}
            >
              {goal ?? "Выберите цель"}
            </Text>
            {expanded ? (
              <ChevronUp
                size={18}
                color={colors.textTertiary}
                strokeWidth={2}
              />
            ) : (
              <ChevronDown
                size={18}
                color={colors.textTertiary}
                strokeWidth={2}
              />
            )}
          </Pressable>

          {expanded ? (
            <View className="mt-2 overflow-hidden rounded-[24px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D]">
              {GOALS.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => {
                    setGoal(item);
                    setExpanded(false);
                  }}
                  className="border-b border-[#E8E6D8] dark:border-[#2A3630] px-4 py-3 active:opacity-80"
                >
                  <Text className="text-[14px] tracking-[-0.56px] text-[#1A2420] dark:text-[#F3F4EE]">
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="px-8 pb-5">
        <PrimaryButton
          label="Завершить"
          loading={saving}
          disabled={!goal}
          onPress={() => submit(goal)}
        />
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => submit(null)}
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
