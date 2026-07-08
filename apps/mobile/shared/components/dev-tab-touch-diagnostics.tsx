import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

function collectRouteNames(state: {
  routes: { name: string; state?: unknown }[];
}): string[] {
  const names: string[] = [];
  for (const route of state.routes) {
    names.push(route.name);
    if (route.state && typeof route.state === "object" && "routes" in route.state) {
      names.push(
        ...collectRouteNames(
          route.state as { routes: { name: string; state?: unknown }[] },
        ),
      );
    }
  }
  return names;
}

function logNavigationStack(navigation: NavigationProp<ParamListBase>) {
  const rootState = navigation.getState();
  if (!rootState) return;

  const routeNames = collectRouteNames(
    rootState as { routes: { name: string; state?: unknown }[] },
  );
  const tabsCount = routeNames.filter((name) => name === "(tabs)").length;

  console.log("[TabTouchDiag] tabs focused — stack routes:", routeNames.join(" > "));
  if (tabsCount > 1) {
    console.warn(
      `[TabTouchDiag] duplicate (tabs) entries detected: ${tabsCount}`,
    );
  }
}

/** Dev-only navigation stack logger to detect duplicate (tabs) routes. */
export function DevTabTouchDiagnostics() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useFocusEffect(
    useCallback(() => {
      if (!__DEV__) return;
      logNavigationStack(navigation);
    }, [navigation]),
  );

  return null;
}
