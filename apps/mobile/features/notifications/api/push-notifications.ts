import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@/shared/lib/supabase";

type PushPlatform = "ios" | "android";

type PushRegistrationResult = {
  token: string | null;
  status: Notifications.PermissionStatus | "unsupported";
};

const LOCAL_PUSH_TOKEN_KEY = "readup.nativePushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function registerForPushNotifications(
  userId: string,
  options: { requestPermissions?: boolean } = {},
): Promise<PushRegistrationResult> {
  if (Platform.OS !== "ios") {
    return { token: null, status: "unsupported" };
  }

  await ensureAndroidChannel();

  const currentPermissions = await Notifications.getPermissionsAsync();
  let status = currentPermissions.status;

  if (status !== Notifications.PermissionStatus.GRANTED) {
    if (options.requestPermissions !== true) {
      return { token: null, status };
    }

    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== Notifications.PermissionStatus.GRANTED) {
    return { token: null, status };
  }

  const devicePushToken = await Notifications.getDevicePushTokenAsync();
  const token =
    typeof devicePushToken.data === "string"
      ? devicePushToken.data
      : String(devicePushToken.data);
  const now = new Date().toISOString();
  const platform = Platform.OS as PushPlatform;

  const { error } = await supabase.from("user_push_tokens").upsert(
    {
      user_id: userId,
      push_token: token,
      platform,
      provider: "apns",
      apns_environment: __DEV__ ? "sandbox" : "production",
      enabled: true,
      last_error: null,
      last_registered_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,push_token" },
  );

  if (error) throw error;

  await AsyncStorage.setItem(LOCAL_PUSH_TOKEN_KEY, token);
  return { token, status };
}

export async function disableCurrentPushToken(userId: string): Promise<void> {
  const token = await AsyncStorage.getItem(LOCAL_PUSH_TOKEN_KEY);
  if (!token) return;

  await supabase
    .from("user_push_tokens")
    .update({
      enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("push_token", token);

  await AsyncStorage.removeItem(LOCAL_PUSH_TOKEN_KEY);
}
