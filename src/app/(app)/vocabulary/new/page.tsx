import { CloseOrLink } from "@/components/overlay";
import { NewModuleForm } from "./new-module-form";

export const metadata = { title: "New Pack · milim" };

// Looking up a long list of words can take a while.
export const maxDuration = 60;

export default function NewModulePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Pack</h1>
        <CloseOrLink href="/vocabulary" className="text-sm text-muted underline underline-offset-4">
          Cancel
        </CloseOrLink>
      </header>
      <NewModuleForm />
    </main>
  );
}
