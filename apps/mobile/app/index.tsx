import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { getOnboardingComplete } from "@/shared/lib/onboarding-storage";

const BG = "#FBFAF2";

export default function Index() {
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

  if (!ready) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: BG }}
      >
        <ActivityIndicator color="#059669" size="large" />
      </View>
    );
  }

  if (complete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}
