"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// A panel in the middle of the screen. It is drawn on the page itself (not inside a pop-up), so it always sits above the bottom bar.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-surface p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full text-xl text-muted hover:bg-surface-2">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

