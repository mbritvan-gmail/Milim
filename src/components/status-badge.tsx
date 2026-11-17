import { statusText, type WordStatus } from "@/lib/study";

const STYLE: Record<WordStatus, string> = {
  new: "border-border text-muted",
  learning: "border-accent/60 text-accent",
  learned: "border-success/60 text-success",
};

// The same New / Learning / Learned badge everywhere (dictionary, cards, song page).
export function StatusBadge({ status, count, learnAfter }: { status: WordStatus; count: number; learnAfter: number }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${STYLE[status]}`}>
      {statusText(status, count, learnAfter)}
    </span>
  );
}
