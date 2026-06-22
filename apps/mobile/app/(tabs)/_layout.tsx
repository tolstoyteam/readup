import { Redirect, Tabs } from "expo-router";
import { BookMarked, House, Search, UserRound } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { fetchProfile, type Profile } from "@/features/profile/api/profile";
import { HapticTab } from "@/shared/components/haptic-tab";
import { useReadupColors } from "@/shared/constants/readup-theme";
import { useAuth } from "@/shared/context/auth-context";

export default function TabLayout() {
  const colors = useReadupColors();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let mounted = true;
    setProfileLoading(true);
    setProfileError(null);
    void fetchProfile(user.id)
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
  }, [user]);

  if (loading || profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512]">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (profileError) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FBFAF2] dark:bg-[#101512] px-8">
        <Text className="text-center text-[15px] leading-6 text-[#4A5550] dark:text-[#B8C1BB]">
          {profileError}
        </Text>
      </View>
    );
  }

  if (!profile?.interests_step_done) {
    return <Redirect href="/(setup)/interests" />;
  }

  if (!profile.goal_step_done) {
    return <Redirect href="/(setup)/goal" />;
  }

  return (
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
          minHeight: 72,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarButton: (props) => <HapticTab {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
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
          title: "Library",
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
          title: "Search",
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
          title: "Profile",
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
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
