"use client";

import Link from "next/link";
import { useState } from "react";
import { MenuButton } from "@/components/menu-button";
import { Sheet } from "@/components/sheet";
import { makeModulePublic, removeModuleFromList } from "./actions";

export type ListModule = {
  id: string;
  title: string;
  visibility: "public" | "private";
  isOwner: boolean;
  added: boolean;
  archived: boolean;
  words: number;
  learned: number;
  by: string;
};

type Confirm = { kind: "remove" | "public"; module: ListModule } | null;

function removeWording(m: ListModule) {
  if (m.isOwner && m.visibility === "private") return { warning: "This permanently deletes the module. The words stay in the shared dictionary.", button: "Delete forever" };
  if (m.isOwner)
    return {
      warning: "Public modules can't be deleted. Archiving hides it from the list and removes it from yours, but people who already added it keep it.",
      button: "Archive",
    };
  return { warning: "This only removes it from your list. The module itself isn't deleted.", button: "Remove" };
}

export function ModulesList({ modules: serverModules }: { modules: ListModule[] }) {
  const [modules, setModules] = useState(serverModules);
  const [seen, setSeen] = useState(serverModules);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  // When fresh data arrives from the server, show it (without leaving edit mode).
  if (serverModules !== seen) {
    setSeen(serverModules);
    setModules(serverModules);
  }

  async function run() {
    if (!confirm) return;
    setBusy(true);
    setProblem("");
    const { kind, module } = confirm;
    if (kind === "remove") {
      const error = await removeModuleFromList(module.id).catch(() => "Couldn't remove that module. Please try again.");
      if (error) setProblem(error);
      else {
        setModules((ms) => ms.filter((m) => m.id !== module.id));
        setConfirm(null);
      }
    } else {
      const ok = await makeModulePublic(module.id).catch(() => false);
      if (!ok) setProblem("Couldn't make this module public. Please try again.");
      else {
        setModules((ms) => ms.map((m) => (m.id === module.id ? { ...m, visibility: "public", by: "Shared by you" } : m)));
        setConfirm(null);
      }
    }
    setBusy(false);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Vocabulary</h1>
        {editing ? (
          <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-contrast hover:bg-accent-strong">
            Done
          </button>
        ) : (
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
              {
                label: "Edit",
                onSelect: () => setEditing(true),
                icon: (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                ),
              },
            ]}
          />
        )}
      </div>

      {editing ? (
        <p className="px-0.5 text-sm text-muted">Tap the minus to remove a module. Private modules can be made public, but a public module stays public.</p>
      ) : (
        <p className="text-sm text-muted">Themed word lists. Add one to put its words in your Dictionary.</p>
      )}

      {modules.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No modules yet. Use the menu to make your first one.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {modules.map((m) => {
            const meta = `${m.words} ${m.words === 1 ? "word" : "words"} · ${m.by}${m.archived ? " · Archived" : ""}`;
            if (editing) {
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setProblem("");
                      setConfirm({ kind: "remove", module: m });
                    }}
                    aria-label={`Remove ${m.title}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-background"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{m.title}</span>
                    <span className="truncate text-sm text-muted">{meta}</span>
                  </span>
                  {m.isOwner && m.visibility === "private" && (
                    <button
                      type="button"
                      onClick={() => {
                        setProblem("");
                        setConfirm({ kind: "public", module: m });
                      }}
                      className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
                    >
                      Make public
                    </button>
                  )}
                </li>
              );
            }
            return (
              <li key={m.id}>
                <Link href={`/vocabulary/${m.id}`} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">{m.title}</span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.added ? "border-success/50 bg-success/15 text-success" : "border-border text-muted"}`}>
                      {m.added ? "Added" : "Not added"}
                    </span>
                  </span>
                  <span className="text-sm text-muted">{meta}</span>
                  {m.added && m.words > 0 && (
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <span className="block h-full bg-success" style={{ width: `${Math.round((m.learned / m.words) * 100)}%` }} />
                      </span>
                      {m.learned} of {m.words} learned
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {confirm && (
        <Sheet title={confirm.kind === "remove" ? "Remove this module?" : "Make this module public?"} onClose={() => !busy && setConfirm(null)}>
          {confirm.kind === "remove" ? (
            <p className="text-sm">
              <strong>{confirm.module.title}</strong>. {removeWording(confirm.module).warning}
            </p>
          ) : (
            <p className="text-sm">
              Everyone using milim will be able to find <strong>{confirm.module.title}</strong> and add it. <strong>This can&apos;t be undone.</strong>
            </p>
          )}
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirm(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={run}
              className={`h-11 flex-1 rounded-xl font-semibold disabled:opacity-60 ${confirm.kind === "remove" ? "bg-danger text-accent-contrast" : "bg-accent text-accent-contrast hover:bg-accent-strong"}`}
            >
              {busy ? "Working…" : confirm.kind === "remove" ? removeWording(confirm.module).button : "Make public"}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}
