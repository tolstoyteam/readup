import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/admin-auth";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Readup admin.",
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = normalizeNextPath(params.next);
  const auth = await getAdminAuth().catch(() => null);
  if (auth?.ok) {
    redirect(nextPath);
  }

  const initialError =
    params.error === "not_admin"
      ? "You are signed in, but this account is not on the admin allowlist."
      : undefined;
  const supabaseConfig = getSupabasePublicEnvSafe();

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-background px-6 py-12">
      <LoginForm
        nextPath={nextPath}
        supabaseConfig={supabaseConfig}
        initialError={initialError}
      />
    </main>
  );
}

function normalizeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function getSupabasePublicEnvSafe(): { url: string; key: string } | null {
  try {
    return getSupabasePublicEnv();
  } catch {
    return null;
  }
}
