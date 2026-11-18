import Link from "next/link";
import { RotatingBackground } from "@/components/rotating-background";

export const metadata = { title: "Home · milim" };

const icon = {
  width: 38,
  height: 38,
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
    tint: { rgb: "142,201,242", dark: "#8EC9F2", deep: "#2F7FB8" },
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
    tint: { rgb: "195,217,140", dark: "#C3D98C", deep: "#5E8A1E" },
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
    tint: { rgb: "245,204,132", dark: "#F5CC84", deep: "#B9740A" },
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
    tint: { rgb: "240,169,138", dark: "#F0A98A", deep: "#C2502A" },
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
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-10 px-4 py-8">
        <h1 className="hebrew text-center text-5xl font-extrabold leading-none text-white [font-family:system-ui,-apple-system,'Segoe UI',sans-serif] drop-shadow-[0_2px_18px_rgba(10,20,40,0.45)]">מילים</h1>
        {/* Smoked-glass tiles, 3 across with the last row centered. */}
        <div className="flex w-[min(318px,100%)] flex-wrap justify-center gap-x-[27px] gap-y-7">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex w-[88px] flex-col items-center"
              style={{ "--tint-rgb": m.tint.rgb, "--tint-dark": m.tint.dark, "--tint-deep": m.tint.deep } as React.CSSProperties}
            >
              <span className="module-tile group-active:scale-95 [&_svg]:stroke-[1.7]">{m.svg}</span>
              <span className="module-label">{m.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
