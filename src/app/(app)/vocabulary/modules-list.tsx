"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MenuButton } from "@/components/menu-button";
import { SearchBox } from "@/components/search-box";
import { moveInList, startDrag } from "@/lib/drag-reorder";
import { Sheet } from "@/components/sheet";
import { makeModulePublic, removeModuleFromList, reorderModules } from "./actions";

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
  /** Place in the person's own order (modules they have added). */
  position: number;
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
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // When fresh data arrives from the server, show it (without leaving edit mode).
  if (serverModules !== seen) {
    setSeen(serverModules);
    setModules(serverModules);
  }

  // Added modules come first, in the person's own order; the rest follow.
  const addedList = modules.filter((m) => m.added).sort((a, b) => a.position - b.position);
  const otherList = modules.filter((m) => !m.added);
  const q = query.trim().toLowerCase();
  const matches = (m: ListModule) => !q || m.title.toLowerCase().includes(q);
  const searching = !editing && q !== "";

  const latest = useRef(addedList);
  useEffect(() => {
    latest.current = addedList;
  });
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const setRef = (id: string) => (el: HTMLElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyBase = useRef<string[] | null>(null);

  function flash(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(""), 4000);
  }
  function moveModule(id: string, target: number) {
    setModules((ms) => {
      const added = moveInList(ms.filter((m) => m.added).sort((a, b) => a.position - b.position), id, target);
      const pos = new Map(added.map((m, i) => [m.id, i]));
      return ms.map((m) => (pos.has(m.id) ? { ...m, position: pos.get(m.id) ?? m.position } : m));
    });
  }
  async function saveOrder(before: string[], snapshot: ListModule[]) {
    const after = latest.current.map((m) => m.id);
    if (after.join() === before.join()) return;
    const r = await reorderModules(after).catch(() => ({ ok: false as const, error: "Couldn't save the new order. Please try again." }));
    if (!r.ok) {
      setModules(snapshot);
      flash(r.error);
    }
  }
  function dragModule(e: React.PointerEvent, m: ListModule) {
    const snapshot = modules;
    startDrag(e, m.id, {
      refs: rowRefs.current,
      getIds: () => latest.current.map((x) => x.id),
      onMove: moveModule,
      onActive: setDragId,
      onDrop: (before) => void saveOrder(before, snapshot),
    });
  }
  function keyMove(e: React.KeyboardEvent, id: string) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const ids = latest.current.map((x) => x.id);
    const from = ids.indexOf(id);
    const target = e.key === "ArrowUp" ? Math.max(0, from - 1) : Math.min(ids.length - 1, from + 1);
    if (target === from) return;
    const snapshot = modules;
    if (!keyBase.current) keyBase.current = ids;
    moveModule(id, target);
    if (keyTimer.current) clearTimeout(keyTimer.current);
    keyTimer.current = setTimeout(() => {
      const base = keyBase.current ?? ids;
      keyBase.current = null;
      void saveOrder(base, snapshot);
    }, 700);
  }

  function moduleRow(m: ListModule) {
    const meta = `${m.words} ${m.words === 1 ? "word" : "words"} · ${m.by}${m.archived ? " · Archived" : ""}`;
    if (editing) {
      return (
        <li
          key={m.id}
          ref={setRef(m.id)}
          className={`flex items-center gap-3 rounded-2xl border bg-surface px-3 py-3 ${dragId === m.id ? "relative z-10 border-accent ring-2 ring-accent" : "border-border"}`}
        >
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
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <span className="w-full truncate font-semibold">{m.title}</span>
            <span className="w-full truncate text-sm text-muted">{meta}</span>
            {m.isOwner && m.visibility === "private" && (
              <button
                type="button"
                onClick={() => {
                  setProblem("");
                  setConfirm({ kind: "public", module: m });
                }}
                className="mt-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-2"
              >
                Make public
              </button>
            )}
          </span>
          {m.added && (
            <button
              type="button"
              aria-label={`Reorder ${m.title}. Drag, or use the up and down arrow keys`}
              onPointerDown={(e) => dragModule(e, m)}
              onKeyDown={(e) => keyMove(e, m.id)}
              className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <circle cx="9" cy="6" r="1.6" />
                <circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" />
                <circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" />
                <circle cx="15" cy="18" r="1.6" />
              </svg>
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
                onSelect: () => {
                  setQuery("");
                  setEditing(true);
                },
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
        <p className="px-0.5 text-sm text-muted">
          Tap the minus to remove a module. Drag the grip to put your added modules in your order. Private modules can be made public, but a public module stays public.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">Themed word lists. Add one to put its words in your Dictionary.</p>
          <SearchBox value={query} onChange={setQuery} placeholder="Search modules" label="Search modules" />
        </>
      )}

      {notice && (
        <p role="status" className="text-sm text-danger">
          {notice}
        </p>
      )}

      {modules.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No modules yet. Use the menu to make your first one.</p>
      ) : searching && !addedList.some(matches) && !otherList.some(matches) ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No modules match &quot;{query.trim()}&quot;.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {[
            { key: "added", label: "Your modules", list: addedList.filter(matches) },
            { key: "other", label: "More modules", list: otherList.filter(matches) },
          ]
            .filter((sec) => sec.list.length > 0)
            .map((sec, _i, all) => (
              <section key={sec.key} className="flex flex-col gap-3">
                {all.length > 1 && <h2 className="px-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted">{sec.label}</h2>}
                <ul className="flex flex-col gap-3">{sec.list.map((m) => moduleRow(m))}</ul>
              </section>
            ))}
        </div>
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
