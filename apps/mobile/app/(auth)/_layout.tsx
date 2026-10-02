import { Slot } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { NativeRouteSheet } from "@/shared/components/native-route-sheet";

WebBrowser.maybeCompleteAuthSession();

export default function AuthLayout() {
  return (
    <NativeRouteSheet>
      <Slot />
    </NativeRouteSheet>
  );
}
