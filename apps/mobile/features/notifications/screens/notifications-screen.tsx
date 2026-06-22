import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Award,
  BellRing,
  Flame,
  ListChecks,
  Sparkles,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchNotifications,
  markNotificationsRead,
  type AppNotification,
  type NotificationType,
} from "@/features/notifications/api/notifications";
import {
  fetchProfile,
  saveNotificationPreferences,
  type NotificationPreferences,
  type Profile,
} from "@/features/profile/api/profile";
import { ReadupColors, useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

const PREF_TOGGLES: { key: keyof NotificationPreferences; label: string }[] = [
  { key: "daily_reminder", label: "Напоминания о чтении" },
  { key: "streak_alerts", label: "Серия чтения" },
  { key: "new_content", label: "Новые материалы" },
  { key: "quiz_reminders", label: "Тесты" },
  { key: "achievements", label: "Достижения" },
];

function iconForType(type: NotificationType) {
  switch (type) {
    case "achievement":
      return Award;
    case "streak_reminder":
      return Flame;
    case "quiz_reminder":
      return ListChecks;
    case "new_content":
      return Sparkles;
    case "daily_reading":
    default:
      return BellRing;
  }
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "только что";
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} ч назад`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const colors = useReadupColors();
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [notif, prof] = await Promise.all([
        fetchNotifications(user.id),
        fetchProfile(user.id),
      ]);
      setNotifications(notif);
      setProfile(prof);

      const unread = notif.filter((row) => !row.readAt).map((row) => row.id);
      if (unread.length > 0) {
        void markNotificationsRead(user.id, unread).catch(() => undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePref(
    key: keyof NotificationPreferences,
    value: boolean,
  ) {
    if (!user || !profile) return;
    const next: NotificationPreferences = {
      ...profile.notification_preferences,
      [key]: value,
    };
    setProfile({ ...profile, notification_preferences: next });
    try {
      const saved = await saveNotificationPreferences(user.id, next);
      setProfile(saved);
    } catch {
      setProfile(profile);
    }
  }

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-80"
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text className="text-[18px] font-semibold tracking-[-0.72px] text-[#1A2420] dark:text-[#F3F4EE]">
          Уведомления
        </Text>
        <View className="h-10 w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-10"
          ListHeaderComponent={
            <View className="mb-4">
              {profile ? (
                <View className="mb-6 gap-2 rounded-[20px] bg-[#F2F0E6] dark:bg-[#19211D] px-4 py-4">
                  <Text className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]">
                    Настройки
                  </Text>
                  {PREF_TOGGLES.map((toggle) => (
                    <View
                      key={toggle.key}
                      className="flex-row items-center justify-between py-1.5"
                    >
                      <Text className="flex-1 text-[14px] tracking-[-0.56px] text-[#1A2420] dark:text-[#F3F4EE]">
                        {toggle.label}
                      </Text>
                      <Switch
                        value={
                          profile.notification_preferences[toggle.key] === true
                        }
                        onValueChange={(value) => togglePref(toggle.key, value)}
                        trackColor={{
                          false: colors.elevated,
                          true: colors.brand,
                        }}
                        thumbColor={colors.background}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center px-6 pt-8">
              <BellRing
                size={28}
                color={colors.textTertiary}
                strokeWidth={2}
              />
              <Text className="mt-3 text-center text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]">
                Здесь будут появляться напоминания, награды и обновления.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const Icon = iconForType(item.type);
            return (
              <View className="mb-3 flex-row items-start gap-3 rounded-[16px] bg-[#F2F0E6] dark:bg-[#19211D] px-4 py-3.5">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-[#ECFDF5] dark:bg-[#123D2C]">
                  <Icon
                    size={18}
                    color={colors.brand}
                    strokeWidth={2.2}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]">
                    {item.title}
                  </Text>
                  {item.body ? (
                    <Text className="mt-0.5 text-[13px] tracking-[-0.52px] text-[#4A5550] dark:text-[#B8C1BB]">
                      {item.body}
                    </Text>
                  ) : null}
                  <Text className="mt-1.5 text-[11px] uppercase tracking-[-0.44px] text-[#7A7868] dark:text-[#8F9A93]">
                    {formatRelative(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
