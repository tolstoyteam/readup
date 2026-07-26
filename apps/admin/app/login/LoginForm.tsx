"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  nextPath: string;
  supabaseConfig: { url: string; key: string } | null;
  initialError?: string;
};

export function LoginForm({ nextPath, supabaseConfig, initialError }: Props) {
  const supabase = useMemo(
    () =>
      supabaseConfig
        ? createSupabaseBrowserClient(supabaseConfig.url, supabaseConfig.key)
        : null,
    [supabaseConfig],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(
    initialError ??
      (supabaseConfig
        ? ""
        : "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."),
  );
  const [loading, setLoading] = useState<"password" | "google" | null>(null);

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setMessage("");
    setLoading("password");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);

    if (error) {
      setMessage(error.message);
      return;
    }
    window.location.assign(nextPath);
  }

  async function signInWithGoogle() {
    if (!supabase) return;
    setMessage("");
    setLoading("google");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setLoading(null);
      setMessage(error.message);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-card border border-elevated bg-surface p-6 shadow-sm">
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand">
          Readup admin
        </p>
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-foreground">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Use an account that has been added to the admin allowlist.
        </p>
      </div>

      {message ? (
        <div className="mb-4 rounded-button border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading !== null || !supabase}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-button border border-elevated bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-brand disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading === "google" ? "Opening Google..." : "Continue with Google"}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-elevated" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
          or
        </span>
        <div className="h-px flex-1 bg-elevated" />
      </div>

      <form className="space-y-4" onSubmit={signInWithPassword}>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
            Email
          </span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-[46px] w-full rounded-button border border-elevated bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-[46px] w-full rounded-button border border-elevated bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand"
          />
        </label>
        <button
          type="submit"
          disabled={loading !== null || !supabase}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-button border-2 border-brand-dark bg-brand px-4 text-sm font-semibold text-text-inverse shadow-sm transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "password" ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
