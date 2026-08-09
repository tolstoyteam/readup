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
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSubscription } from "@/features/subscription";
import {
  packageForPlan,
  revenueCatErrorMessage,
} from "@/features/subscription/revenuecat";
import {
  useReadupColors,
  statusBarStyleForScheme,
} from "@/shared/constants/readup-theme";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import type { TranslationKey } from "@/shared/i18n/translations";

type PlanCardProps = {
  title: string;
  price: string;
  pricePeriod: string;
  badge?: string;
  highlighted?: boolean;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? "https://readup.kz/privacy";
const TERMS_OF_USE_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

const BENEFITS = [
  {
    icon: Library,
    titleKey: "premium.fullLibraryTitle",
    descriptionKey: "premium.fullLibraryDescription",
  },
  {
    icon: Headphones,
    titleKey: "premium.audioTitle",
    descriptionKey: "premium.audioDescription",
  },
  {
    icon: Sparkles,
    titleKey: "premium.testsTitle",
    descriptionKey: "premium.testsDescription",
  },
  {
    icon: Star,
    titleKey: "premium.noAdsTitle",
    descriptionKey: "premium.noAdsDescription",
  },
] satisfies {
  icon: typeof Library;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}[];

export default function SubscriptionScreen() {
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const {
    configured,
    loading,
    currentOffering,
    isPremium,
    errorMessage,
    purchasePlan,
    refresh,
    restorePurchases,
    presentPaywall,
    presentCustomerCenter,
  } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [busyAction, setBusyAction] = useState<
    null | "purchase" | "restore" | "paywall" | "manage" | "refresh"
  >(null);

  const monthlyPackage = packageForPlan(currentOffering, "monthly");
  const yearlyPackage = packageForPlan(currentOffering, "yearly");
  const selectedPackage =
    selectedPlan === "monthly" ? monthlyPackage : yearlyPackage;
  const busy = busyAction != null;

  async function handlePurchase() {
    setBusyAction("purchase");
    try {
      const outcome = await purchasePlan(selectedPlan);
      if (outcome === "purchased") {
        Alert.alert(
          t("premium.purchaseSuccessTitle"),
          t("premium.purchaseSuccessBody"),
        );
      } else if (outcome === "not_entitled") {
        Alert.alert(
          t("premium.purchasePendingTitle"),
          t("premium.purchasePendingBody"),
        );
      }
    } catch (error) {
      Alert.alert(
        t("premium.purchaseErrorTitle"),
        revenueCatErrorMessage(error),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRestore() {
    setBusyAction("restore");
    try {
      const restoredPremium = await restorePurchases();
      Alert.alert(
        restoredPremium
          ? t("premium.restoreSuccessTitle")
          : t("premium.restoreEmptyTitle"),
        restoredPremium
          ? t("premium.restoreSuccessBody")
          : t("premium.restoreEmptyBody"),
      );
    } catch (error) {
      Alert.alert(
        t("premium.restoreErrorTitle"),
        revenueCatErrorMessage(error),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePaywall() {
    setBusyAction("paywall");
    try {
      await presentPaywall();
    } catch (error) {
      Alert.alert(
        t("premium.paywallErrorTitle"),
        revenueCatErrorMessage(error),
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCustomerCenter() {
    setBusyAction("manage");
    try {
      await presentCustomerCenter();
    } catch (error) {
      Alert.alert(t("premium.manageErrorTitle"), revenueCatErrorMessage(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRefresh() {
    setBusyAction("refresh");
    try {
      await refresh();
    } catch (error) {
      Alert.alert(
        t("premium.productsErrorTitle"),
        revenueCatErrorMessage(error),
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      edges={["top"]}
    >
      <StatusBar style={statusBarStyleForScheme(colorScheme)} />

      <View className="flex-row items-center justify-between px-5 py-3">
        <View className="h-10 w-10" />
        <Text
          className="text-[18px] font-semibold tracking-[-0.72px]"
          style={{ color: colors.text }}
        >
          Readup Premium
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: colors.surface }}
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
            <View
              className="h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.elevated }}
            >
              <Crown size={28} color={colors.brand} strokeWidth={2} />
            </View>
            <Text
              className="mt-4 text-center text-[28px] font-extrabold leading-[34px] tracking-[-1.12px]"
              style={{ color: colors.text }}
            >
              {isPremium
                ? t("premium.premiumActiveTitle")
                : t("premium.unlockTitle")}
            </Text>
            <Text
              className="mt-2 max-w-[280px] text-center text-[14px] leading-[20px] tracking-[-0.56px]"
              style={{ color: colors.textSecondary }}
            >
              {isPremium
                ? t("premium.premiumActiveBody")
                : t("premium.unlockBody")}
            </Text>
          </View>

          <View className="mt-7 gap-3">
            {BENEFITS.map(({ icon: Icon, titleKey, descriptionKey }) => (
              <View
                key={titleKey}
                className="flex-row items-start gap-3 rounded-[16px] border px-4 py-3.5"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                }}
              >
                <View
                  className="mt-0.5 h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.elevated }}
                >
                  <Icon size={18} color={colors.brand} strokeWidth={2.2} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[15px] font-semibold tracking-[-0.6px]"
                    style={{ color: colors.text }}
                  >
                    {t(titleKey)}
                  </Text>
                  <Text
                    className="text-[13px] tracking-[-0.52px]"
                    style={{ color: colors.textSecondary }}
                  >
                    {t(descriptionKey)}
                  </Text>
                </View>
                <Check size={18} color={colors.brand} strokeWidth={2.4} />
              </View>
            ))}
          </View>

          <View className="mt-7 gap-3">
            <PlanCard
              title={t("premium.monthly")}
              price={monthlyPackage?.product.priceString ?? "—"}
              pricePeriod={t("premium.monthlyPeriod")}
              selected={selectedPlan === "monthly"}
              disabled={busy || !monthlyPackage}
              onSelect={() => setSelectedPlan("monthly")}
            />
            <PlanCard
              title={t("premium.yearly")}
              price={yearlyPackage?.product.priceString ?? "—"}
              pricePeriod={t("premium.yearlyPeriod")}
              badge={t("premium.bestChoice")}
              highlighted
              selected={selectedPlan === "yearly"}
              disabled={busy || !yearlyPackage}
              onSelect={() => setSelectedPlan("yearly")}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={
              busy || !configured || (!isPremium && selectedPackage == null)
            }
            onPress={() =>
              void (isPremium ? handleCustomerCenter() : handlePurchase())
            }
            className="mt-7 min-h-[54px] flex-row items-center justify-center gap-2 rounded-full active:opacity-85 disabled:opacity-50"
            style={{
              backgroundColor: colors.brand,
            }}
          >
            {busyAction === "purchase" || busyAction === "manage" ? (
              <ActivityIndicator size="small" color="#FBFAF2" />
            ) : (
              <Zap size={18} color="#FBFAF2" strokeWidth={2.4} />
            )}
            <Text
              className="text-[18px] font-medium tracking-[-0.36px]"
              style={{ color: "#FBFAF2" }}
            >
              {isPremium
                ? t("premium.manageSubscription")
                : t("premium.subscribe")}
            </Text>
          </Pressable>

          {!isPremium ? (
            <View className="mt-4 items-center gap-3">
              <Pressable
                accessibilityRole="button"
                disabled={busy || !configured || currentOffering == null}
                onPress={() => void handlePaywall()}
                className="active:opacity-70 disabled:opacity-40"
              >
                <Text
                  className="text-[14px] font-semibold tracking-[-0.56px]"
                  style={{ color: colors.brand }}
                >
                  {busyAction === "paywall"
                    ? t("premium.openingPaywall")
                    : t("premium.viewPaywall")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={busy || !configured}
                onPress={() => void handleRestore()}
                className="active:opacity-70 disabled:opacity-40"
              >
                <Text
                  className="text-[14px] tracking-[-0.56px]"
                  style={{ color: colors.textSecondary }}
                >
                  {busyAction === "restore"
                    ? t("premium.restoring")
                    : t("premium.restorePurchases")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {errorMessage ? (
            <Text
              className="mt-4 text-center text-[12px] leading-[17px] tracking-[-0.48px]"
              style={{ color: "#DC2626" }}
            >
              {errorMessage}
            </Text>
          ) : null}

          {!loading && configured && currentOffering == null ? (
            <View className="mt-4 items-center gap-2">
              <Text
                className="text-center text-[12px] leading-[17px] tracking-[-0.48px]"
                style={{ color: colors.textSecondary }}
              >
                {t("premium.productsUnavailable")}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void handleRefresh()}
                className="active:opacity-70 disabled:opacity-40"
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: colors.brand }}
                >
                  {busyAction === "refresh"
                    ? t("premium.refreshing")
                    : t("common.retry")}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Text
            className="mt-5 text-center text-[11px] leading-[16px] tracking-[-0.44px]"
            style={{ color: colors.textTertiary }}
          >
            {t("premium.autoRenewDisclosure")}
          </Text>
          <View className="mt-3 flex-row justify-center gap-5">
            <Pressable onPress={() => void Linking.openURL(TERMS_OF_USE_URL)}>
              <Text
                className="text-[12px] underline"
                style={{ color: colors.textSecondary }}
              >
                {t("premium.termsOfUse")}
              </Text>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text
                className="text-[12px] underline"
                style={{ color: colors.textSecondary }}
              >
                {t("premium.privacyPolicy")}
              </Text>
            </Pressable>
          </View>
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
  disabled,
  onSelect,
}: PlanCardProps) {
  const colors = useReadupColors();

  return (
    <Pressable
      onPress={onSelect}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="rounded-[20px] border px-5 py-4 active:opacity-90 disabled:opacity-50"
      style={{
        borderColor: selected ? colors.brand : colors.elevated,
        backgroundColor:
          highlighted && selected ? colors.elevated : colors.surface,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-[16px] font-semibold tracking-[-0.64px]"
            style={{ color: colors.text }}
          >
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
            borderColor: selected ? colors.brand : colors.textTertiary,
            backgroundColor: selected ? colors.brand : "transparent",
          }}
        >
          {selected ? (
            <View className="h-2 w-2 rounded-full bg-[#FBFAF2] dark:bg-[#101512]" />
          ) : null}
        </View>
      </View>
      <View className="mt-2 flex-row items-baseline gap-2">
        <Text
          className="text-[24px] font-extrabold tracking-[-0.96px]"
          style={{ color: colors.text }}
        >
          {price}
        </Text>
        <Text
          className="text-[13px] tracking-[-0.52px]"
          style={{ color: colors.textTertiary }}
        >
          {pricePeriod}
        </Text>
      </View>
    </Pressable>
  );
}
