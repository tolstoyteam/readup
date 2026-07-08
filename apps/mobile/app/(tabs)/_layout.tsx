import { Redirect, Tabs } from "expo-router";
import { BookMarked, House, Search, UserRound } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchProfile, type Profile } from "@/features/profile/api/profile";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";

export default function TabLayout() {
  const colors = useReadupColors();
  const { t } = useInterfaceLanguage();
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const userId = user?.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError(null);
      return;
    }

    let mounted = true;
    setProfile(null);
    setProfileLoading(true);
    setProfileError(null);

    void fetchProfile(userId)
      .then((nextProfile) => {
        if (mounted) setProfile(nextProfile);
      })
      .catch((error) => {
        if (mounted) {
          setProfile(null);
          setProfileError(
            error instanceof Error ? error.message : "Could not load profile",
          );
        }
      })
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  const awaitingInitialProfile = profile === null && profileLoading;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512]">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!awaitingInitialProfile && profile && !profile.interests_step_done) {
    return <Redirect href="/(setup)/interests" />;
  }

  if (!awaitingInitialProfile && profile && !profile.goal_step_done) {
    return <Redirect href="/(setup)/goal" />;
  }

  const showProfileOverlay =
    awaitingInitialProfile || (profileError != null && profile === null);

  return (
    <View style={styles.root}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textTertiary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
          },
          tabBarItemStyle: {
            height: 56,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color, focused }) => (
              <House
                pointerEvents="none"
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: t("tabs.library"),
            tabBarIcon: ({ color, focused }) => (
              <BookMarked
                pointerEvents="none"
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t("tabs.search"),
            tabBarIcon: ({ color, focused }) => (
              <Search
                pointerEvents="none"
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: t("tabs.profile"),
            tabBarIcon: ({ color, focused }) => (
              <UserRound
                pointerEvents="none"
                size={24}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            ),
          }}
        />
      </Tabs>
      {showProfileOverlay ? (
        <View
          style={styles.profileOverlay}
          pointerEvents="none"
          className="bg-[#FBFAF2] dark:bg-[#101512]"
        >
          {awaitingInitialProfile ? (
            <ActivityIndicator size="large" color={colors.brand} />
          ) : (
            <Text className="px-8 text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
              {profileError}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  profileOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
