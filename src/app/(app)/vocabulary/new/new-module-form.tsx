"use client";

import { useActionState, useMemo, useState } from "react";
import { createModule, type CreateModuleState } from "../actions";
import { MAX_MODULE_WORDS, parseWordList } from "@/lib/modules";

const field =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

export function NewModuleForm() {
  const [state, action, pending] = useActionState<CreateModuleState, FormData>(createModule, {});
  const [words, setWords] = useState("");
  const count = useMemo(() => parseWordList(words).words.length, [words]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm text-muted">
          Title
        </label>
        <input id="title" name="title" required maxLength={120} className={field} placeholder="e.g. Sports" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="words" className="text-sm text-muted">
          Hebrew words
        </label>
        <textarea
          id="words"
          name="words"
          required
          rows={9}
          lang="he"
          dir="rtl"
          className={`${field} hebrew text-xl`}
          placeholder={"כדורגל\nכדורסל\nשחייה"}
          value={words}
          onChange={(e) => setWords(e.target.value)}
        />
        <p className="text-xs text-muted">
          One word per line, or separated by commas. Claude adds the English meaning, pronunciation, nikud, gender and plural. Verbs are saved as
          infinitives. Up to {MAX_MODULE_WORDS} words.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm text-muted">Who can see this pack?</legend>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="public" defaultChecked className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Public</span>
            <span className="block text-sm text-muted">
              Shared with everyone. <strong className="text-foreground">A public pack stays public.</strong>
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="private" className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Private</span>
            <span className="block text-sm text-muted">Only you. You can make it public later, but not the other way around.</span>
          </span>
        </label>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-surface p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || count === 0}
        className="h-12 rounded-xl bg-accent font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Looking up the words… this can take a moment" : count > 0 ? `Create pack (${count} ${count === 1 ? "word" : "words"})` : "Create pack"}
      </button>
    </form>
  );
}
