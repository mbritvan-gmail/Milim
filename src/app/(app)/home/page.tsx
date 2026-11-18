import Link from "next/link";
import { RotatingBackground } from "@/components/rotating-background";
import { AlefGlyph } from "@/components/alef-glyph";

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
    href: "/alef-bet",
    label: "Alef-bet",
    tint: { rgb: "189,174,242", dark: "#BDAEF2", deep: "#6A4FC2" },
    // The only tile with a Hebrew letter: a bold alef set in type.
    svg: <AlefGlyph />,
  },
  {
    href: "/vocabulary",
    label: "Vocabulary",
    tint: { rgb: "195,217,140", dark: "#C3D98C", deep: "#5E8A1E" },
    svg: (
      <svg {...icon}>
        <path d="M4 6h16" />
        <rect x="4" y="10" width="9" height="4.5" rx="2.25" />
        <path d="M16 12.25h4" />
        <path d="M4 19h11" />
      </svg>
    ),
  },
  {
    href: "/flashcards",
    label: "Flash Cards",
    tint: { rgb: "245,204,132", dark: "#F5CC84", deep: "#B9740A" },
    svg: (
      <svg {...icon}>
        <g transform="rotate(-10 11 11)">
          <rect x="3" y="4.5" width="13" height="9" rx="2" />
        </g>
        <rect x="8" y="9.5" width="13" height="10" rx="2.2" />
      </svg>
    ),
  },
  {
    href: "/dictionary",
    label: "Dictionary",
    tint: { rgb: "240,169,138", dark: "#F0A98A", deep: "#C2502A" },
    svg: (
      <svg {...icon}>
        <path d="M12 6.5c-2.2-1.6-5-2-8-1.5v13c3-.5 5.8 0 8 1.5 2.2-1.5 5-2 8-1.5V5c-3-.5-5.8-.1-8 1.5z" />
        <path d="M12 6.5v13" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="relative -mb-24 flex flex-1 flex-col pb-24">
      <RotatingBackground fade={false} showCredit={false} />
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-10 px-4 py-8">
        <h1 dir="rtl" lang="he" style={{ fontFamily: "var(--font-title), serif" }} className="text-center text-5xl font-black leading-none text-white drop-shadow-[0_2px_18px_rgba(10,20,40,0.45)]">מילים</h1>
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
