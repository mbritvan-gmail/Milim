import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { StaleRefresher } from "@/components/overlay";

// Everything a signed-in person uses shares the bottom bar. `modal` is the pop-up slot: Settings, a
// word, a study session and a quiz open there, on top of whatever page you were on.
export default function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-24">{children}</div>
      {modal}
      <Suspense fallback={null}>
        <AppNav />
        <StaleRefresher />
      </Suspense>
    </>
  );
}
