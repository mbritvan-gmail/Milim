"use client";

import { useFormStatus } from "react-dom";

export function QuizStartButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-xl bg-accent px-5 font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
    >
      {pending ? "Preparing quiz… (the first time can take a bit)" : label}
    </button>
  );
}
