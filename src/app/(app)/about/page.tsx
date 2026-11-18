import { LOGIN_PHOTOS } from "@/lib/login-photos";

export const metadata = { title: "About · milim" };

const FEATURES = [
  { name: "Songs", text: "Paste the lyrics of a song you love. milim translates each line, adds pronunciation and nikud, and builds a list of the words to learn." },
  { name: "Vocabulary", text: "Word Packs: themed lists of words (food, travel, anything). Paste Hebrew words and milim fills in the meaning, gender and plural." },
  { name: "Flash Cards", text: "Study the words from your songs and Word Packs. A word counts as learned after the number of correct answers you choose in Settings." },
  { name: "Dictionary", text: "Every word you have met, with your progress. Verbs, nouns and adjectives show their forms." },
];

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="hebrew text-5xl font-bold text-accent">מילים</h1>
        <p className="text-xl font-semibold">milim</p>
        <p className="text-sm text-muted">Learn Hebrew through the songs you love.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">What&apos;s in milim</h2>
        <ul className="flex flex-col gap-2">
          {FEATURES.map((f) => (
            <li key={f.name} className="rounded-xl border border-border bg-surface p-4">
              <p className="font-semibold">{f.name}</p>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Things to know</h2>
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <p>Translations and word details are written by AI, so they can be wrong. You can fix a line yourself, or suggest a fix on a public song.</p>
          <p>A song or Word Pack you make public stays public. Private ones are only visible to you.</p>
          <p>Lyrics belong to their writers.</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Photo credits</h2>
        <ul className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 text-sm">
          {LOGIN_PHOTOS.map((p) => (
            <li key={p.src}>
              <a href={p.creditUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
                {p.credit.replace(/^Photo: /, "")}
              </a>
              <p className="text-xs text-muted">{p.alt}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Thanks</h2>
        <p className="text-sm text-muted">Song search by Deezer. Players from Spotify and YouTube. Photos from Wikimedia Commons.</p>
      </section>
    </main>
  );
}
