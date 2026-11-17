import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";

// Everything a signed-in person uses (songs, flashcards, dictionary) shares the bottom tab bar.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      <Suspense fallback={null}>
        <AppNav />
      </Suspense>
    </>
  );
}
