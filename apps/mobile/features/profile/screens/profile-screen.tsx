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
import {
  BookCard,
  type BookCardItem,
} from "@/features/books/components/book-card";
import { AchievementIcon } from "@/features/achievements/components/achievement-icon";
import { useAchievements } from "@/features/achievements/hooks/use-achievements";
import {
  ensureProfile,
  fetchProfile,
  saveGoal,
  saveInterests,
  type Profile,
} from "@/features/profile/api/profile";
import {
  buildReadingStatsSnapshot,
  todayActivityDateKey,
} from "@/features/reading-stats";
import {
  GOALS,
  INTEREST_GROUPS,
  goalLabel,
  interestLabel,
  normalizeGoalId,
  normalizeInterestId,
  normalizeInterestIds,
  setupLabel,
} from "@/features/setup/constants";
import { PrimaryButton } from "@/shared/components/primary-button";
import { ReadupLogo } from "@/shared/components/readup-logo";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { contentLanguageForInterface } from "@/shared/i18n/interface-language";
import {
  buildBookCatalogMap,
  joinLibraryBooks,
  useLibrary,
} from "@/features/library";

function readFullNameFromUser(user: {
  user_metadata?: Record<string, unknown>;
}): string {
  const raw = user.user_metadata?.full_name;
  return typeof raw === "string" ? raw : "";
}

function interestsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export default function ProfileScreen() {
  const colors = useReadupColors();
  const { language, t } = useInterfaceLanguage();
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
  const [savingSection, setSavingSection] = useState<
    null | "name" | "interests" | "goal"
  >(null);
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
      setSelectedInterests(normalizeInterestIds(p.selected_interests));
      setGoal(normalizeGoalId(p.reading_goal));
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
      const preferredLanguage = contentLanguageForInterface(language);
      const { books } = await fetchBooks(preferredLanguage);
      const catalog = buildBookCatalogMap(books);
      const items = joinLibraryBooks(savedBooks, catalog, preferredLanguage)
        .slice(0, 8)
        .map(({ id, bookId, title, cover }) => ({ id, bookId, title, cover }));
      setLibraryItems(items);
    } catch {
      setLibraryItems([]);
    }
  }, [language, savedBooks, user]);

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

  const readingStats = useMemo(
    () => buildReadingStatsSnapshot(profile, todayActivityDateKey()),
    [profile],
  );

  const selectedSet = useMemo(
    () => new Set(selectedInterests),
    [selectedInterests],
  );

  function toggleInterest(interest: string) {
    const interestId = normalizeInterestId(interest);
    setSelectedInterests((current) =>
      current.includes(interestId)
        ? current.filter((item) => item !== interestId)
        : [...current, interestId],
    );
  }

  async function saveNameSection() {
    if (!user) return;
    const trimmed = fullName.trim();
    setSavingSection("name");
    try {
      const { error } = await updateFullName(trimmed);
      if (error) {
        Alert.alert(t("common.error"), error.message);
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
        t("common.error"),
        error instanceof Error ? error.message : t("common.tryAgain"),
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
        t("common.error"),
        error instanceof Error ? error.message : t("common.tryAgain"),
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
    setSelectedInterests(
      normalizeInterestIds(profile?.selected_interests ?? []),
    );
    setInterestsEditing(false);
  }

  function cancelGoalEdit() {
    setGoal(normalizeGoalId(profile?.reading_goal ?? null));
    setGoalEditing(false);
    setGoalPickerOpen(false);
  }

  const cardClass =
    "rounded-[20px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] p-4";
  const nameDirty = fullName.trim() !== initialFullName.trim();
  const interestsDirty =
    profile != null &&
    !interestsEqual(
      selectedInterests,
      normalizeInterestIds(profile.selected_interests),
    );
  const goalDirty =
    profile != null && goal !== normalizeGoalId(profile.reading_goal);

  if (!fontsLoaded) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (loadingProfile) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512]"
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  if (profile == null) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512] px-8"
        edges={["top"]}
      >
        <Text
          className="text-center text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
          style={{ fontFamily: "Inter_400Regular" }}
        >
          {t("profile.profileLoadFailed")}
        </Text>
      </SafeAreaView>
    );
  }

  const displayNameSummary = initialFullName.trim();

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
        <View className="items-center pb-1">
          <ReadupLogo />
        </View>

        <View className="flex-row items-center justify-between">
          <Text
            className="text-[22px] leading-7 tracking-[-0.88px] text-[#1A2420] dark:text-[#F3F4EE]"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {t("profile.title")}
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.notifications")}
              onPress={() => router.push("/notifications")}
              hitSlop={10}
              className="active:opacity-70"
            >
              <Bell size={22} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.settings")}
              onPress={() => router.push("/settings")}
              hitSlop={10}
              className="active:opacity-70"
            >
              <Settings
                size={22}
                color={colors.textSecondary}
                strokeWidth={2}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/subscription")}
          className={`${cardClass} flex-row items-center justify-between active:opacity-90`}
        >
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] dark:bg-[#123D2C]">
              <Crown size={20} color={colors.brand} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text
                className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {profile.is_premium
                  ? "Readup Premium"
                  : t("profile.premiumCta")}
              </Text>
              <Text
                className="text-[13px] tracking-[-0.52px] text-[#4A5550] dark:text-[#B8C1BB]"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {profile.is_premium
                  ? t("profile.allFeaturesActive")
                  : t("profile.premiumSubtitle")}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textTertiary} strokeWidth={2} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/streak")}
          className={`${cardClass} active:opacity-90`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Flame size={20} color={colors.brand} strokeWidth={2.2} />
              <Text
                className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {t("profile.streakAndProgress")}
              </Text>
            </View>
            <ChevronRight
              size={20}
              color={colors.textTertiary}
              strokeWidth={2}
            />
          </View>
          <View className="mt-4 flex-row gap-3">
            <StatPill
              label={t("profile.streak")}
              value={`${readingStats.currentStreakDays}`}
              unit={t("profile.daysUnit")}
            />
            <StatPill
              label={t("profile.read")}
              value={`${readingStats.totalBooksCompleted}`}
              unit=""
            />
            <StatPill
              label={t("profile.minutes")}
              value={`${readingStats.totalReadingMinutes}`}
              unit=""
            />
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/achievements" as Href)}
          className={`${cardClass} active:opacity-90`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Trophy size={18} color={colors.brand} strokeWidth={2.2} />
              <View>
                <Text
                  className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {t("profile.achievements")}
                </Text>
                <Text
                  className="text-[13px] tracking-[-0.52px] text-[#7A7868] dark:text-[#8F9A93]"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {t("profile.unlockedCount", {
                    unlocked: achievementsUnlockedCount,
                    total: achievementsTotalCount,
                  })}
                </Text>
              </View>
            </View>
            <ChevronRight
              size={20}
              color={colors.textTertiary}
              strokeWidth={2}
            />
          </View>
          {unlockedAchievementPreview.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {unlockedAchievementPreview.map((achievement) => (
                <View
                  key={achievement.slug}
                  className="flex-row items-center gap-1.5 rounded-full border border-[#059669] dark:border-[#34D399] bg-[#ECFDF5] dark:bg-[#123D2C] px-3 py-1.5"
                >
                  <AchievementIcon
                    name={achievement.icon}
                    size={14}
                    color={colors.brand}
                    strokeWidth={2}
                  />
                  <Text
                    className="text-[12px] font-medium tracking-[-0.48px] text-[#059669] dark:text-[#34D399]"
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
            className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
            style={{ fontFamily: "Inter_400Regular" }}
          >
            {t("profile.name")}
          </Text>
          {nameEditing ? (
            <View className="mt-3 gap-3">
              <ReadupTextField
                label={t("profile.editNameLabel")}
                labelFontFamily="Inter_500Medium"
                value={fullName}
                onChangeText={setFullName}
                placeholder={t("profile.name")}
                autoComplete="name"
                style={{ fontFamily: "Inter_400Regular" }}
              />
              <PrimaryButton
                label={t("common.save")}
                loading={savingSection === "name"}
                disabled={!nameDirty}
                onPress={() => void saveNameSection()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingSection === "name"}
                onPress={cancelNameEdit}
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
                className="text-[18px] font-medium tracking-[-0.72px]"
                style={{
                  fontFamily: "Inter_500Medium",
                  color: displayNameSummary ? colors.text : colors.textTertiary,
                }}
              >
                {displayNameSummary || t("common.notSpecified")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setNameEditing(true)}
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
            {t("profile.interests")}
          </Text>
          {interestsEditing ? (
            <View className="mt-3 gap-4">
              {INTEREST_GROUPS.map((group) => (
                <View key={group.id} className="gap-2">
                  <Text
                    className="text-[18px] font-medium tracking-[-0.72px] text-[#1A2420] dark:text-[#F3F4EE]"
                    style={{ fontFamily: "Inter_500Medium" }}
                  >
                    {setupLabel(group, language)}
                  </Text>
                  <View className="flex-row flex-wrap gap-1">
                    {group.items.map((interest) => {
                      const active = selectedSet.has(interest.id);
                      return (
                        <Pressable
                          key={interest.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          onPress={() => toggleInterest(interest.id)}
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
                              fontFamily: "Inter_400Regular",
                              color: active ? colors.textInverse : colors.text,
                            }}
                          >
                            {setupLabel(interest, language)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
              <PrimaryButton
                label={t("common.save")}
                loading={savingSection === "interests"}
                disabled={!interestsDirty}
                onPress={() => void saveInterestsSection()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingSection === "interests"}
                onPress={cancelInterestsEdit}
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
              {profile.selected_interests.length > 0 ? (
                <View className="flex-row flex-wrap gap-1">
                  {normalizeInterestIds(profile.selected_interests).map(
                    (interest) => (
                      <View
                        key={interest}
                        className="rounded-full border px-3 py-1"
                        style={{
                          borderColor: colors.brand,
                          backgroundColor: colors.brand,
                        }}
                      >
                        <Text
                          className="text-center text-[14px] tracking-[-0.56px]"
                          style={{
                            fontFamily: "Inter_400Regular",
                            color: colors.textInverse,
                          }}
                        >
                          {interestLabel(interest, language)}
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              ) : (
                <Text
                  className="text-[14px] tracking-[-0.56px] text-[#7A7868] dark:text-[#8F9A93]"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {t("common.notSelected")}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => setInterestsEditing(true)}
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
            {t("profile.goal")}
          </Text>
          {goalEditing ? (
            <View className="mt-3 gap-3">
              <Pressable
                accessibilityRole="button"
                onPress={() => setGoalPickerOpen((v) => !v)}
                className="h-[48px] flex-row items-center justify-between rounded-[30px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512] px-4 active:opacity-80"
              >
                <Text
                  className="flex-1 text-[14px] tracking-[-0.56px]"
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: goal ? colors.text : colors.textTertiary,
                  }}
                  numberOfLines={1}
                >
                  {goalLabel(goal, language) ?? t("profile.chooseGoal")}
                </Text>
                {goalPickerOpen ? (
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
              {goalPickerOpen ? (
                <View className="overflow-hidden rounded-[24px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#FBFAF2] dark:bg-[#101512]">
                  {GOALS.map((item, index) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setGoal(item.id);
                        setGoalPickerOpen(false);
                      }}
                      className={`px-4 py-3 active:opacity-80 ${
                        index < GOALS.length - 1
                          ? "border-b border-[#E8E6D8] dark:border-[#2A3630]"
                          : ""
                      }`}
                    >
                      <Text
                        className="text-[14px] tracking-[-0.56px] text-[#1A2420] dark:text-[#F3F4EE]"
                        style={{ fontFamily: "Inter_400Regular" }}
                      >
                        {setupLabel(item, language)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <PrimaryButton
                label={t("common.save")}
                loading={savingSection === "goal"}
                disabled={!goalDirty}
                onPress={() => void saveGoalSection()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={savingSection === "goal"}
                onPress={cancelGoalEdit}
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
                className="text-[18px] font-medium leading-6 tracking-[-0.72px]"
                style={{
                  fontFamily: "Inter_500Medium",
                  color: profile.reading_goal
                    ? colors.text
                    : colors.textTertiary,
                }}
              >
                {goalLabel(profile.reading_goal, language) ??
                  t("common.notSelected")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setGoalEditing(true);
                  setGoal(normalizeGoalId(profile.reading_goal));
                  setGoalPickerOpen(false);
                }}
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

        <View className="gap-3 border-t border-[#E8E6D8] dark:border-[#2A3630] pt-5">
          <Text
            className="text-[22px] leading-7 tracking-[-0.88px] text-[#1A2420] dark:text-[#F3F4EE]"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {t("profile.library")}
          </Text>

          {libraryLoading ? (
            <View className="items-center justify-center py-6">
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : libraryItems.length === 0 ? (
            <View className={cardClass}>
              <Text
                className="text-[14px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]"
                style={{ fontFamily: "Inter_400Regular" }}
              >
                {t("profile.libraryEmpty")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/library")}
                className="mt-3 self-start active:opacity-70"
              >
                <Text
                  className="text-[12px] tracking-[-0.48px] text-[#059669] dark:text-[#34D399]"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  {t("profile.openLibrary")}
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
                      className="items-center justify-center rounded-[10px] border border-[#E8E6D8] dark:border-[#2A3630] bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-80"
                      style={{
                        width: 136,
                        height: Math.round(136 * 1.44) + 28,
                      }}
                    >
                      <Text
                        className="text-center text-[14px] font-medium tracking-[-0.56px] text-[#059669] dark:text-[#34D399]"
                        style={{ fontFamily: "Inter_500Medium" }}
                      >
                        {t("profile.allLibrary")}
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
    <View className="flex-1 items-center rounded-[14px] bg-[#FBFAF2] dark:bg-[#101512] px-3 py-3">
      <Text
        className="text-[11px] uppercase tracking-[-0.44px] text-[#7A7868] dark:text-[#8F9A93]"
        style={{ fontFamily: "Inter_400Regular" }}
      >
        {label}
      </Text>
      <Text
        className="mt-1 text-[20px] font-semibold tracking-[-0.8px] text-[#1A2420] dark:text-[#F3F4EE]"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {value}
        {unit ? (
          <Text className="text-[13px] tracking-[-0.52px] text-[#7A7868] dark:text-[#8F9A93]">
            {" "}
            {unit}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}
