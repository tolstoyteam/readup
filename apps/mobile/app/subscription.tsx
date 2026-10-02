import SubscriptionScreen from "@/features/subscription/screens/subscription-screen";
import { NativeRouteSheet } from "@/shared/components/native-route-sheet";

export default function SubscriptionRoute() {
  return (
    <NativeRouteSheet heightFraction={0.9}>
      <SubscriptionScreen />
    </NativeRouteSheet>
  );
}
