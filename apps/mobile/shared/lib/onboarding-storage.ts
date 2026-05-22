import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@readup/onboarding_complete";

export async function getOnboardingComplete(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === "true";
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}
