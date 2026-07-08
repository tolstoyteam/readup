import { Redirect } from "expo-router";

/** Keeps old /explore deep links working without occupying a tab slot. */
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)" />;
}
