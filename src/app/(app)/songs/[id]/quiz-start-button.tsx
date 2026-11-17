"use client";

import { useFormStatus } from "react-dom";

export function QuizStartButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-xl border border-border px-3 font-semibold transition-colors hover:bg-surface-2 disabled:opacity-60"
    >
      {pending ? "Preparing…" : label}
    </button>
  );
}
