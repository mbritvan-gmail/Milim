import type React from "react";

// Drag-to-reorder for a list of rows. Pressing a row's grip starts a drag; the pointer's position among
// the rows decides the row's new place, and the list is reordered as you move. Listens on the window,
// not the grip, because moving a row in the list can make the browser drop its hold on the pointer.
export type DragOptions = {
  /** The rows by id, so the pointer can be compared with each one. */
  refs: Map<string, HTMLElement>;
  /** The current order of the list being dragged within (read fresh on every move). */
  getIds: () => string[];
  /** Move a row to a new place in the list. */
  onMove: (id: string, target: number) => void;
  /** The drag ended. `before` is the order when it started. */
  onDrop: (before: string[]) => void;
  /** Tells the screen which row is being dragged (null when done). */
  onActive: (id: string | null) => void;
};

export function startDrag(e: React.PointerEvent, id: string, o: DragOptions) {
  e.preventDefault();
  const before = o.getIds();
  o.onActive(id);
  const move = (ev: PointerEvent) => {
    const y = ev.clientY;
    const others = o.getIds().filter((x) => x !== id);
    let target = others.length;
    for (let i = 0; i < others.length; i++) {
      const el = o.refs.get(others[i]);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        target = i;
        break;
      }
    }
    o.onMove(id, target);
    // Scroll when the pointer is near the top or bottom edge of the screen.
    const edge = 90;
    const step = y < edge ? -14 : y > window.innerHeight - edge ? 14 : 0;
    if (step) {
      window.scrollBy(0, step);
      o.refs.get(id)?.closest<HTMLElement>("[role=dialog]")?.scrollBy(0, step);
    }
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    o.onActive(null);
    o.onDrop(before);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

export function moveInList<T extends { id: string }>(items: T[], id: string, target: number): T[] {
  const from = items.findIndex((x) => x.id === id);
  if (from < 0 || from === target) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}
