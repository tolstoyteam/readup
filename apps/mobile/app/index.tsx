import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { getOnboardingComplete } from "@/shared/lib/onboarding-storage";
import { useReadupColors } from "@/shared/constants/readup-theme";

export default function Index() {
  const colors = useReadupColors();
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getOnboardingComplete().then((v) => {
      if (mounted) {
        setComplete(v);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (ready) {
    return <Redirect href={complete ? "/(tabs)" : "/welcome"} />;
  }

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: colors.background }}
    >
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}
