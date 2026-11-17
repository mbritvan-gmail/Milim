"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// The "⋯ ▾" button beside a screen's title, opening a small menu of links.
type MenuItem = { label: string; icon: React.ReactNode } & ({ href: string; onSelect?: never } | { onSelect: () => void; href?: never });

export function MenuButton({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-2"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-20 flex w-52 flex-col rounded-2xl border border-border bg-surface-2 p-1.5 shadow-xl">
          {items.map((i) =>
            i.href ? (
              <Link key={i.label} role="menuitem" href={i.href} className="flex h-11 items-center gap-3 rounded-xl px-3 font-semibold hover:bg-surface">
                {i.icon}
                {i.label}
              </Link>
            ) : (
              <button
                key={i.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  i.onSelect?.();
                }}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-left font-semibold hover:bg-surface"
              >
                {i.icon}
                {i.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
