import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { RotatingBackground } from "@/components/rotating-background";
import { RotatingTagline } from "@/components/rotating-tagline";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Sign in · milim" };

// The static shell renders instantly; only the part that reads the URL query
// (?next=…, ?error=…) is streamed in.
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <div className="force-dark relative isolate flex flex-1 flex-col">
      <RotatingBackground />
      <main className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 px-4 py-10">
        <div className="text-center">
          <h1 className="hebrew text-6xl font-bold text-accent">מילים</h1>
          <p className="mt-1 text-xl font-semibold">milim</p>
        </div>
        <RotatingTagline />
        <div className="rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur-md">
          <Suspense fallback={<div className="h-40" />}>
            <LoginBody searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="text-center text-sm text-muted">No password needed. We&apos;ll email you a link.</p>
      </main>
    </div>
  );
}

async function LoginBody({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return <LoginForm next={safeNext(next)} linkError={Boolean(error)} />;
}
