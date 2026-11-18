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
    href: "/vocabulary",
    label: "Vocabulary",
    svg: (
      <svg {...icon}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
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
      <RotatingBackground fade={false} showCredit={false} />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-8">
        <h1 className="hebrew text-center text-4xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">מילים</h1>
        {/* Like app icons on a phone's home screen: an icon with its name underneath. */}
        <div className="grid grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <Link key={m.href} href={m.href} className="group flex flex-col items-center gap-2">
              <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[1.4rem] border border-white/40 bg-white/15 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-xl transition-transform group-active:scale-95 [&_svg]:h-9 [&_svg]:w-9 [&_svg]:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                {m.svg}
              </span>
              <span className="rounded-md bg-black/35 px-2 py-0.5 text-center text-sm font-medium text-white backdrop-blur-sm">{m.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
