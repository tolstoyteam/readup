import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="goals" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="learning" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="monthly-goal" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="streak-goal" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
