export const MIN_PASSWORD_LENGTH = 6;

export type PasswordValidationIssue = "too_short" | "mismatch" | "empty_confirm";

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): PasswordValidationIssue | null {
  if (!isPasswordLongEnough(password)) return "too_short";
  if (confirmPassword.length === 0) return "empty_confirm";
  if (!passwordsMatch(password, confirmPassword)) return "mismatch";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
