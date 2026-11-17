"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";

// A full-screen pop-up over the page you were on, closed with the X (or Escape, or the browser's
// Back button). It is used by "intercepting" routes (see src/app/(app)/@modal): a link opens the
// screen on top of the current page; opening the same address directly shows it as a normal page.

const OverlayContext = createContext<{ close: () => void } | null>(null);

// Set when an overlay goes away, so the page underneath can refresh its data.
let stale = false;

export function useOverlay() {
  return useContext(OverlayContext);
}

export function Overlay({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      stale = true;
    };
  }, [close]);

  return (
    <OverlayContext.Provider value={{ close }}>
      <div role="dialog" aria-modal="true" className="fixed inset-0 z-40 overflow-y-auto bg-background">
        <div className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 flex justify-end bg-background/90 px-3 py-2 backdrop-blur-md">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-xl text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              ×
            </button>
          </div>
          {children}
        </div>
      </div>
    </OverlayContext.Provider>
  );
}

// Inside a pop-up, "go back" buttons close it; on a normal page they are ordinary links.
export function CloseOrLink({
  href,
  className,
  children,
  ariaLabel,
  hideInOverlay = false,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  /** The pop-up already has its own X, so a duplicate exit button is left out. */
  hideInOverlay?: boolean;
}) {
  const overlay = useOverlay();
  if (overlay) {
    if (hideInOverlay) return null;
    return (
      <button type="button" onClick={overlay.close} aria-label={ariaLabel} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link href={href} aria-label={ariaLabel} className={className}>
      {children}
    </Link>
  );
}

// After a pop-up closes, refresh the page underneath (statuses, settings and so on may have changed).
export function StaleRefresher() {
  const pathname = usePathname();
  const router = useRouter();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (stale) {
      stale = false;
      router.refresh();
    }
  }, [pathname, router]);
  return null;
}
