import Link from "next/link";

type NavLink = {
  href: string;
  label: string;
};

type Props = {
  links?: NavLink[];
};

const DEFAULT_LINKS: NavLink[] = [
  { href: "/", label: "← Home" },
  { href: "/books", label: "Saved books" },
  { href: "/upload", label: "Upload" },
];

export function AdminNav({ links = DEFAULT_LINKS }: Props) {
  return (
    <nav className="border-b border-elevated bg-background/85 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <span className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-text-tertiary">
          Readup admin
        </span>
      </div>
    </nav>
  );
}
