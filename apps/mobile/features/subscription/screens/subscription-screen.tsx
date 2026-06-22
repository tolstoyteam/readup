import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Check,
  Crown,
  Headphones,
  Library,
  Sparkles,
  Star,
  X,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchProfile, type Profile } from "@/features/profile/api/profile";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

type PlanCardProps = {
  title: string;
  price: string;
  pricePeriod: string;
  badge?: string;
  highlighted?: boolean;
  selected: boolean;
  onSelect: () => void;
};

const BENEFITS = [
  {
    icon: Library,
    title: "Полная библиотека",
    description: "Все книги без ограничений",
  },
  {
    icon: Headphones,
    title: "Аудио-версии",
    description: "Слушайте книги в любое время",
  },
  {
    icon: Sparkles,
    title: "Тесты и достижения",
    description: "Углубляйте понимание материала",
  },
  {
    icon: Star,
    title: "Без рекламы",
    description: "Чистый и быстрый интерфейс",
  },
];

export default function SubscriptionScreen() {
  const colors = useReadupColors();
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "yearly",
  );

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isPremium = profile?.is_premium === true;

  return (
    <SafeAreaView
      className="flex-1 bg-[#FBFAF2] dark:bg-[#101512]"
      edges={["top"]}
    >
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="h-10 w-10" />
        <Text className="text-[18px] font-semibold tracking-[-0.72px] text-[#1A2420] dark:text-[#F3F4EE]">
          Readup Premium
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full bg-[#F2F0E6] dark:bg-[#19211D] active:opacity-80"
        >
          <X size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center pt-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#ECFDF5] dark:bg-[#123D2C]">
              <Crown size={28} color={colors.brand} strokeWidth={2} />
            </View>
            <Text className="mt-4 text-center text-[28px] font-extrabold leading-[34px] tracking-[-1.12px] text-[#1A2420] dark:text-[#F3F4EE]">
              {isPremium ? "У вас Premium" : "Читайте без ограничений"}
            </Text>
            <Text className="mt-2 max-w-[280px] text-center text-[14px] leading-[20px] tracking-[-0.56px] text-[#4A5550] dark:text-[#B8C1BB]">
              {isPremium
                ? "Спасибо, что поддерживаете Readup. Все функции доступны."
                : "Premium открывает всю библиотеку, аудио-версии и расширенные возможности."}
            </Text>
          </View>

          <View className="mt-7 gap-3">
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <View
                key={title}
                className="flex-row items-start gap-3 rounded-[16px] bg-[#F2F0E6] dark:bg-[#19211D] px-4 py-3.5"
              >
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#ECFDF5] dark:bg-[#123D2C]">
                  <Icon
                    size={18}
                    color={colors.brand}
                    strokeWidth={2.2}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold tracking-[-0.6px] text-[#1A2420] dark:text-[#F3F4EE]">
                    {title}
                  </Text>
                  <Text className="text-[13px] tracking-[-0.52px] text-[#4A5550] dark:text-[#B8C1BB]">
                    {description}
                  </Text>
                </View>
                <Check size={18} color={colors.brand} strokeWidth={2.4} />
              </View>
            ))}
          </View>

          <View className="mt-7 gap-3">
            <PlanCard
              title="Ежемесячно"
              price="990 ₸"
              pricePeriod="в месяц"
              selected={selectedPlan === "monthly"}
              onSelect={() => setSelectedPlan("monthly")}
            />
            <PlanCard
              title="Год"
              price="7 990 ₸"
              pricePeriod="33% выгоднее"
              badge="Лучший выбор"
              highlighted
              selected={selectedPlan === "yearly"}
              onSelect={() => setSelectedPlan("yearly")}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled
            className="mt-7 min-h-[54px] flex-row items-center justify-center gap-2 rounded-full border-2 border-[#9CCFB9] bg-[#9CCFB9]"
          >
            <Zap size={18} color={colors.textInverse} strokeWidth={2.4} />
            <Text className="text-[18px] font-medium tracking-[-0.36px] text-[#FBFAF2]">
              {isPremium ? "Активно" : "Оплата скоро"}
            </Text>
          </Pressable>
          <Text className="mt-3 text-center text-[12px] tracking-[-0.48px] text-[#7A7868] dark:text-[#8F9A93]">
            Подписки пока недоступны — функция активируется позже.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PlanCard({
  title,
  price,
  pricePeriod,
  badge,
  highlighted,
  selected,
  onSelect,
}: PlanCardProps) {
  const colors = useReadupColors();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="rounded-[20px] border px-5 py-4 active:opacity-90"
      style={{
        borderColor: selected ? colors.brand : colors.elevated,
        backgroundColor:
          highlighted && selected ? "#ECFDF5" : colors.surface,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-[16px] font-semibold tracking-[-0.64px] text-[#1A2420] dark:text-[#F3F4EE]">
            {title}
          </Text>
          {badge ? (
            <View className="rounded-full bg-[#059669] px-2 py-0.5">
              <Text className="text-[10px] font-semibold uppercase tracking-[-0.4px] text-[#FBFAF2]">
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <View
          className="h-5 w-5 items-center justify-center rounded-full border-2"
          style={{
            borderColor: selected
              ? colors.brand
              : colors.textTertiary,
            backgroundColor: selected ? colors.brand : "transparent",
          }}
        >
          {selected ? (
            <View className="h-2 w-2 rounded-full bg-[#FBFAF2] dark:bg-[#101512]" />
          ) : null}
        </View>
      </View>
      <View className="mt-2 flex-row items-baseline gap-2">
        <Text className="text-[24px] font-extrabold tracking-[-0.96px] text-[#1A2420] dark:text-[#F3F4EE]">
          {price}
        </Text>
        <Text className="text-[13px] tracking-[-0.52px] text-[#7A7868] dark:text-[#8F9A93]">
          {pricePeriod}
        </Text>
      </View>
    </Pressable>
  );
}
