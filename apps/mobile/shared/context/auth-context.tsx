import type { AuthError, Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/shared/lib/supabase";

type OAuthProvider = "google" | "apple";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    options?: { fullName?: string },
  ) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateFullName: (fullName: string) => Promise<{ error: AuthError | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) {
        setSession(s);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, options?: { fullName?: string }) => {
      const fullName = options?.fullName?.trim();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options:
          fullName != null && fullName.length > 0
            ? { data: { full_name: fullName } }
            : undefined,
      });
      return { error };
    },
    [],
  );

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    try {
      const redirectTo = Linking.createURL("/");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (error) return { error };
      const oauthUrl = data.url;
      if (!oauthUrl) {
        return {
          error: { message: "Не удалось открыть вход через провайдера", status: 0 } as AuthError,
        };
      }
      const result = await WebBrowser.openAuthSessionAsync(oauthUrl, redirectTo);
      if (result.type !== "success" || !result.url) {
        return { error: null };
      }
      const callbackUrl = result.url;
      const hash = callbackUrl.includes("#") ? callbackUrl.split("#")[1] : "";
      const fragmentParams = new URLSearchParams(hash);
      const access_token = fragmentParams.get("access_token");
      const refresh_token = fragmentParams.get("refresh_token");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        return { error: null };
      }
      try {
        const { queryParams } = Linking.parse(callbackUrl);
        const rawCode = queryParams?.code;
        const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
        if (typeof code === "string" && code.length > 0) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          return { error: exchangeError };
        }
      } catch {
        /* ignore malformed callback URL */
      }
      return { error: null };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "OAuth failed";
      return { error: { message, status: 0 } as AuthError };
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const updateFullName = useCallback(async (fullName: string) => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    return { error };
  }, []);

  const updateEmail = useCallback(async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      updateFullName,
      updateEmail,
      updatePassword,
    }),
    [
      session,
      loading,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      updateFullName,
      updateEmail,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
