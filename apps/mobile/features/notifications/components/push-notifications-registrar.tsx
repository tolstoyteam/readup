import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

import { registerForPushNotifications } from "@/features/notifications/api/push-notifications";
import { useAuth } from "@/shared/context/auth-context";

function isAppNotificationResponse(
  data: Notifications.NotificationContent["data"],
): boolean {
  return (
    data != null &&
    typeof data === "object" &&
    "notificationId" in data &&
    typeof data.notificationId === "string"
  );
}

export function PushNotificationsRegistrar() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    void registerForPushNotifications(user.id).catch((error: unknown) => {
      if (__DEV__ && error instanceof Error) {
        console.warn("[push] Could not refresh push token", error.message);
      }
    });
  }, [user]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (isAppNotificationResponse(response.notification.request.content.data)) {
          router.push("/notifications");
        }
      },
    );

    return () => subscription.remove();
  }, []);

  return null;
}
