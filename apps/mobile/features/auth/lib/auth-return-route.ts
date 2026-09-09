export type AuthReturnTo = "/subscription";

export function parseAuthReturnTo(
  raw: string | string[] | undefined,
): AuthReturnTo | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const returnTo = value?.trim();

  return returnTo === "/subscription" ? returnTo : null;
}

export function authReturnToParams(
  returnTo: AuthReturnTo | null,
): { returnTo: string } | undefined {
  return returnTo ? { returnTo } : undefined;
}
