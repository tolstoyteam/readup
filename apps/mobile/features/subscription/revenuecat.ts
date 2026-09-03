import { Platform } from "react-native";
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { PURCHASES_ERROR_CODE } from "react-native-purchases";

export const READUP_PREMIUM_ENTITLEMENT_ID = "Readup Premium";

export const READUP_PRODUCT_IDS = {
  monthly: "com.sanat.readup.premium.monthly",
  yearly: "com.sanat.readup.premium.yearly",
} as const;

export type SubscriptionPlan = keyof typeof READUP_PRODUCT_IDS;

const TEST_STORE_API_KEY = "test_fswvCQMxGOOEPMnaVMNcUXLruxN";

/**
 * RevenueCat SDK keys are public app identifiers, not secret server keys.
 * Development builds can use App Store / Play Store sandbox when a platform key
 * is configured; otherwise they fall back to RevenueCat Test Store.
 */
export function revenueCatApiKey(): string {
  const platformKey =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : Platform.OS === "android"
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
        : undefined;

  const apiKey =
    platformKey?.trim() ||
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim();

  if (__DEV__) {
    return (
      apiKey ||
      process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY?.trim() ||
      TEST_STORE_API_KEY
    );
  }

  if (!apiKey) {
    throw new Error("Missing RevenueCat production API key for this platform.");
  }

  return apiKey;
}

export function hasReadupPremium(customerInfo: CustomerInfo | null): boolean {
  return (
    customerInfo?.entitlements.active[READUP_PREMIUM_ENTITLEMENT_ID]
      ?.isActive === true
  );
}

export function packageForPlan(
  offering: PurchasesOffering | null,
  plan: SubscriptionPlan,
): PurchasesPackage | null {
  if (!offering) return null;

  const standardPackage =
    plan === "monthly" ? offering.monthly : offering.annual;
  if (standardPackage) return standardPackage;

  const productId = READUP_PRODUCT_IDS[plan];
  return (
    offering.availablePackages.find(
      (candidate) => candidate.product.identifier === productId,
    ) ?? null
  );
}

export function isPurchasesError(error: unknown): error is PurchasesError {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Partial<PurchasesError>;
  return (
    typeof candidate.code === "string" && typeof candidate.message === "string"
  );
}

export function isPurchaseCancelled(error: unknown): boolean {
  return (
    isPurchasesError(error) &&
    error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export function revenueCatErrorMessage(error: unknown): string {
  if (isPurchasesError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected subscription error occurred.";
}
