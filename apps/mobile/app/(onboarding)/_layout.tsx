import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
