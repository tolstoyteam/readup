import { Stack } from "expo-router";

export default function SetupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="interests" />
      <Stack.Screen name="goal" />
    </Stack>
  );
}
