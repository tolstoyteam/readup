"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Props = {
  nextPath: string;
  supabaseConfig: { url: string; key: string } | null;
  initialError?: string;
};

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("email not confirmed")
  ) {
    return "Incorrect email or password.";
  }
  if (lower.includes("rate limit") || lower.includes("for security purposes")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }
  return "Could not sign in. Please try again.";
}

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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(null);

    if (error) {
      setMessage(friendlyAuthError(error.message));
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
      setMessage(friendlyAuthError(error.message));
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Readup admin
        </p>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Use an account that has been added to the admin allowlist.
        </CardDescription>
      </CardHeader>

      <CardContent>
      {message ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={signInWithGoogle}
        disabled={loading !== null || !supabase}
        className="w-full"
      >
        {loading === "google" ? "Opening Google..." : "Continue with Google"}
      </Button>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={signInWithPassword}>
        <FieldGroup>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Button
          type="submit"
          disabled={loading !== null || !supabase}
          className="w-full"
        >
          {loading === "password" ? "Signing in..." : "Sign in"}
        </Button>
        </FieldGroup>
      </form>
      </CardContent>
    </Card>
  );
}
