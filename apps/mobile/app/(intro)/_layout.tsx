import { Stack } from "expo-router";

export default function IntroLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="information" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
