import { Redirect } from "expo-router";

import ProfileScreen from "@/features/profile/screens/profile-screen";
import { useAuth } from "@/shared/context/auth-context";

export default function AccountTab() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return <ProfileScreen />;
}
