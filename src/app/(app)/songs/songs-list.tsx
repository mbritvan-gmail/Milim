"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MenuButton } from "@/components/menu-button";
import { SearchBox } from "@/components/search-box";
import { Sheet } from "@/components/sheet";
import { moveInList, startDrag } from "@/lib/drag-reorder";
import { filterSongs, isSortKey, SORTS, sortSongs, type SortKey } from "@/lib/songs-order";
import { makeSongPublic, removeFromList } from "./[id]/actions";
import { createGroup, deleteGroup, moveSongToGroup, renameGroup, reorderGroups, reorderSongs, type SongGroup } from "./group-actions";

export type ListSong = {
  id: string;
  title: string;
  artist: string | null;
  visibility: "public" | "private";
  isOwner: boolean;
  groupId: string | null;
  position: number;
  addedAt: string;
};

// The server actions this screen uses, so tests can swap in stand-ins.
export type SongListActions = {
  makeSongPublic: typeof makeSongPublic;
  removeFromList: typeof removeFromList;
  createGroup: typeof createGroup;
  renameGroup: typeof renameGroup;
  deleteGroup: typeof deleteGroup;
  moveSongToGroup: typeof moveSongToGroup;
  reorderSongs: typeof reorderSongs;
  reorderGroups: typeof reorderGroups;
};
const realActions: SongListActions = { makeSongPublic, removeFromList, createGroup, renameGroup, deleteGroup, moveSongToGroup, reorderSongs, reorderGroups };

type Sheets =
  | { kind: "remove" | "public"; song: ListSong }
  | { kind: "sort" }
  | { kind: "create-group"; thenMove?: ListSong }
  | { kind: "rename-group"; group: SongGroup }
  | { kind: "delete-group"; group: SongGroup }
  | { kind: "move"; song: ListSong }
  | null;

function removeWording(song: ListSong) {
  if (song.isOwner && song.visibility === "private") return { warning: "This permanently deletes the song, its translations and its vocabulary.", button: "Delete forever" };
  if (song.isOwner)
    return {
      warning: "Public songs can't be deleted. Archiving hides it from the public library and removes it from your list, but people who already added it keep it.",
      button: "Archive",
    };
  return { warning: "This only removes it from your list. The song itself isn't deleted.", button: "Remove" };
}

// The chosen sort is remembered on this device.
const SORT_KEY = "milim-songs-sort";
const SORT_EVENT = "milim-songs-sort-change";
function readSort(): SortKey {
  try {
    const v = localStorage.getItem(SORT_KEY);
    if (isSortKey(v)) return v;
  } catch {
    // No storage: fall back to the default.
  }
  return "manual";
}
function subscribeSort(cb: () => void) {
  window.addEventListener(SORT_EVENT, cb);
  return () => window.removeEventListener(SORT_EVENT, cb);
}

const grip = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);
const minus = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);
const folderIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

export function SongsList({
  songs: serverSongs,
  groups: serverGroups,
  tabs,
  actions = realActions,
}: {
  songs: ListSong[];
  groups: SongGroup[];
  tabs: React.ReactNode;
  actions?: SongListActions;
}) {
  const [songs, setSongs] = useState(serverSongs);
  const [groups, setGroups] = useState(serverGroups);
  const [seen, setSeen] = useState({ songs: serverSongs, groups: serverGroups });
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<Sheets>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const sort = useSyncExternalStore(subscribeSort, readSort, () => "manual" as SortKey);

  // When fresh data arrives from the server, show it (without leaving edit mode).
  if (serverSongs !== seen.songs || serverGroups !== seen.groups) {
    setSeen({ songs: serverSongs, groups: serverGroups });
    setSongs(serverSongs);
    setGroups(serverGroups);
  }

  const orderedGroups = useMemo(() => [...groups].sort((a, b) => a.position - b.position), [groups]);
  const effectiveSort: SortKey = editing ? "manual" : sort;
  const inSection = (groupId: string | null, key: SortKey = effectiveSort) => sortSongs(songs.filter((s) => s.groupId === groupId), key);
  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? null;

  // The latest lists and row elements, for the drag handlers (which outlive a single render).
  const latest = useRef({ songs, groups: orderedGroups });
  useEffect(() => {
    latest.current = { songs, groups: orderedGroups };
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

  // ---- reorder ----------------------------------------------------------
  const songIdsIn = (groupId: string | null) => sortSongs(latest.current.songs.filter((s) => s.groupId === groupId), "manual").map((s) => s.id);
  const groupIds = () => latest.current.groups.map((g) => g.id);

  function moveSong(groupId: string | null, id: string, target: number) {
    setSongs((ss) => {
      const moved = moveInList(sortSongs(ss.filter((s) => s.groupId === groupId), "manual"), id, target);
      const pos = new Map(moved.map((s, i) => [s.id, i]));
      return ss.map((s) => (pos.has(s.id) ? { ...s, position: pos.get(s.id) ?? s.position } : s));
    });
  }
  function moveGroup(id: string, target: number) {
    setGroups((gs) => moveInList([...gs].sort((a, b) => a.position - b.position), id, target).map((g, i) => ({ ...g, position: i })));
  }

  async function saveSongOrder(groupId: string | null, before: string[], snapshot: ListSong[]) {
    const after = songIdsIn(groupId);
    if (after.join() === before.join()) return;
    const r = await actions.reorderSongs(groupId, after).catch(() => ({ ok: false as const, error: "Couldn't save the new order. Please try again." }));
    if (!r.ok) {
      setSongs(snapshot);
      flash(r.error);
    }
  }
  async function saveGroupOrder(before: string[], snapshot: SongGroup[]) {
    const after = groupIds();
    if (after.join() === before.join()) return;
    const r = await actions.reorderGroups(after).catch(() => ({ ok: false as const, error: "Couldn't save the new order. Please try again." }));
    if (!r.ok) {
      setGroups(snapshot);
      flash(r.error);
    }
  }

  function dragSong(e: React.PointerEvent, song: ListSong) {
    const snapshot = latest.current.songs;
    startDrag(e, song.id, {
      refs: rowRefs.current,
      getIds: () => songIdsIn(song.groupId),
      onMove: (id, target) => moveSong(song.groupId, id, target),
      onActive: setDragId,
      onDrop: (before) => void saveSongOrder(song.groupId, before, snapshot),
    });
  }
  function dragGroup(e: React.PointerEvent, group: SongGroup) {
    const snapshot = latest.current.groups;
    startDrag(e, group.id, {
      refs: rowRefs.current,
      getIds: groupIds,
      onMove: moveGroup,
      onActive: setDragId,
      onDrop: (before) => void saveGroupOrder(before, snapshot),
    });
  }

  // Arrow keys on a grip move the row one place; saved a moment after the last press.
  function keyMove(e: React.KeyboardEvent, kind: "song" | "group", id: string, groupId: string | null) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const ids = kind === "song" ? songIdsIn(groupId) : groupIds();
    const from = ids.indexOf(id);
    const target = e.key === "ArrowUp" ? Math.max(0, from - 1) : Math.min(ids.length - 1, from + 1);
    if (target === from) return;
    const snapshotSongs = latest.current.songs;
    const snapshotGroups = latest.current.groups;
    if (!keyBase.current) keyBase.current = ids;
    if (kind === "song") moveSong(groupId, id, target);
    else moveGroup(id, target);
    if (keyTimer.current) clearTimeout(keyTimer.current);
    keyTimer.current = setTimeout(() => {
      const base = keyBase.current ?? ids;
      keyBase.current = null;
      if (kind === "song") void saveSongOrder(groupId, base, snapshotSongs);
      else void saveGroupOrder(base, snapshotGroups);
    }, 700);
  }

  // ---- sheets and their actions -----------------------------------------
  function open(next: Sheets, initialDraft = "") {
    setProblem("");
    setDraft(initialDraft);
    setSheet(next);
  }

  async function confirmSong() {
    if (!sheet || (sheet.kind !== "remove" && sheet.kind !== "public")) return;
    setBusy(true);
    setProblem("");
    const { kind, song } = sheet;
    if (kind === "remove") {
      const error = await actions.removeFromList(song.id).catch(() => "Couldn't remove that song. Please try again.");
      if (error) setProblem(error);
      else {
        setSongs((s) => s.filter((x) => x.id !== song.id));
        setSheet(null);
      }
    } else {
      const ok = await actions.makeSongPublic(song.id).catch(() => false);
      if (!ok) setProblem("Couldn't make this song public. Please try again.");
      else {
        setSongs((s) => s.map((x) => (x.id === song.id ? { ...x, visibility: "public" } : x)));
        setSheet(null);
      }
    }
    setBusy(false);
  }

  async function submitCreateGroup() {
    if (sheet?.kind !== "create-group") return;
    setBusy(true);
    setProblem("");
    const r = await actions.createGroup(draft).catch(() => ({ ok: false as const, error: "Couldn't create the group. Please try again." }));
    if (!r.ok) {
      setProblem(r.error);
      setBusy(false);
      return;
    }
    setGroups((gs) => [...gs, r.group]);
    const song = sheet.thenMove;
    if (song) {
      const m = await actions.moveSongToGroup(song.id, r.group.id).catch(() => ({ ok: false as const, error: "" }));
      if (m.ok) setSongs((ss) => ss.map((s) => (s.id === song.id ? { ...s, groupId: r.group.id, position: m.position } : s)));
    }
    setSheet(null);
    setBusy(false);
  }

  async function submitRename() {
    if (sheet?.kind !== "rename-group") return;
    setBusy(true);
    setProblem("");
    const group = sheet.group;
    const r = await actions.renameGroup(group.id, draft).catch(() => ({ ok: false as const, error: "Couldn't save that. Please try again." }));
    setBusy(false);
    if (!r.ok) return setProblem(r.error);
    setGroups((gs) => gs.map((g) => (g.id === group.id ? { ...g, name: r.name } : g)));
    setSheet(null);
  }

  async function confirmDeleteGroup() {
    if (sheet?.kind !== "delete-group") return;
    setBusy(true);
    setProblem("");
    const group = sheet.group;
    const r = await actions.deleteGroup(group.id).catch(() => ({ ok: false as const, error: "Couldn't delete the group. Please try again." }));
    setBusy(false);
    if (!r.ok) return setProblem(r.error);
    setGroups((gs) => gs.filter((g) => g.id !== group.id));
    // Its songs are not deleted: they go to "not in a group", after the songs already there.
    setSongs((ss) => {
      const base = Math.max(-1, ...ss.filter((s) => s.groupId === null).map((s) => s.position)) + 1;
      let n = 0;
      return ss.map((s) => (s.groupId === group.id ? { ...s, groupId: null, position: base + n++ } : s));
    });
    setSheet(null);
  }

  async function moveTo(song: ListSong, groupId: string | null) {
    if (song.groupId === groupId) return setSheet(null);
    setBusy(true);
    setProblem("");
    const r = await actions.moveSongToGroup(song.id, groupId).catch(() => ({ ok: false as const, error: "Couldn't move the song. Please try again." }));
    setBusy(false);
    if (!r.ok) return setProblem(r.error);
    setSongs((ss) => ss.map((s) => (s.id === song.id ? { ...s, groupId, position: r.position } : s)));
    setSheet(null);
  }

  function chooseSort(key: SortKey) {
    try {
      localStorage.setItem(SORT_KEY, key);
    } catch {
      // Not remembered, still works.
    }
    window.dispatchEvent(new Event(SORT_EVENT));
    setSheet(null);
  }

  // ---- rows -------------------------------------------------------------
  const searching = !editing && query.trim() !== "";

  function songRow(song: ListSong, indent: boolean, tag?: string | null) {
    const meta = [song.artist, song.visibility === "public" ? "Public" : "Private", tag ? `in ${tag}` : null].filter(Boolean).join(" · ");
    const pad = indent ? "ml-3" : "";
    if (!editing) {
      return (
        <li key={song.id} className={pad}>
          <Link href={`/songs/${song.id}`} className="flex flex-col rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-2">
            <span className="font-medium">{song.title}</span>
            <span className="text-sm text-muted">{meta}</span>
          </Link>
        </li>
      );
    }
    return (
      <li
        key={song.id}
        ref={setRef(song.id)}
        className={`flex items-center gap-3 rounded-xl border bg-surface px-3 py-3 ${pad} ${dragId === song.id ? "relative z-10 border-accent ring-2 ring-accent" : "border-border"}`}
      >
        <button type="button" onClick={() => open({ kind: "remove", song })} aria-label={`Remove ${song.title}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-background">
          {minus}
        </button>
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="w-full truncate font-medium">{song.title}</span>
          <span className="w-full truncate text-sm text-muted">{meta}</span>
          {song.isOwner && song.visibility === "private" && (
            <button type="button" onClick={() => open({ kind: "public", song })} className="mt-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-2">
              Make public
            </button>
          )}
        </span>
        <button type="button" onClick={() => open({ kind: "move", song })} aria-label={`Move ${song.title} to a group`} className="shrink-0 text-accent">
          {folderIcon}
        </button>
        <button
          type="button"
          aria-label={`Reorder ${song.title}. Drag, or use the up and down arrow keys`}
          onPointerDown={(e) => dragSong(e, song)}
          onKeyDown={(e) => keyMove(e, "song", song.id, song.groupId)}
          className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
        >
          {grip}
        </button>
      </li>
    );
  }

  function section(group: SongGroup | null) {
    const list = inSection(group?.id ?? null);
    const key = group?.id ?? "ungrouped";
    const isCollapsed = collapsed.has(key);
    const title = group?.name ?? "Not in a group";
    const header = editing && group ? (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => open({ kind: "delete-group", group })} aria-label={`Delete group ${group.name}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-background">
          {minus}
        </button>
        <span className="min-w-0 flex-1 truncate text-base font-semibold">{group.name}</span>
        <span className="text-sm text-muted">{list.length}</span>
        <button type="button" onClick={() => open({ kind: "rename-group", group }, group.name)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-2">
          Rename
        </button>
        <button
          type="button"
          aria-label={`Reorder group ${group.name}. Drag, or use the up and down arrow keys`}
          onPointerDown={(e) => dragGroup(e, group)}
          onKeyDown={(e) => keyMove(e, "group", group.id, null)}
          className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
        >
          {grip}
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() =>
          setCollapsed((c) => {
            const next = new Set(c);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          })
        }
        aria-expanded={!isCollapsed}
        className="flex w-full items-center gap-2 text-left"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`} aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span className="flex-1 text-base font-semibold">{title}</span>
        <span className="text-sm text-muted">{list.length}</span>
      </button>
    );
    return (
      <li key={key} ref={group ? setRef(group.id) : undefined} className={`flex flex-col gap-2 rounded-xl ${dragId === group?.id ? "relative z-10 ring-2 ring-accent" : ""}`}>
        <div className="px-1 pt-2">{header}</div>
        {(!isCollapsed || editing) && (
          <ul className="flex flex-col gap-2">
            {list.map((s) => songRow(s, true))}
            {list.length === 0 && <li className="ml-3 px-1 text-sm text-muted">No songs here yet.</li>}
          </ul>
        )}
      </li>
    );
  }

  const results = searching ? filterSongs(orderedGroups.flatMap((g) => inSection(g.id)).concat(inSection(null)), query) : [];
  const hasGroups = groups.length > 0;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Songs</h1>
        {editing ? (
          <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-contrast hover:bg-accent-strong">
            Done
          </button>
        ) : (
          <MenuButton
            label="Song options"
            items={[
              {
                href: "/songs/new",
                label: "Add song",
                icon: (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                ),
              },
              {
                label: "Create group",
                onSelect: () => open({ kind: "create-group" }),
                icon: (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <path d="M12 11v5M9.5 13.5h5" />
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

      {tabs}

      {editing ? (
        <p className="px-0.5 text-sm text-muted">
          Drag the grip to put songs and groups in your order. Tap the folder to move a song to a group. Search and sort are paused while editing.
        </p>
      ) : (
        <div className="flex gap-2">
          <SearchBox value={query} onChange={setQuery} placeholder="Search title or artist" label="Search songs" />
          <button
            type="button"
            onClick={() => open({ kind: "sort" })}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
            </svg>
            {SORTS.find((o) => o.id === sort)?.label}
          </button>
        </div>
      )}

      {notice && (
        <p role="status" className="text-sm text-danger">
          {notice}
        </p>
      )}

      {songs.length === 0 && !hasGroups ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No songs yet. Use the menu to add your first song.</p>
      ) : searching ? (
        results.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-5 text-center text-muted">No songs match &quot;{query.trim()}&quot;.</p>
        ) : (
          <ul className="flex flex-col gap-2">{results.map((s) => songRow(s, false, groupName(s.groupId)))}</ul>
        )
      ) : hasGroups ? (
        <ul className="flex flex-col gap-3">
          {orderedGroups.map((g) => section(g))}
          {(inSection(null).length > 0 || editing) && section(null)}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">{inSection(null).map((s) => songRow(s, false))}</ul>
      )}

      {sheet && (sheet.kind === "remove" || sheet.kind === "public") && (
        <Sheet title={sheet.kind === "remove" ? "Remove this song?" : "Make this song public?"} onClose={() => !busy && setSheet(null)}>
          {sheet.kind === "remove" ? (
            <p className="text-sm">
              <strong>{sheet.song.title}</strong>. {removeWording(sheet.song).warning}
            </p>
          ) : (
            <p className="text-sm">
              Everyone using milim will be able to find <strong>{sheet.song.title}</strong> and add it. <strong>This can&apos;t be undone.</strong>
            </p>
          )}
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setSheet(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={confirmSong}
              className={`h-11 flex-1 rounded-xl font-semibold disabled:opacity-60 ${sheet.kind === "remove" ? "bg-danger text-accent-contrast" : "bg-accent text-accent-contrast hover:bg-accent-strong"}`}
            >
              {busy ? "Working…" : sheet.kind === "remove" ? removeWording(sheet.song).button : "Make public"}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === "sort" && (
        <Sheet title="Sort songs" onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-1">
            {SORTS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => chooseSort(o.id)}
                aria-pressed={sort === o.id}
                className={`flex h-12 items-center justify-between rounded-xl px-4 text-left ${sort === o.id ? "bg-surface-2 font-semibold" : "hover:bg-surface-2"}`}
              >
                {o.label}
                {sort === o.id && (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Songs are sorted inside each group. &quot;My order&quot; is the order you set in Edit.</p>
        </Sheet>
      )}

      {(sheet?.kind === "create-group" || sheet?.kind === "rename-group") && (
        <Sheet title={sheet.kind === "create-group" ? "Create group" : "Rename group"} onClose={() => !busy && setSheet(null)}>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">Group name</span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={60}
              autoFocus
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-accent"
            />
          </label>
          {sheet.kind === "create-group" && (
            <p className="text-sm text-muted">{sheet.thenMove ? `${sheet.thenMove.title} will be moved into it.` : "The group starts empty. Use Edit, then the folder on a song, to put songs in it."}</p>
          )}
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setSheet(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={sheet.kind === "create-group" ? submitCreateGroup : submitRename}
              className="h-11 flex-1 rounded-xl bg-accent font-semibold text-accent-contrast hover:bg-accent-strong disabled:opacity-60"
            >
              {busy ? "Saving…" : sheet.kind === "create-group" ? "Create" : "Save"}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === "delete-group" && (
        <Sheet title="Delete this group?" onClose={() => !busy && setSheet(null)}>
          <p className="text-sm">
            <strong>{sheet.group.name}</strong> will be deleted. The songs in it are not deleted: they move to &quot;Not in a group&quot;.
          </p>
          {problem && <p className="text-sm text-danger">{problem}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => setSheet(null)} className="h-11 flex-1 rounded-xl border border-border hover:bg-surface-2">
              Cancel
            </button>
            <button type="button" disabled={busy} onClick={confirmDeleteGroup} className="h-11 flex-1 rounded-xl bg-danger font-semibold text-accent-contrast disabled:opacity-60">
              {busy ? "Working…" : "Delete group"}
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === "move" && (
        <Sheet title="Move to group" onClose={() => !busy && setSheet(null)}>
          <p className="-mt-2 text-sm text-muted">{sheet.song.title}</p>
          <div className="flex flex-col gap-1">
            {orderedGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                disabled={busy}
                onClick={() => moveTo(sheet.song, g.id)}
                className={`flex h-12 items-center justify-between rounded-xl px-4 text-left ${sheet.song.groupId === g.id ? "bg-surface-2 font-semibold" : "hover:bg-surface-2"}`}
              >
                {g.name}
                {sheet.song.groupId === g.id && (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l5 5 9-10" />
                  </svg>
                )}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => moveTo(sheet.song, null)}
              className={`flex h-12 items-center justify-between rounded-xl px-4 text-left ${sheet.song.groupId === null ? "bg-surface-2 font-semibold" : "hover:bg-surface-2"}`}
            >
              Not in a group
              {sheet.song.groupId === null && (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              )}
            </button>
            <button type="button" disabled={busy} onClick={() => open({ kind: "create-group", thenMove: sheet.song })} className="flex h-12 items-center rounded-xl px-4 text-left font-semibold text-accent hover:bg-surface-2">
              + New group…
            </button>
          </div>
          {problem && <p className="text-sm text-danger">{problem}</p>}
        </Sheet>
      )}
    </>
  );
}
