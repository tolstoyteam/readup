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

import {
  isAlreadyRegisteredError,
  isDuplicateSignupUser,
} from "@/features/auth/lib/auth-errors";
import {
  type EmailOtpPurpose,
  isEmailNotConfirmedError,
  verifyOtpTypeForPurpose,
} from "@/features/auth/lib/otp-errors";
import { normalizeEmail } from "@/features/auth/lib/password-validation";
import { useInterfaceLanguage } from "@/shared/context/interface-language-context";
import { supabase } from "@/shared/lib/supabase";

type OAuthProvider = "google" | "apple";

type AccountActionResult = { error: Error | null };

export type SignUpResult = {
  error: AuthError | null;
  session: Session | null;
  needsEmailVerification: boolean;
  alreadyRegistered: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    options?: { fullName?: string },
  ) => Promise<SignUpResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error: AuthError | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  verifyEmailOtp: (params: {
    email: string;
    token: string;
    purpose: EmailOtpPurpose;
  }) => Promise<{ error: AuthError | null }>;
  resendEmailOtp: (params: {
    email: string;
    purpose: EmailOtpPurpose;
  }) => Promise<{ error: AuthError | null }>;
  isEmailNotConfirmedError: (error: AuthError | null | undefined) => boolean;
  signOut: () => Promise<{ error: AuthError | null }>;
  deleteAccount: () => Promise<AccountActionResult>;
  updateFullName: (fullName: string) => Promise<{ error: AuthError | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function alreadyRegisteredAuthError(): AuthError {
  return {
    name: "AuthApiError",
    message: "User already registered",
    status: 422,
    code: "user_already_registered",
  } as AuthError;
}

function requestFailedAuthError(message: string): AuthError {
  return {
    name: "AuthApiError",
    message,
    status: 0,
    code: "request_failed",
  } as AuthError;
}

type CheckEmailAvailableResponse = {
  exists?: boolean;
  error?: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useInterfaceLanguage();

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
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    return { error };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, options?: { fullName?: string }) => {
      const fullName = options?.fullName?.trim();
      const normalized = normalizeEmail(email);

      // Server-side existence check BEFORE signUp so Auth never sends a signup OTP
      // for an email that already belongs to an account (verified or unverified).
      const { data: checkData, error: checkError } =
        await supabase.functions.invoke<CheckEmailAvailableResponse>(
          "check-email-available",
          { body: { email: normalized } },
        );

      if (checkError) {
        return {
          error: requestFailedAuthError(
            checkError.message || "Could not verify email availability",
          ),
          session: null,
          needsEmailVerification: false,
          alreadyRegistered: false,
        };
      }

      if (checkData?.error != null || typeof checkData?.exists !== "boolean") {
        return {
          error: requestFailedAuthError(
            checkData?.error ?? "Could not verify email availability",
          ),
          session: null,
          needsEmailVerification: false,
          alreadyRegistered: false,
        };
      }

      if (checkData.exists) {
        const duplicateError = alreadyRegisteredAuthError();
        return {
          error: duplicateError,
          session: null,
          needsEmailVerification: false,
          alreadyRegistered: true,
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options:
          fullName != null && fullName.length > 0
            ? { data: { full_name: fullName } }
            : undefined,
      });

      if (error) {
        const alreadyRegistered = isAlreadyRegisteredError(error);
        return {
          error,
          session: null,
          needsEmailVerification: false,
          alreadyRegistered,
        };
      }

      // Defense-in-depth: obfuscated signup response for confirmed duplicates.
      if (isDuplicateSignupUser(data.user)) {
        const duplicateError = alreadyRegisteredAuthError();
        return {
          error: duplicateError,
          session: null,
          needsEmailVerification: false,
          alreadyRegistered: true,
        };
      }

      const nextSession = data.session ?? null;
      return {
        error: null,
        session: nextSession,
        needsEmailVerification: nextSession == null,
        alreadyRegistered: false,
      };
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
    return { error };
  }, []);

  const verifyEmailOtp = useCallback(
    async (params: { email: string; token: string; purpose: EmailOtpPurpose }) => {
      const { error } = await supabase.auth.verifyOtp({
        email: normalizeEmail(params.email),
        token: params.token,
        type: verifyOtpTypeForPurpose(params.purpose),
      });
      return { error };
    },
    [],
  );

  const resendEmailOtp = useCallback(
    async (params: { email: string; purpose: EmailOtpPurpose }) => {
      const email = normalizeEmail(params.email);

      if (params.purpose === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return { error };
      }

      if (params.purpose === "email_change") {
        const { error } = await supabase.auth.resend({
          type: "email_change",
          email,
        });
        return { error };
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
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
          error: { message: t("auth.oauthOpenFailed"), status: 0 } as AuthError,
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
      const message = e instanceof Error ? e.message : t("auth.oauthFailed");
      return { error: { message, status: 0 } as AuthError };
    }
  }, [t]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const deleteAccount = useCallback(async (): Promise<AccountActionResult> => {
    const { data, error } = await supabase.functions.invoke<{ deleted?: boolean }>(
      "delete-account",
    );
    if (error) return { error };
    if (data?.deleted !== true) {
      return { error: new Error("Account deletion was not confirmed by the server.") };
    }

    await supabase.auth.signOut({ scope: "local" });
    return { error: null };
  }, []);

  const updateFullName = useCallback(async (fullName: string) => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });
    return { error };
  }, []);

  const updateEmail = useCallback(async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: normalizeEmail(newEmail) });
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
      requestPasswordReset,
      verifyEmailOtp,
      resendEmailOtp,
      isEmailNotConfirmedError,
      signOut,
      deleteAccount,
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
      requestPasswordReset,
      verifyEmailOtp,
      resendEmailOtp,
      signOut,
      deleteAccount,
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
