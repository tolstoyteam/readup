import { Redirect } from "expo-router";

import LibraryScreen from "@/features/library/screens/library-screen";
import { useAuth } from "@/shared/context/auth-context";

export default function LibraryTab() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return <LibraryScreen />;
}
