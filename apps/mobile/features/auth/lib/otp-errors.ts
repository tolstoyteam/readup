import type { AuthError } from "@supabase/supabase-js";

import type { TranslationKey } from "@/shared/i18n/translations";

export type EmailOtpPurpose = "signup" | "email_change" | "recovery";

export function isEmailNotConfirmedError(error: AuthError | null | undefined): boolean {
  if (error == null) return false;
  const code = (error as AuthError & { code?: string }).code;
  if (code === "email_not_confirmed") return true;
  const message = error.message.toLowerCase();
  return (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed") ||
    message.includes("confirm your email")
  );
}

export function otpErrorToTranslationKey(error: AuthError): TranslationKey {
  const code = (error as AuthError & { code?: string }).code ?? "";
  const message = error.message.toLowerCase();

  if (
    code === "otp_expired" ||
    message.includes("expired") ||
    message.includes("otp_expired")
  ) {
    return "auth.otpExpired";
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

  if (
    code === "invalid_credentials" ||
    message.includes("invalid") ||
    message.includes("token") ||
    message.includes("otp")
  ) {
    return "auth.otpInvalid";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "auth.otpNetworkError";
  }

  if (isEmailNotConfirmedError(error)) {
    return "auth.emailNotConfirmed";
  }

  return "auth.otpFailed";
}

export function verifyOtpTypeForPurpose(
  purpose: EmailOtpPurpose,
): "email" | "email_change" | "recovery" {
  if (purpose === "email_change") return "email_change";
  if (purpose === "recovery") return "recovery";
  return "email";
}
