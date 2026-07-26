import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

type AdminShellProps = {
  active: "books" | "users" | "upload";
  children: ReactNode;
};

const NAV_ITEMS = [
  { key: "books", href: "/books", label: "Books" },
  { key: "users", href: "/users", label: "Users" },
  { key: "upload", href: "/upload", label: "Book upload" },
] as const;

export function AdminShell({ active, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-elevated bg-surface lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href="/books" className="block">
            <span className="text-base font-bold text-foreground">Readup</span>
            <span className="mt-1 hidden text-xs font-medium text-text-tertiary lg:block">
              Admin panel
            </span>
          </Link>
          <form action={signOut} className="lg:hidden">
            <button
              type="submit"
              className="rounded-[8px] border border-elevated bg-background px-3 py-2 text-xs font-semibold text-text-secondary"
            >
              Sign out
            </button>
          </form>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3 lg:pb-0">
          {NAV_ITEMS.map((item) => {
            const selected = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={
                  selected
                    ? "block whitespace-nowrap rounded-[8px] bg-brand px-3 py-2 text-sm font-semibold text-text-inverse"
                    : "block whitespace-nowrap rounded-[8px] px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-background hover:text-foreground"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden px-5 py-6 lg:block">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-[8px] border border-elevated bg-background px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-brand hover:text-brand"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
