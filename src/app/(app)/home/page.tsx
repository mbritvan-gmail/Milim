import Link from "next/link";
import { RotatingBackground } from "@/components/rotating-background";

export const metadata = { title: "Home · milim" };

const icon = {
  width: 30,
  height: 30,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const MODULES = [
  {
    href: "/songs",
    label: "Songs",
    svg: (
      <svg {...icon}>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    ),
  },
  {
    href: "/flashcards",
    label: "Flash Cards",
    svg: (
      <svg {...icon}>
        <rect x="3" y="6" width="14" height="12" rx="2" />
        <path d="M7 3h12a2 2 0 0 1 2 2v10" />
      </svg>
    ),
  },
  {
    href: "/dictionary",
    label: "Dictionary",
    svg: (
      <svg {...icon}>
        <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
        <path d="M4 19V5" />
        <path d="M9 8h6" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="relative -mb-24 flex flex-1 flex-col pb-24">
      <RotatingBackground creditClass="bottom-28" />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-8">
        <h1 className="hebrew mb-1 text-center text-4xl font-bold text-accent">
          מילים
        </h1>
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex h-16 items-center gap-3 rounded-xl border border-border/70 bg-surface/70 px-4 backdrop-blur-md text-base font-semibold transition-colors hover:bg-surface-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent [&_svg]:h-6 [&_svg]:w-6">
              {m.svg}
            </span>
            {m.label}
          </Link>
        ))}
      </main>
    </div>
  );
}
