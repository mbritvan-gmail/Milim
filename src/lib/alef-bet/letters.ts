// The Alef-bet trainer's content: one card per letter, in alphabet order (final forms share the card of
// their letter), then the vowel signs. This is plain content, like the login photos list; the only thing
// saved in the database is which cards a person has seen.
//
// Modern Hebrew only. Names, sounds and example words are unverified: a Hebrew speaker should check them.

export type Sound = {
  /** The letter as it looks for this sound (with its dot, if it has one). */
  form: string;
  /** How it sounds, in Latin letters ("b"). */
  say: string;
  /** An English word with the same sound ("as in bat"). */
  like: string;
  /** A short note ("with a dot inside"). */
  note: string;
};

export type Example = {
  /** The word with nikud. */
  hebrew: string;
  /** The first letter and its vowel, highlighted on the card. Must be the start of `hebrew`. */
  lead: string;
  translit: string;
  english: string;
};

export type LetterCard = {
  id: string;
  group: number;
  kind: "letter" | "vowel";
  /** Large glyphs in the Print panel ("כ ך"). */
  print: string;
  /** Glyphs in the Script panel; null where script has nothing to show (vowel signs). */
  script: string | null;
  name: string;
  nameNote?: string;
  sounds: Sound[];
  example: Example;
  /** A heads-up shown under the example, for letters that sound like another letter. */
  note?: string;
};

export type Group = {
  n: number;
  /** What the start screen shows for the group ("א ב ג ד"). */
  title: string;
  /** Latin text instead of letters (for the Vowels group). */
  plainTitle?: string;
  cardIds: string[];
};

const DAGESH = "ּ";
const SHIN_DOT = "ׁ";
const SIN_DOT = "ׂ";

const L = (
  id: string,
  group: number,
  glyph: string,
  name: string,
  sounds: Sound[],
  example: Example,
  extra: { final?: string; nameNote?: string; note?: string } = {},
): LetterCard => ({
  id,
  group,
  kind: "letter",
  print: extra.final ? `${glyph} ${extra.final}` : glyph,
  script: extra.final ? `${glyph} ${extra.final}` : glyph,
  name,
  nameNote: extra.nameNote,
  sounds,
  example,
  note: extra.note,
});

const s = (form: string, say: string, like: string, note: string): Sound => ({ form, say, like, note });
const ex = (hebrew: string, lead: string, translit: string, english: string): Example => ({ hebrew, lead, translit, english });

export const CARDS: LetterCard[] = [
  // Group 1
  L("alef", 1, "א", "alef", [s("א", "(silent)", "carries a vowel", "at the start of a word, a tiny pause")], ex("אַבָּא", "אַ", "aba", "dad")),
  L("bet", 1, "ב", "bet", [s("ב" + DAGESH, "b", "as in bat", "with a dot inside"), s("ב", "v", "as in van", "no dot")], ex("בַּיִת", "בַּ", "bayit", "house"), {
    note: "Heads up: ב without the dot says “v”. In group 2 you will meet ו (vav), which says “v” too.",
  }),
  L("gimel", 1, "ג", "gimel", [s("ג", "g", "as in go", "")], ex("גַּן", "גַּ", "gan", "garden")),
  L("dalet", 1, "ד", "dalet", [s("ד", "d", "as in dog", "")], ex("דָּג", "דָּ", "dag", "fish")),
  // Group 2
  L("he", 2, "ה", "he", [s("ה", "h", "as in hat", "often silent at the end of a word")], ex("הַר", "הַ", "har", "mountain")),
  L("vav", 2, "ו", "vav", [s("ו", "v", "as in van", "also writes the vowels “o” and “u” (see Vowels)")], ex("וֶרֶד", "וֶ", "vered", "rose"), {
    note: "Heads up: ו says “v”, just like ב without a dot.",
  }),
  L("zayin", 2, "ז", "zayin", [s("ז", "z", "as in zoo", "")], ex("זְמַן", "זְ", "zman", "time")),
  L("khet", 2, "ח", "khet", [s("ח", "kh", "like the “ch” in Bach", "a throaty sound")], ex("חָתוּל", "חָ", "khatul", "cat")),
  // Group 3
  L("tet", 3, "ט", "tet", [s("ט", "t", "as in top", "")], ex("טוֹב", "טוֹ", "tov", "good")),
  L("yod", 3, "י", "yod", [s("י", "y", "as in yes", "also writes the vowels “i” and “e” (see Vowels)")], ex("יָד", "יָ", "yad", "hand")),
  L(
    "kaf",
    3,
    "כ",
    "kaf",
    [s("כ" + DAGESH, "k", "as in kite", "with a dot inside"), s("כ", "kh", "like the “ch” in Bach", "no dot"), s("ך", "kh", "same sound", "final form: only at the end of a word")],
    ex("כֶּלֶב", "כֶּ", "kelev", "dog"),
    { final: "ך", nameNote: "also “khaf”", note: "Heads up: כ without the dot says “kh”, just like ח (khet) from group 2." },
  ),
  // Group 4
  L("lamed", 4, "ל", "lamed", [s("ל", "l", "as in lamp", "")], ex("לֶחֶם", "לֶ", "lekhem", "bread")),
  L("mem", 4, "מ", "mem", [s("מ", "m", "as in mom", ""), s("ם", "m", "same sound", "final form: only at the end of a word")], ex("מַיִם", "מַ", "mayim", "water"), { final: "ם" }),
  L("nun", 4, "נ", "nun", [s("נ", "n", "as in net", ""), s("ן", "n", "same sound", "final form: only at the end of a word")], ex("נֵר", "נֵ", "ner", "candle"), { final: "ן" }),
  // Group 5
  L("samekh", 5, "ס", "samekh", [s("ס", "s", "as in sun", "")], ex("סוּס", "סוּ", "sus", "horse"), {
    note: "Heads up: ס says “s”, just like שׂ (sin) in group 7.",
  }),
  L("ayin", 5, "ע", "ayin", [s("ע", "(silent)", "carries a vowel", "sounds just like א")], ex("עַיִן", "עַ", "ayin", "eye"), {
    note: "Heads up: ע is silent, just like א (alef) from group 1.",
  }),
  L(
    "pe",
    5,
    "פ",
    "pe",
    [s("פ" + DAGESH, "p", "as in pen", "with a dot inside"), s("פ", "f", "as in fan", "no dot"), s("ף", "f", "same sound", "final form: only at the end of a word")],
    ex("פֶּה", "פֶּ", "pe", "mouth"),
    { final: "ף", nameNote: "also “fe”" },
  ),
  // Group 6
  L("tsadi", 6, "צ", "tsadi", [s("צ", "ts", "as in cats", ""), s("ץ", "ts", "same sound", "final form: only at the end of a word")], ex("צָב", "צָ", "tsav", "turtle"), { final: "ץ" }),
  L("kuf", 6, "ק", "kuf", [s("ק", "k", "as in kite", "")], ex("קָפֶה", "קָ", "kafe", "coffee"), {
    note: "Heads up: ק says “k”, just like כ with a dot.",
  }),
  L("resh", 6, "ר", "resh", [s("ר", "r", "made in the throat", "not rolled")], ex("רֹאשׁ", "רֹ", "rosh", "head")),
  // Group 7
  L("shin", 7, "ש", "shin", [s("ש" + SHIN_DOT, "sh", "as in shop", "dot on the right (shin)"), s("ש" + SIN_DOT, "s", "as in sun", "dot on the left (sin)")], ex("שָׁלוֹם", "שָׁ", "shalom", "hello, peace"), { nameNote: "shin and sin" }),
  L("tav", 7, "ת", "tav", [s("ת", "t", "as in top", "")], ex("תּוּת", "תּוּ", "tut", "berry"), {
    note: "Heads up: ת says “t”, just like ט (tet) from group 3.",
  }),
];

// Vowel signs, shown on the letter ל (it has one sound, so the sign is the only thing that changes).
const PATACH = "\u05B7";
const KAMATZ = "\u05B8";
const TSERE = "\u05B5";
const SEGOL = "\u05B6";
const HIRIQ = "\u05B4";
const HOLAM = "\u05B9";
const KUBUTZ = "\u05BB";
const SHVA = "\u05B0";
const on = (sign: string) => "ל" + sign;
const V = (id: string, signs: string, name: string, sounds: Sound[], example: Example, note?: string): LetterCard => ({
  id, group: 8, kind: "vowel", print: signs, script: null, name, sounds, example, note,
});

export const VOWEL_CARDS: LetterCard[] = [
  V("v-a", on(PATACH) + "  " + on(KAMATZ), "a", [s(on(PATACH), "a", "as in father", "patach (a small line)"), s(on(KAMATZ), "a", "as in father", "kamatz (a line with a small stem)")], ex("מַיִם", "מַ", "mayim", "water")),
  V("v-e", on(TSERE) + "  " + on(SEGOL), "e", [s(on(TSERE), "e", "as in bed", "tsere (two dots side by side)"), s(on(SEGOL), "e", "as in bed", "segol (three dots)")], ex("לֶחֶם", "לֶ", "lekhem", "bread")),
  V("v-i", on(HIRIQ) + "  ל" + HIRIQ + "י", "i", [s(on(HIRIQ), "ee", "as in see", "hiriq (one dot)"), s("ל" + HIRIQ + "י", "ee", "as in see", "often written with a yod")], ex("שִׁיר", "שִׁי", "shir", "song")),
  V("v-o", on(HOLAM) + "  לו" + HOLAM, "o", [s(on(HOLAM), "o", "as in more", "holam (a dot on top)"), s("לו" + HOLAM, "o", "as in more", "often written with a vav")], ex("טוֹב", "טוֹ", "tov", "good")),
  V("v-u", on(KUBUTZ) + "  לו" + DAGESH, "u", [s(on(KUBUTZ), "u", "as in flute", "kubutz (three dots on a slant)"), s("לו" + DAGESH, "u", "as in flute", "shuruk (a vav with a dot)")], ex("סוּס", "סוּ", "sus", "horse")),
  V("v-shva", on(SHVA), "shva", [s(on(SHVA), "e", "a very short “e”, or silent", "shva (two dots, one above the other)")], ex("זְמַן", "זְ", "zman", "time")),
];

export const ALL_CARDS: LetterCard[] = [...CARDS, ...VOWEL_CARDS];

export const GROUPS: Group[] = [
  { n: 1, title: "א ב ג ד", cardIds: ["alef", "bet", "gimel", "dalet"] },
  { n: 2, title: "ה ו ז ח", cardIds: ["he", "vav", "zayin", "khet"] },
  { n: 3, title: "ט י כ ך", cardIds: ["tet", "yod", "kaf"] },
  { n: 4, title: "ל מ ם נ ן", cardIds: ["lamed", "mem", "nun"] },
  { n: 5, title: "ס ע פ ף", cardIds: ["samekh", "ayin", "pe"] },
  { n: 6, title: "צ ץ ק ר", cardIds: ["tsadi", "kuf", "resh"] },
  { n: 7, title: "ש ת", cardIds: ["shin", "tav"] },
  { n: 8, title: "", plainTitle: "Vowels", cardIds: VOWEL_CARDS.map((c) => c.id) },
];

const BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]));
export const cardById = (id: string) => BY_ID.get(id);
export const groupByNumber = (n: number) => GROUPS.find((g) => g.n === n);
export const cardsOfGroup = (g: Group) => g.cardIds.map((id) => BY_ID.get(id)!);

/** Number of letters (not counting the vowel group) and of vowel cards, for "x of y" counts. */
export const LETTER_COUNT = CARDS.length;

export type GroupStatus = "done" | "started" | "new";
export type GroupProgress = { group: Group; seen: number; total: number; status: GroupStatus };

export function progressFor(seenIds: Iterable<string>): GroupProgress[] {
  const seen = new Set(seenIds);
  return GROUPS.map((group) => {
    const count = group.cardIds.filter((id) => seen.has(id)).length;
    const total = group.cardIds.length;
    return { group, seen: count, total, status: count === total ? "done" : count > 0 ? "started" : "new" };
  });
}

/** The first group that still has a card to see; null when everything has been seen. */
export function nextGroup(progress: GroupProgress[]): GroupProgress | null {
  return progress.find((p) => p.status !== "done") ?? null;
}

/** Basic words open once every card (letters and vowels) has been seen. */
export function wordsUnlocked(progress: GroupProgress[]): boolean {
  return progress.every((p) => p.status === "done");
}

/** Where to start inside a group: the first unseen card, or the beginning when all have been seen (a review). */
export function startIndexFor(group: Group, seenIds: Iterable<string>): number {
  const seen = new Set(seenIds);
  const i = group.cardIds.findIndex((id) => !seen.has(id));
  return i === -1 ? 0 : i;
}

const NIKUD = /[֑-ׇ]/g;
/** A Hebrew word without vowel marks (and without dots on letters). */
export const plainHebrew = (text: string) => text.replace(NIKUD, "");

// ---------------------------------------------------------------------------
// Sound clips: which clips the cards can play, and what a voice should say for each. The list is used by
// the generation script (scripts/alef-bet-audio) so the two always agree. Clip ids: "<card>-name",
// "<card>-sound-<n>" (n counts the card's sound rows from 1) and "word-<translit>".
// ---------------------------------------------------------------------------
export const nameClipId = (card: LetterCard) => `${card.id}-name`;
export const soundClipId = (card: LetterCard, index: number) => `${card.id}-sound-${index + 1}`;
export const exampleClipId = (card: LetterCard) => `word-${card.example.translit}`;

// How each letter name is said, with nikud so a voice reads it correctly.
const NAME_SPEAK: Record<string, string> = {
  alef: "אָלֶף", bet: "בֵּית", gimel: "גִּימֶל", dalet: "דָּלֶת", he: "הֵא", vav: "וָו", zayin: "זַיִן", khet: "חֵית",
  tet: "טֵית", yod: "יוֹד", kaf: "כַּף", lamed: "לָמֶד", mem: "מֵם", nun: "נוּן", samekh: "סָמֶךְ", ayin: "עַיִן",
  pe: "פֵּא", tsadi: "צָדִי", kuf: "קוֹף", resh: "רֵישׁ", shin: "שִׁין", tav: "תָּיו",
};

const FINAL_TO_BASE: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

// A bare consonant can't be said, so a letter's sound is a short syllable: the letter plus "a" (ba, va, ga).
// A final form says the same syllable as its base letter. A vowel sign is already on ל, so it is said as is.
export function soundSpeak(card: LetterCard, index: number): string {
  const form = card.sounds[index].form;
  if (card.kind === "vowel") return form;
  const base = [...form].map((ch) => FINAL_TO_BASE[ch] ?? ch).join("");
  const cluster = base.slice(0, 1) + "ַ" + base.slice(1);
  return cluster;
}

export type Clip = { id: string; text: string; kind: "name" | "sound" | "word" };

/** Every clip the cards can play, once each, with the text a voice should say. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>();
  for (const card of ALL_CARDS) {
    if (card.kind === "letter") out.set(nameClipId(card), { id: nameClipId(card), text: NAME_SPEAK[card.id], kind: "name" });
    card.sounds.forEach((_, i) => out.set(soundClipId(card, i), { id: soundClipId(card, i), text: soundSpeak(card, i), kind: "sound" }));
    out.set(exampleClipId(card), { id: exampleClipId(card), text: card.example.hebrew, kind: "word" });
  }
  return [...out.values()];
}
