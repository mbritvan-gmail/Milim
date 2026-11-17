"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS = [
  {
    href: "/songs",
    label: "Songs",
    svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...icon}>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Library",
    svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...icon}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
      </svg>
    ),
  },
  {
    href: "/flashcards",
    label: "Cards",
    svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...icon}>
        <rect x="3" y="6" width="14" height="12" rx="2" />
        <path d="M7 3h12a2 2 0 0 1 2 2v10" />
      </svg>
    ),
  },
  {
    href: "/dictionary",
    label: "Dictionary",
    svg: (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...icon}>
        <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
        <path d="M4 19V5" />
        <path d="M9 8h6" />
      </svg>
    ),
  },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${active ? "text-accent" : "text-muted hover:text-foreground"}`}
              >
                {tab.svg}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
