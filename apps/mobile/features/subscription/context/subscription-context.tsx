import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

import {
  hasReadupPremium,
  isPurchaseCancelled,
  packageForPlan,
  READUP_PREMIUM_ENTITLEMENT_ID,
  revenueCatApiKey,
  revenueCatErrorMessage,
  type SubscriptionPlan,
} from "@/features/subscription/revenuecat";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export type PurchaseOutcome = "purchased" | "cancelled" | "not_entitled";

type SubscriptionContextValue = {
  configured: boolean;
  loading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isPremium: boolean;
  errorMessage: string | null;
  refresh: () => Promise<CustomerInfo>;
  purchasePlan: (plan: SubscriptionPlan) => Promise<PurchaseOutcome>;
  restorePurchases: () => Promise<boolean>;
  presentPaywall: () => Promise<PAYWALL_RESULT>;
  presentCustomerCenter: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

function isAnonymousRevenueCatUser(appUserId: string): boolean {
  return appUserId.startsWith("$RCAnonymousID:");
}

async function synchronizeRevenueCatUser(
  userId: string | null,
): Promise<CustomerInfo> {
  const currentAppUserId = await Purchases.getAppUserID();

  if (userId) {
    if (currentAppUserId !== userId) {
      const { customerInfo } = await Purchases.logIn(userId);
      return customerInfo;
    }
    return Purchases.getCustomerInfo();
  }

  if (!isAnonymousRevenueCatUser(currentAppUserId)) {
    return Purchases.logOut();
  }

  return Purchases.getCustomerInfo();
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { language } = useInterfaceLanguage();
  const userId = user?.id ?? null;
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const operationQueue = useRef<Promise<void>>(Promise.resolve());
  const latestIdentityRun = useRef(0);

  useEffect(() => {
    if (authLoading) return;

    const runId = ++latestIdentityRun.current;
    setLoading(true);

    operationQueue.current = operationQueue.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const isConfigured = await Purchases.isConfigured();
          if (!isConfigured) {
            if (__DEV__) {
              await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
            }
            Purchases.configure({
              apiKey: revenueCatApiKey(),
              appUserID: userId ?? undefined,
              preferredUILocaleOverride: language,
            });
          }

          const info = await synchronizeRevenueCatUser(userId);
          const offerings = await Purchases.getOfferings();
          if (runId !== latestIdentityRun.current) return;

          setConfigured(true);
          setCustomerInfo(info);
          setCurrentOffering(offerings.current);
          setErrorMessage(null);
        } catch (error) {
          if (runId !== latestIdentityRun.current) return;
          setErrorMessage(revenueCatErrorMessage(error));
        } finally {
          if (runId === latestIdentityRun.current) setLoading(false);
        }
      });
  }, [authLoading, language, userId]);

  useEffect(() => {
    if (!configured) return;
    void Purchases.overridePreferredLocale(language).catch((error) => {
      if (__DEV__)
        console.warn("[RevenueCat locale]", revenueCatErrorMessage(error));
    });
  }, [configured, language]);

  useEffect(() => {
    if (!configured) return;

    const listener: CustomerInfoUpdateListener = (info) => {
      setCustomerInfo(info);
      setErrorMessage(null);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [configured]);

  const refresh = useCallback(async () => {
    const [info, offerings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);
    setCustomerInfo(info);
    setCurrentOffering(offerings.current);
    setErrorMessage(null);
    return info;
  }, []);

  const purchasePlan = useCallback(
    async (plan: SubscriptionPlan): Promise<PurchaseOutcome> => {
      const selectedPackage = packageForPlan(currentOffering, plan);
      if (!selectedPackage) {
        throw new Error(
          `The ${plan} package is missing from the current RevenueCat offering.`,
        );
      }

      try {
        const { customerInfo: updatedInfo } =
          await Purchases.purchasePackage(selectedPackage);
        setCustomerInfo(updatedInfo);
        setErrorMessage(null);
        return hasReadupPremium(updatedInfo) ? "purchased" : "not_entitled";
      } catch (error) {
        if (isPurchaseCancelled(error)) return "cancelled";
        setErrorMessage(revenueCatErrorMessage(error));
        throw error;
      }
    },
    [currentOffering],
  );

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      setErrorMessage(null);
      return hasReadupPremium(info);
    } catch (error) {
      setErrorMessage(revenueCatErrorMessage(error));
      throw error;
    }
  }, []);

  const presentPaywall = useCallback(async () => {
    try {
      const result = await RevenueCatUI.presentPaywall({
        offering: currentOffering ?? undefined,
        displayCloseButton: true,
      });
      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        await refresh();
      }
      return result;
    } catch (error) {
      setErrorMessage(revenueCatErrorMessage(error));
      throw error;
    }
  }, [currentOffering, refresh]);

  const presentCustomerCenter = useCallback(async () => {
    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: ({ customerInfo: restoredInfo }) => {
            setCustomerInfo(restoredInfo);
            setErrorMessage(null);
          },
          onRestoreFailed: ({ error }) => {
            setErrorMessage(revenueCatErrorMessage(error));
          },
        },
      });
      await refresh();
    } catch (error) {
      setErrorMessage(revenueCatErrorMessage(error));
      throw error;
    }
  }, [refresh]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      configured,
      loading,
      customerInfo,
      currentOffering,
      isPremium: hasReadupPremium(customerInfo),
      errorMessage,
      refresh,
      purchasePlan,
      restorePurchases,
      presentPaywall,
      presentCustomerCenter,
    }),
    [
      configured,
      loading,
      customerInfo,
      currentOffering,
      errorMessage,
      refresh,
      purchasePlan,
      restorePurchases,
      presentPaywall,
      presentCustomerCenter,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}

export { PAYWALL_RESULT, READUP_PREMIUM_ENTITLEMENT_ID };
