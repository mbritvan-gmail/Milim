import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuButton } from "@/components/menu-button";
import { chunk } from "@/lib/study";

export const metadata = { title: "Vocabulary · milim" };

export default function VocabularyPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
        <VocabularyBody />
      </Suspense>
    </main>
  );
}

async function VocabularyBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [modulesRes, mineRes] = await Promise.all([
    supabase
      .from("modules")
      .select("id, title, owner_id, visibility, archived_at")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("user_modules").select("module_id"),
  ]);

  const header = (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">Vocabulary</h1>
      <MenuButton
        label="Vocabulary options"
        items={[
          {
            href: "/vocabulary/new",
            label: "New module",
            icon: (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            ),
          },
        ]}
      />
    </div>
  );

  if (modulesRes.error) {
    const missing = modulesRes.error.code === "42P01" || modulesRes.error.code === "PGRST205" || /schema cache|does not exist/.test(modulesRes.error.message);
    return (
      <>
        {header}
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
          {missing
            ? "Vocabulary modules need the latest database update, which hasn't been run yet."
            : "Couldn't load the modules. Please try again."}
        </p>
      </>
    );
  }

  const mine = new Set((mineRes.data ?? []).map((r) => r.module_id as string));
  // Everyone's public modules, plus anything of yours (including ones you added that were archived since).
  const modules = (modulesRes.data ?? []).filter(
    (m) => mine.has(m.id) || m.owner_id === user.id || (m.visibility === "public" && !m.archived_at),
  );

  // Word counts, and how many the person has learned in each module they added.
  const ids = modules.map((m) => m.id as string);
  const wordsByModule = new Map<string, string[]>();
  for (const part of chunk(ids, 60)) {
    const { data } = await supabase.from("module_words").select("module_id, vocab_entry_id").in("module_id", part).limit(5000);
    for (const r of data ?? []) {
      const list = wordsByModule.get(r.module_id as string) ?? [];
      list.push(r.vocab_entry_id as string);
      wordsByModule.set(r.module_id as string, list);
    }
  }
  const learned = new Set<string>();
  const addedWordIds = [...new Set(modules.filter((m) => mine.has(m.id)).flatMap((m) => wordsByModule.get(m.id) ?? []))];
  for (const part of chunk(addedWordIds, 60)) {
    const { data } = await supabase.from("user_words").select("vocab_entry_id, learned_at").in("vocab_entry_id", part).not("learned_at", "is", null);
    for (const r of data ?? []) learned.add(r.vocab_entry_id as string);
  }

  const ownerIds = [...new Set(modules.map((m) => m.owner_id as string).filter((id) => id !== user.id))];
  const { data: owners } = ownerIds.length ? await supabase.from("profiles").select("id, display_name").in("id", ownerIds) : { data: [] };
  const nameById = new Map((owners ?? []).map((o) => [o.id as string, o.display_name as string | null]));

  return (
    <>
      {header}
      <p className="text-sm text-muted">Themed word lists. Add one to put its words in your Dictionary.</p>
      {modules.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No modules yet. Use the menu to make your first one.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {modules.map((m) => {
            const words = wordsByModule.get(m.id) ?? [];
            const added = mine.has(m.id);
            const done = words.filter((w) => learned.has(w)).length;
            const by = m.owner_id === user.id ? (m.visibility === "public" ? "Shared by you" : "Private") : `Shared by ${nameById.get(m.owner_id) ?? "someone"}`;
            return (
              <li key={m.id}>
                <Link href={`/vocabulary/${m.id}`} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">{m.title}</span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${added ? "border-success/50 bg-success/15 text-success" : "border-border text-muted"}`}>
                      {added ? "Added" : "Not added"}
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    {words.length} {words.length === 1 ? "word" : "words"} · {by}
                    {m.archived_at ? " · Archived" : ""}
                  </span>
                  {added && words.length > 0 && (
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <span className="block h-full bg-success" style={{ width: `${Math.round((done / words.length) * 100)}%` }} />
                      </span>
                      {done} of {words.length} learned
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
