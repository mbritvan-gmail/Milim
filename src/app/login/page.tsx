import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Sign in · Milim" };

// The static shell renders instantly; only the part that reads the URL query
// (?next=…, ?error=…) is streamed in.
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="hebrew text-5xl font-bold text-accent">מילים</h1>
        <p className="mt-2 text-xl font-semibold">Sign in to Milim</p>
        <p className="mt-1 text-sm text-muted">No password needed. We&apos;ll email you a link.</p>
      </div>
      <Suspense fallback={<div className="h-40" />}>
        <LoginBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginBody({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <>
      {error && (
        <p className="rounded-xl border border-danger/40 bg-surface p-3 text-center text-sm text-danger">
          That sign-in link didn&apos;t work or has expired. Please request a new one.
        </p>
      )}
      <LoginForm next={safeNext(next)} />
    </>
  );
}
