import {
  BookCard,
  type BookCardItem,
} from "@/features/books/components/book-card";
import { useHomeFeed } from "@/features/home/hooks/use-home-feed";
import { Image } from "expo-image";
import { ChevronRight, Flame, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReadupLogo } from "@/shared/components/readup-logo";
import { isStreakActiveToday, useReadingStats } from "@/features/reading-stats";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export default function HomeScreen() {
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();
  const router = useRouter();
  const { profile, stats, todayKey } = useReadingStats(1);
  const {
    items,
    loading,
    refreshing,
    error,
    continueBook,
    sections,
    load,
    onRefresh,
  } = useHomeFeed();

  function openBook(item: BookCardItem) {
    router.push(`/book/${encodeURIComponent(item.bookId)}`);
  }

  function openContinue(item: BookCardItem) {
    router.push(`/reader/${encodeURIComponent(item.bookId)}`);
  }

  const hasStreak = isStreakActiveToday(
    profile?.last_read_date ?? null,
    todayKey,
  );

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerClassName="pb-8"
      >
        <View className="flex-row items-center justify-between px-8 pb-7 pt-8">
          <ReadupLogo />
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.streak")}
              onPress={() => router.push("/streak")}
              hitSlop={10}
              className="h-8 flex-row items-center gap-1.5 rounded-full border px-2.5 active:opacity-80"
              style={{
                borderColor: hasStreak ? colors.brand : colors.border,
                backgroundColor: hasStreak ? colors.elevated : "transparent",
              }}
            >
              <Flame
                size={16}
                color={hasStreak ? "#F97316" : colors.textTertiary}
                fill={hasStreak ? "#F97316" : "transparent"}
                strokeWidth={2.2}
              />
              <Text
                className="text-[13px] font-semibold tracking-[-0.52px]"
                style={{
                  color: hasStreak ? colors.text : colors.textTertiary,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {stats.currentStreakDays}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Premium"
              onPress={() => router.push("/subscription")}
              className="h-8 w-8 items-center justify-center rounded-full bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-80"
            >
              <Zap size={20} color={colors.brand} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View className="min-h-[420px] items-center justify-center p-6">
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : error ? (
          <View className="min-h-[420px] items-center justify-center px-6">
            <Text className="mb-4 text-center text-[15px] leading-[22px] text-[#4A5550] dark:text-[#B8C1BB]">
              {error}
            </Text>
            <Pressable
              onPress={load}
              className="rounded-full bg-[#059669] px-6 py-3 active:opacity-90"
            >
              <Text className="text-[15px] font-semibold text-[#FBFAF2]">
                {t("common.retry")}
              </Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View className="min-h-[420px] items-center justify-center px-6">
            <Text className="text-center text-[15px] leading-[22px] text-[#4A5550] dark:text-[#B8C1BB]">
              {t("home.catalogEmpty")}
            </Text>
          </View>
        ) : (
          <>
            {continueBook ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => openContinue(continueBook)}
                className="mx-8 mb-7 h-32 overflow-hidden rounded-[20px] bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-90"
              >
                <View className="h-full flex-row items-center justify-between pl-3">
                  <View className="max-w-[154px] gap-10">
                    <Text
                      className="text-[18px] font-medium leading-[22px] tracking-[-0.72px] text-[#1A2420] dark:text-[#F3F4EE]"
                      numberOfLines={2}
                    >
                      {continueBook.title}
                    </Text>
                    <Text className="text-[14px] tracking-[-0.56px] text-[#059669] dark:text-[#34D399]">
                      {t("home.continueReading")}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="h-[118px] w-[82px] overflow-hidden rounded-[10px] bg-[#F2F0E6] dark:bg-[#19211D]">
                      {continueBook.cover ? (
                        <Image
                          source={{ uri: continueBook.cover }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                          transition={180}
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View className="h-full items-center justify-center px-2">
                          <Text
                            className="text-center text-[11px] font-medium text-[#4A5550] dark:text-[#B8C1BB]"
                            numberOfLines={4}
                          >
                            {continueBook.title}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="ml-2 mr-[-20px] h-10 w-10 items-center justify-center rounded-full bg-[#FBFAF2] dark:bg-[#101512]">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F2F0E6] dark:bg-[#19211D]">
                        <ChevronRight
                          size={20}
                          color={colors.text}
                          strokeWidth={2}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            ) : null}

            {sections.map((section) => (
              <View key={section.title} className="mb-8">
                <Text
                  className="px-8 text-[22px] font-semibold tracking-[-0.88px]"
                  style={{ color: colors.text }}
                >
                  {section.title}
                </Text>
                <FlatList
                  horizontal
                  data={section.data}
                  keyExtractor={(item) =>
                    `${section.title}-${item.id}-${item.bookId}`
                  }
                  renderItem={({ item }) => (
                    <BookCard item={item} onPress={openBook} />
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="gap-2 px-8 pt-4"
                />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
