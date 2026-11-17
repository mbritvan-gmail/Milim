"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastState = { message: string; undo?: () => Promise<void> | void } | null;

type EditModeValue = {
  editing: boolean;
  setEditing: (on: boolean) => void;
  showToast: (message: string, undo?: () => Promise<void> | void) => void;
};

const EditModeContext = createContext<EditModeValue | null>(null);

export function useEditMode(): EditModeValue {
  const value = useContext(EditModeContext);
  if (!value) throw new Error("useEditMode must be used inside EditModeProvider");
  return value;
}

// Holds whether a song is being edited, and the "Undo" message shown after each edit. It sits above
// both the page header (which has the Edit button) and the lyrics, so they stay in step.
export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [undoing, setUndoing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, undo?: () => Promise<void> | void) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, undo });
      timer.current = setTimeout(() => setToast(null), 8000);
    },
    [],
  );

  const value = useMemo(() => ({ editing, setEditing, showToast }), [editing, showToast]);

  async function runUndo() {
    if (!toast?.undo || undoing) return;
    setUndoing(true);
    try {
      await toast.undo();
    } finally {
      setUndoing(false);
      dismiss();
    }
  }

  return (
    <EditModeContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm shadow-lg"
        >
          <span>{toast.message}</span>
          {toast.undo && (
            <button type="button" onClick={runUndo} disabled={undoing} className="font-semibold text-accent disabled:opacity-60">
              {undoing ? "Undoing…" : "Undo"}
            </button>
          )}
        </div>
      )}
    </EditModeContext.Provider>
  );
}

// The Edit / Done button in a song's header, with "Remove song" beside Done while editing.
export function EditButton({
  onRemove,
  visibility,
  removeLabel = "Remove song",
}: {
  onRemove?: () => void;
  visibility?: { isPublic: boolean; onMakePublic: () => void };
  removeLabel?: string;
}) {
  const { editing, setEditing } = useEditMode();
  return editing ? (
    <div className="ml-auto flex shrink-0 items-center gap-2">
      {visibility && !visibility.isPublic && (
        <button
          type="button"
          onClick={visibility.onMakePublic}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-surface"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
          </svg>
          Make public
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-danger/50 px-3 text-sm font-semibold text-danger hover:bg-surface"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
          Remove
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-contrast hover:bg-accent-strong"
      >
        Done
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="h-10 shrink-0 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface"
    >
      ✎ Edit
    </button>
  );
}
