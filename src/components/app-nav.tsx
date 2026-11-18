"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const icon = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const itemClass = "flex min-h-11 flex-col items-center gap-1 py-2 text-xs transition-colors";
const glassIdle = "text-[var(--nav-glass-fg)] hover:text-[var(--nav-glass-active)]";

// The bottom bar on every signed-in screen: Back, Home, Settings.
export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/home";
  const onSettings = pathname === "/settings";
  const onAbout = pathname === "/about";

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/home");
  }

  return (
    <nav aria-label="Main" className={`fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl ${onHome ? "border-[var(--nav-glass-border)] bg-[var(--nav-glass-bg)]" : "border-border bg-background/90"}`}>
      <ul className="mx-auto flex max-w-md">
        <li className="flex-1">
          {onHome ? (
            <Link href="/about" aria-current={onAbout ? "page" : undefined} className={`${itemClass} ${onHome ? glassIdle : "text-muted hover:text-foreground"}`}>
              <svg {...icon}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5" />
                <path d="M12 8h.01" />
              </svg>
              About
            </Link>
          ) : (
            <button type="button" onClick={goBack} className={`${itemClass} w-full text-muted hover:text-foreground`}>
              <svg {...icon}>
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              Back
            </button>
          )}
        </li>
        <li className="flex-1">
          <Link href="/home" aria-current={onHome ? "page" : undefined} className={`${itemClass} ${onHome ? "font-semibold text-[var(--nav-glass-active)]" : "text-muted hover:text-foreground"}`}>
            <svg {...icon}>
              <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
            </svg>
            Home
          </Link>
        </li>
        <li className="flex-1">
          <Link href="/settings" aria-current={onSettings ? "page" : undefined} className={`${itemClass} ${onSettings ? "font-semibold text-accent" : onHome ? glassIdle : "text-muted hover:text-foreground"}`}>
            <svg {...icon}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            Settings
          </Link>
        </li>
      </ul>
    </nav>
  );
}
