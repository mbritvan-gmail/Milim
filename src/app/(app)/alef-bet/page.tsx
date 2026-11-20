import Link from "next/link";
import { CARDS, VOWEL_CARDS, type LetterCard } from "@/lib/alef-bet/letters";

export const metadata = { title: "Alef-bet · milim" };

// Every letter and vowel on one page. Tap one to open its card; Next and Previous on the card go through
// all of them in order. Nothing is saved or checked off.
export default function AlefBetPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <h1 className="text-3xl font-semibold leading-tight">Alef-bet</h1>

      <Section title="Letters" hebrew="אותיות">
        {/* Right to left, like Hebrew reads: alef is at the top right. */}
        <ul dir="rtl" className="grid grid-cols-4 gap-2">
          {CARDS.map((card) => (
            <Tile key={card.id} card={card} glyph={card.print} size={card.print.includes(" ") ? "text-[26px]" : "text-4xl"} height="h-20" />
          ))}
        </ul>
      </Section>

      <Section title="Vowels" hebrew="תנועות">
        <ul dir="rtl" className="grid grid-cols-3 gap-2">
          {VOWEL_CARDS.map((card) => (
            <Tile key={card.id} card={card} glyph={card.sounds[0].form} size="text-[32px]" height="h-[72px]" />
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({ title, hebrew, children }: { title: string; hebrew: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-0.5">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        <span lang="he" className="hebrew text-lg font-semibold leading-none text-muted">
          {hebrew}
        </span>
      </div>
      {children}
    </section>
  );
}

function Tile({ card, glyph, size, height }: { card: LetterCard; glyph: string; size: string; height: string }) {
  return (
    <li>
      <Link
        href={`/alef-bet/${card.id}`}
        aria-label={card.kind === "letter" ? card.name : `vowel ${card.name}`}
        className={`flex ${height} flex-col items-center justify-center rounded-[14px] border border-border bg-surface hover:bg-surface-2`}
      >
        <span lang="he" className={`hebrew font-bold leading-[1.2] tracking-[0.1em] ${size}`}>
          {glyph}
        </span>
        <span dir="ltr" className="text-xs text-muted">
          {card.name}
        </span>
      </Link>
    </li>
  );
}
