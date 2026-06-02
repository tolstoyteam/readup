import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { type Href, router, useFocusEffect } from "expo-router";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Crown,
  Flame,
  Settings,
  Trophy,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReadupTextField } from "@/features/auth/components/readup-text-field";
import { fetchBooks } from "@/features/books/api/books";
import { BookCard, type BookCardItem } from "@/features/books/components/book-card";
import { AchievementIcon } from "@/features/achievements/components/achievement-icon";
import { useAchievements } from "@/features/achievements/hooks/use-achievements";
import {
  ensureProfile,
  fetchProfile,
  saveGoal,
  saveInterests,
  type Profile,
} from "@/features/profile/api/profile";
import { GOALS, INTEREST_GROUPS } from "@/features/setup/constants";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { ReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import {
  buildBookCatalogMap,
  joinLibraryBooks,
  useLibrary,
} from "@/features/library";

function readFullNameFromUser(user: { user_metadata?: Record<string, unknown> }): string {
  const raw = user.user_metadata?.full_name;
  return typeof raw === "string" ? raw : "";
}

function interestsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function hasEmailIdentity(
  user: { identities?: { provider: string }[] | null } | null,
): boolean {
  return user?.identities?.some((i) => i.provider === "email") ?? false;
}

export default function ProfileScreen() {
  const { user, updateFullName } = useAuth();
  const { savedBooks, loading: libraryLoading } = useLibrary();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState("");
  const [initialFullName, setInitialFullName] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);
  const [interestsEditing, setInterestsEditing] = useState(false);
  const [goalEditing, setGoalEditing] = useState(false);
  const [savingSection, setSavingSection] = useState<null | "name" | "interests" | "goal">(null);
  const [libraryItems, setLibraryItems] = useState<BookCardItem[]>([]);
  const {
    viewModels: achievementViewModels,
    unlockedCount: achievementsUnlockedCount,
    totalCount: achievementsTotalCount,
    reload: reloadAchievements,
  } = useAchievements();

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      let p = await fetchProfile(user.id);
      if (p == null) {
        p = await ensureProfile(user.id);
      }
      setProfile(p);
      setSelectedInterests(p.selected_interests);
      setGoal(p.reading_goal);
    } catch {
      setProfile(null);
      setSelectedInterests([]);
      setGoal(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  const loadSavedPreview = useCallback(async () => {
    if (!user) return;
    try {
      const { books } = await fetchBooks();
      const catalog = buildBookCatalogMap(books);
      const items = joinLibraryBooks(savedBooks, catalog)
        .slice(0, 8)
        .map(({ id, bookId, title, cover }) => ({ id, bookId, title, cover }));
      setLibraryItems(items);
    } catch {
      setLibraryItems([]);
    }
  }, [savedBooks, user]);

  useEffect(() => {
    void loadSavedPreview();
  }, [loadSavedPreview]);

  useEffect(() => {
    if (!user) return;
    const name = readFullNameFromUser(user);
    setFullName(name);
    setInitialFullName(name);
    void loadProfile();
  }, [user, loadProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void reloadAchievements();
    }, [loadProfile, reloadAchievements]),
  );

  const unlockedAchievementPreview = useMemo(
    () => achievementViewModels.filter((row) => row.isUnlocked).slice(0, 3),
    [achievementViewModels],
  );

  const selectedSet = useMemo(() => new Set(selectedInterests), [selectedInterests]);

  function toggleInterest(interest: string) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function saveNameSection() {
    if (!user) return;
    const trimmed = fullName.trim();
    setSavingSection("name");
    try {
      const { error } = await updateFullName(trimmed);
      if (error) {
        Alert.alert("Не удалось сохранить имя", error.message);
        return;
      }
      setInitialFullName(trimmed);
      setNameEditing(false);
    } finally {
      setSavingSection(null);
    }
  }

  async function saveInterestsSection() {
    if (!user || !profile) return;
    setSavingSection("interests");
    try {
      await saveInterests(user.id, selectedInterests);
      await loadProfile();
      setInterestsEditing(false);
    } catch (error) {
      Alert.alert(
        "Ошибка",
        error instanceof Error ? error.message : "Попробуйте еще раз.",
      );
    } finally {
      setSavingSection(null);
    }
  }

  async function saveGoalSection() {
    if (!user || !profile) return;
    setSavingSection("goal");
    try {
      await saveGoal(user.id, goal);
      await loadProfile();
      setGoalEditing(false);
      setGoalPickerOpen(false);
    } catch (error) {
      Alert.alert(
        "Ошибка",
        error instanceof Error ? error.message : "Попробуйте еще раз.",
      );
    } finally {
      setSavingSection(null);
    }
  }

  function cancelNameEdit() {
    setFullName(initialFullName);
    setNameEditing(false);
  }

  function cancelInterestsEdit() {
    setSelectedInterests(profile?.selected_interests ?? []);
    setInterestsEditing(false);
  }

  function cancelGoalEdit() {
    setGoal(profile?.reading_goal ?? null);
    setGoalEditing(false);
    setGoalPickerOpen(false);
  }

  const cardClass = "rounded-[20px] border border-[#E8E6D8] bg-[#F2F0E6] p-4";
  const nameDirty = fullName.trim() !== initialFullName.trim();
  const interestsDirty =
    profile != null && !interestsEqual(selectedInterests, profile.selected_interests);
  const goalDirty = profile != null && goal !== profile.reading_goal;

  if (!fontsLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (loadingProfile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#FBFAF2]" edges={["top"]}>
        <ActivityIndicator size="large" color={ReadupColors.brand} />
      </SafeAreaView>
    );
  }

  if (profile == null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#FBFAF2] px-8" edges={["top"]}>
        <Text
          className="text-center text-[14px] tracking-[-0.56px] text-[#4A5550]"
          style={{ fontFamily: "Inter_400Regular" }}>
          Не удалось загрузить профиль. Закройте экран и откройте снова.
        </Text>
      </SafeAreaView>
    );
  }

  const displayNameSummary = initialFullName.trim();

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF2]" edges={["top"]}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-[30px] pb-10 pt-3">
        <View className="items-center pb-1">
          <ReadupLogo />
        </View>

        <View className="flex-row items-center justify-between">
          <Text
            className="text-[22px] leading-7 tracking-[-0.88px] text-[#1A2420]"
            style={{ fontFamily: "Inter_600SemiBold" }}>
            Профиль
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Уведомления"
              onPress={() => router.push("/notifications")}
              hitSlop={10}
              className="active:opacity-70">
              <Bell size={22} color={ReadupColors.textSecondary} strokeWidth={2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Настройки"
              onPress={() => router.push("/settings")}
              hitSlop={10}
              className="active:opacity-70">
              <Settings size={22} color={ReadupColors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/subscription")}
          className={`${cardClass} flex-row items-center justify-between active:opacity-90`}>
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5]">
              <Crown size={20} color={ReadupColors.brand} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text
                className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420]"
                style={{ fontFamily: "Inter_600SemiBold" }}>
                {profile.is_premium ? "Readup Premium" : "Откройте Premium"}
              </Text>
              <Text
                className="text-[13px] tracking-[-0.52px] text-[#4A5550]"
                style={{ fontFamily: "Inter_400Regular" }}>
                {profile.is_premium
                  ? "Все функции активны"
                  : "Все книги, аудио, тесты без рекламы"}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={ReadupColors.textTertiary} strokeWidth={2} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/streak")}
          className={`${cardClass} active:opacity-90`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Flame size={20} color={ReadupColors.brand} strokeWidth={2.2} />
              <Text
                className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420]"
                style={{ fontFamily: "Inter_600SemiBold" }}>
                Серия и прогресс
              </Text>
            </View>
            <ChevronRight size={20} color={ReadupColors.textTertiary} strokeWidth={2} />
          </View>
          <View className="mt-4 flex-row gap-3">
            <StatPill
              label="Серия"
              value={`${profile.current_streak_days}`}
              unit="дн"
            />
            <StatPill
              label="Книг"
              value={`${profile.total_books_completed}`}
              unit=""
            />
            <StatPill
              label="Минут"
              value={`${profile.total_reading_minutes}`}
              unit=""
            />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/achievements" as Href)}
          className={`${cardClass} active:opacity-90`}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Trophy size={18} color={ReadupColors.brand} strokeWidth={2.2} />
              <View>
                <Text
                  className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420]"
                  style={{ fontFamily: "Inter_600SemiBold" }}>
                  Достижения
                </Text>
                <Text
                  className="text-[13px] tracking-[-0.52px] text-[#7A7868]"
                  style={{ fontFamily: "Inter_400Regular" }}>
                  {achievementsUnlockedCount} из {achievementsTotalCount} получено
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={ReadupColors.textTertiary} strokeWidth={2} />
          </View>
          {unlockedAchievementPreview.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {unlockedAchievementPreview.map((achievement) => (
                <View
                  key={achievement.slug}
                  className="flex-row items-center gap-1.5 rounded-full border border-[#059669] bg-[#ECFDF5] px-3 py-1.5"
                >
                  <AchievementIcon
                    name={achievement.icon}
                    size={14}
                    color={ReadupColors.brand}
                    strokeWidth={2}
                  />
                  <Text
                    className="text-[12px] font-medium tracking-[-0.48px] text-[#059669]"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {achievement.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </Pressable>

        <View className={cardClass}>
          <Text
            className="text-[14px] tracking-[-0.56px] text-[#4A5550]"
            style={{ fontFamily: "Inter_400Regular" }}>
            Имя
          </Text>
          {nameEditing ? (
            <View className="mt-3 gap-3">
              <ReadupTextField
                label="Как вас называть"
                labelFontFamily="Inter_500Medium"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Имя"
                autoComplete="name"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              <PrimaryButton
                label="Сохранить"
                loading={savingSection === "name"}
                disabled={!nameDirty}
                onPress={() => void saveNameSection()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingSection === "name"}
                onPress={cancelNameEdit}
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
                className="text-[18px] font-medium tracking-[-0.72px]"
                style={{
                  fontFamily: "Inter_500Medium",
                  color: displayNameSummary ? ReadupColors.text : ReadupColors.textTertiary,
                }}>
                {displayNameSummary || "Не указано"}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setNameEditing(true)}
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
            Интересы
          </Text>
          {interestsEditing ? (
            <View className="mt-3 gap-4">
              {INTEREST_GROUPS.map((group) => (
                <View key={group.title} className="gap-2">
                  <Text
                    className="text-[18px] font-medium tracking-[-0.72px] text-[#1A2420]"
                    style={{ fontFamily: "Inter_500Medium" }}>
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
                            borderColor: ReadupColors.brand,
                            backgroundColor: active ? ReadupColors.brand : "transparent",
                          }}>
                          <Text
                            className="text-center text-[14px] tracking-[-0.56px]"
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: active ? ReadupColors.textInverse : ReadupColors.text,
                            }}>
                            {interest}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              <PrimaryButton
                label="Сохранить"
                loading={savingSection === "interests"}
                disabled={!interestsDirty}
                onPress={() => void saveInterestsSection()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingSection === "interests"}
                onPress={cancelInterestsEdit}
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
              {profile.selected_interests.length > 0 ? (
                <View className="flex-row flex-wrap gap-1">
                  {profile.selected_interests.map((interest) => (
                    <View
                      key={interest}
                      className="rounded-full border px-3 py-1"
                      style={{
                        borderColor: ReadupColors.brand,
                        backgroundColor: ReadupColors.brand,
                      }}>
                      <Text
                        className="text-center text-[14px] tracking-[-0.56px]"
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: ReadupColors.textInverse,
                        }}>
                        {interest}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  className="text-[14px] tracking-[-0.56px] text-[#7A7868]"
                  style={{ fontFamily: "Inter_400Regular" }}>
                  Не выбрано
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => setInterestsEditing(true)}
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
            Цель чтения
          </Text>
          {goalEditing ? (
            <View className="mt-3 gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={() => setGoalPickerOpen((v) => !v)}
                className="h-[48px] flex-row items-center justify-between rounded-[30px] border border-[#E8E6D8] bg-[#FBFAF2] px-4 active:opacity-80">
                <Text
                  className="flex-1 text-[14px] tracking-[-0.56px]"
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: goal ? ReadupColors.text : ReadupColors.textTertiary,
                  }}
                  numberOfLines={1}>
                  {goal ?? "Выберите цель"}
                </Text>
                {goalPickerOpen ? (
                  <ChevronUp size={18} color={ReadupColors.textTertiary} strokeWidth={2} />
                ) : (
                  <ChevronDown size={18} color={ReadupColors.textTertiary} strokeWidth={2} />
                )}
              </Pressable>
              {goalPickerOpen ? (
                <View className="overflow-hidden rounded-[24px] border border-[#E8E6D8] bg-[#FBFAF2]">
                  {GOALS.map((item, index) => (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      onPress={() => {
                        setGoal(item);
                        setGoalPickerOpen(false);
                      }}
                      className={`px-4 py-3 active:opacity-80 ${
                        index < GOALS.length - 1 ? "border-b border-[#E8E6D8]" : ""
                      }`}>
                      <Text
                        className="text-[14px] tracking-[-0.56px] text-[#1A2420]"
                        style={{ fontFamily: "Inter_400Regular" }}>
                        {item}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <PrimaryButton
                label="Сохранить"
                loading={savingSection === "goal"}
                disabled={!goalDirty}
                onPress={() => void saveGoalSection()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingSection === "goal"}
                onPress={cancelGoalEdit}
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
                className="text-[18px] font-medium leading-6 tracking-[-0.72px]"
                style={{
                  fontFamily: "Inter_500Medium",
                  color: profile.reading_goal ? ReadupColors.text : ReadupColors.textTertiary,
                }}>
                {profile.reading_goal ?? "Не выбрана"}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setGoalEditing(true);
                  setGoal(profile.reading_goal);
                  setGoalPickerOpen(false);
                }}
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

        <View className="gap-3 border-t border-[#E8E6D8] pt-5">
          <Text
            className="text-[22px] leading-7 tracking-[-0.88px] text-[#1A2420]"
            style={{ fontFamily: "Inter_600SemiBold" }}>
            Библиотека
          </Text>

          {libraryLoading ? (
            <View className="items-center justify-center py-6">
              <ActivityIndicator size="small" color={ReadupColors.brand} />
            </View>
          ) : libraryItems.length === 0 ? (
            <View className={cardClass}>
              <Text
                className="text-[14px] tracking-[-0.56px] text-[#4A5550]"
                style={{ fontFamily: "Inter_400Regular" }}>
                Пока здесь пусто. Добавляйте книги из поиска — и они появятся в библиотеке.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/library")}
                className="mt-3 self-start active:opacity-70">
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#059669]"
                  style={{ fontFamily: "Inter_400Regular" }}>
                  Открыть библиотеку
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={[...libraryItems, null] as (BookCardItem | null)[]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) =>
                item ? `${item.id}-${item.bookId}` : `see-all-${index}`
              }
              contentContainerStyle={{ paddingVertical: 6 }}
              ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
              renderItem={({ item }) => {
                if (item == null) {
                  return (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push("/(tabs)/library")}
                      className="items-center justify-center rounded-[10px] border border-[#E8E6D8] bg-[#F2F0E6] active:opacity-80"
                      style={{ width: 136, height: Math.round(136 * 1.44) + 28 }}>
                      <Text
                        className="text-center text-[14px] font-medium tracking-[-0.56px] text-[#059669]"
                        style={{ fontFamily: "Inter_500Medium" }}>
                        Смотреть всё
                      </Text>
                    </Pressable>
                  );
                }

                return (
                  <View className="w-[136px]">
                    <BookCard
                      item={item}
                      onPress={(book) => {
                        router.push(`/book/${encodeURIComponent(book.bookId)}`);
                      }}
                    />
                  </View>
                );
              }}
            />
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View className="flex-1 items-center rounded-[14px] bg-[#FBFAF2] px-3 py-3">
      <Text
        className="text-[11px] uppercase tracking-[-0.44px] text-[#7A7868]"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label}
      </Text>
      <Text
        className="mt-1 text-[20px] font-semibold tracking-[-0.8px] text-[#1A2420]"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {value}
        {unit ? (
          <Text className="text-[13px] tracking-[-0.52px] text-[#7A7868]"> {unit}</Text>
        ) : null}
      </Text>
    </View>
  );
}
