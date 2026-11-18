"use client";

import { useFormStatus } from "react-dom";

export function QuizStartButton({ label, ariaLabel }: { label: string; ariaLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      disabled={pending}
      className="sp-outline"
    >
      {pending ? "Preparing…" : label}
    </button>
  );
}
