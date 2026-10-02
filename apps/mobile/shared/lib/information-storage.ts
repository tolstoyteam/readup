import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@readup/information_complete";
const LEGACY_KEY = "@readup/onboarding_complete";

export async function getInformationComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  if (value !== null) return value === "true";
  return (await AsyncStorage.getItem(LEGACY_KEY)) === "true";
}

export async function markInformationComplete(): Promise<void> {
  await AsyncStorage.setItem(KEY, "true");
}
