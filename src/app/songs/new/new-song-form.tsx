"use client";

import { useActionState } from "react";
import { createSong, type CreateSongState } from "./actions";

const field =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none";

export function NewSongForm() {
  const [state, action, pending] = useActionState<CreateSongState, FormData>(createSong, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm text-muted">
          Song title
        </label>
        <input id="title" name="title" required maxLength={120} className={field} placeholder="e.g. Hallelujah" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="artist" className="text-sm text-muted">
          Artist <span className="text-muted/70">(optional)</span>
        </label>
        <input id="artist" name="artist" maxLength={120} className={field} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="lyrics" className="text-sm text-muted">
          Hebrew lyrics
        </label>
        <textarea
          id="lyrics"
          name="lyrics"
          required
          rows={12}
          dir="rtl"
          lang="he"
          className={`${field} hebrew min-h-48 text-lg`}
          placeholder="הדבק כאן את המילים"
        />
        <p className="text-xs text-muted">One line per row. Only lines with Hebrew are used.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="media_url" className="text-sm text-muted">
          Spotify or YouTube link <span className="text-muted/70">(optional)</span>
        </label>
        <input id="media_url" name="media_url" type="url" inputMode="url" className={field} placeholder="https://" />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm text-muted">Who can see this song?</legend>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="private" defaultChecked className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Private</span>
            <span className="block text-sm text-muted">Only you.</span>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="radio" name="visibility" value="public" className="mt-1 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Public</span>
            <span className="block text-sm text-muted">
              Added to the shared library for everyone. <strong className="text-foreground">This can&apos;t be undone.</strong>
            </span>
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
        disabled={pending}
        className="h-12 rounded-xl bg-accent font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {pending ? "Translating… this can take up to a minute" : "Translate and save"}
      </button>
    </form>
  );
}
