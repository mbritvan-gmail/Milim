"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    if (!supabaseConfigured) {
      setStatus("error");
      setMessage(
        "Sign-in isn't set up on this site yet (missing Supabase settings). Add the Supabase environment variables in Vercel, then redeploy.",
      );
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("sent");
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the sign-in service. Check your connection and try again.");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-center">
        <p className="text-lg font-semibold">Check your email</p>
        <p className="mt-2 text-sm text-muted">
          We sent a sign-in link to <span className="text-foreground">{email}</span>. Open it to
          continue.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm text-accent underline underline-offset-4"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm text-muted">
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 rounded-xl border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="h-12 rounded-xl bg-accent font-semibold text-accent-contrast transition-colors hover:bg-accent-strong disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "error" && <p className="text-sm text-danger">{message}</p>}
    </form>
  );
}
