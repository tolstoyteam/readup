import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase } from "@/shared/lib/supabase";

type PushPlatform = "ios" | "android";

type PushRegistrationResult = {
  token: string | null;
  status: Notifications.PermissionStatus | "unsupported" | "missing-project-id";
};

const LOCAL_PUSH_TOKEN_KEY = "readup.expoPushToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getExpoProjectId(): string | null {
  const easProjectId = Constants.easConfig?.projectId;
  if (typeof easProjectId === "string" && easProjectId.length > 0) {
    return easProjectId;
  }

  const extra = Constants.expoConfig?.extra;
  if (extra && typeof extra === "object" && "eas" in extra) {
    const eas = (extra as { eas?: { projectId?: unknown } }).eas;
    if (typeof eas?.projectId === "string" && eas.projectId.length > 0) {
      return eas.projectId;
    }
  }

  return null;
}

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
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
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

  const projectId = getExpoProjectId();
  if (!projectId) {
    if (__DEV__) console.warn("[push] Missing Expo projectId");
    return { token: null, status: "missing-project-id" };
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const now = new Date().toISOString();
  const platform = Platform.OS as PushPlatform;

  const { error } = await supabase.from("user_push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform,
      enabled: true,
      last_error: null,
      last_registered_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,expo_push_token" },
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
    .eq("expo_push_token", token);

  await AsyncStorage.removeItem(LOCAL_PUSH_TOKEN_KEY);
}
