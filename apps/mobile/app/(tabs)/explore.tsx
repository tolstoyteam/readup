import { Redirect } from "expo-router";

/** Keeps old /explore deep links and persisted nav state working after template removal. */
export default function ExploreRedirect() {
  return <Redirect href="/(tabs)" />;
}
