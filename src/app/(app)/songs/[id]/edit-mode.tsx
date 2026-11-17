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

// The Edit / Done button in a song's header. Only shown for the person who owns the song.
export function EditButton() {
  const { editing, setEditing } = useEditMode();
  return editing ? (
    <button
      type="button"
      onClick={() => setEditing(false)}
      className="h-10 shrink-0 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-contrast hover:bg-accent-strong"
    >
      Done
    </button>
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
