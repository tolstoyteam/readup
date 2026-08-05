import type { AuthError } from "@supabase/supabase-js";

import type { TranslationKey } from "@/shared/i18n/translations";

function errorCode(error: AuthError): string {
  return ((error as AuthError & { code?: string }).code ?? "").toLowerCase();
}

export function isAlreadyRegisteredError(error: AuthError | null | undefined): boolean {
  if (error == null) return false;
  const code = errorCode(error);
  if (
    code === "user_already_registered" ||
    code === "user_already_exists" ||
    code === "email_exists" ||
    code === "email_address_already_registered"
  ) {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("user already registered") ||
    message.includes("already been registered") ||
    message.includes("email address is already registered") ||
    message.includes("email already")
  );
}

export function isDuplicateSignupUser(user: {
  identities?: { id?: string }[] | null;
} | null): boolean {
  if (user == null) return false;
  return (user.identities?.length ?? 0) === 0;
}

export function authErrorToTranslationKey(
  error: AuthError,
  context: "login" | "signup" | "reset" | "generic" = "generic",
): TranslationKey {
  const code = errorCode(error);
  const message = error.message.toLowerCase();

  if (isAlreadyRegisteredError(error)) {
    return "auth.emailAlreadyExists";
  }

  if (
    code === "weak_password" ||
    message.includes("weak password") ||
    message.includes("password should be") ||
    message.includes("password is too weak")
  ) {
    return "auth.passwordTooWeak";
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("for security purposes") ||
    message.includes("only request this after")
  ) {
    return "auth.otpRateLimited";
  }

  if (message.includes("network") || message.includes("fetch") || message.includes("failed to fetch")) {
    return "auth.otpNetworkError";
  }

  if (
    code === "request_failed" ||
    message.includes("could not verify email") ||
    message.includes("email check") ||
    message.includes("temporarily unavailable")
  ) {
    return "auth.requestFailed";
  }

  if (
    code === "invalid_credentials" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "auth.invalidCredentials";
  }

  if (code === "user_not_found" || message.includes("user not found")) {
    return context === "login" ? "auth.invalidCredentials" : "auth.requestFailed";
  }

  if (context === "signup") return "auth.signupFailed";
  if (context === "login") return "auth.loginFailed";
  if (context === "reset") return "auth.passwordUpdateFailed";
  return "auth.requestFailed";
}
