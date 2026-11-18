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

// `bar={false}` leaves out the top bar with the X; the screen then puts its own <CloseButton /> where it fits
// (for example beside its Edit button) to save space.
// `nav` keeps the bottom bar visible under the pop-up (for screens that scroll); without it the pop-up covers
// everything, bar included (for study screens like Flash Cards).
export function Overlay({ children, bar = true, nav = false }: { children: React.ReactNode; bar?: boolean; nav?: boolean }) {
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
      <div role="dialog" aria-modal="true" className={`fixed inset-0 overflow-y-auto bg-background ${nav ? "z-10" : "z-40"}`}>
        <div className={`flex min-h-full flex-col ${nav ? "pb-24" : ""}`}>
          {bar && (
            <div className="sticky top-0 z-10 flex justify-end bg-background/90 px-3 py-2 backdrop-blur-md">
              <CloseButton />
            </div>
          )}
          {children}
        </div>
      </div>
    </OverlayContext.Provider>
  );
}

// The round X that closes the pop-up it is in. On the normal full-page version of the same screen (a
// refreshed page, a link, or right after creating something) it goes to `fallbackHref` instead, or
// renders nothing if none is given.
const closeClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-xl text-muted transition-colors hover:bg-surface hover:text-foreground";
export function CloseButton({ fallbackHref, className }: { fallbackHref?: string; className?: string }) {
  const cls = className ?? closeClass;
  const overlay = useOverlay();
  if (overlay) {
    return (
      <button type="button" onClick={overlay.close} aria-label="Close" className={cls}>
        ×
      </button>
    );
  }
  if (!fallbackHref) return null;
  return (
    <Link href={fallbackHref} aria-label="Close" className={cls}>
      ×
    </Link>
  );
}

// An X for a screen that is usually a pop-up but can also be opened as a full page (a refresh or a direct
// link). In the pop-up the top bar already has the X, so this renders nothing there.
export function PageClose({ href }: { href: string }) {
  const overlay = useOverlay();
  if (overlay) return null;
  return (
    <Link href={href} aria-label="Close" className={closeClass}>
      ×
    </Link>
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
