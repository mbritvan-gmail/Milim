// The Alef-bet trainer's content: one card per letter, in alphabet order (final forms share the card of
// their letter), then the vowel signs. This is plain content, like the login photos list; nothing about the
// trainer is saved in the database.
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


const DAGESH = "ּ";
const SHIN_DOT = "ׁ";
const SIN_DOT = "ׂ";

const L = (
  id: string,
  glyph: string,
  name: string,
  sounds: Sound[],
  example: Example,
  extra: { final?: string; nameNote?: string; note?: string } = {},
): LetterCard => ({
  id,
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
  L("alef", "א", "alef", [s("א", "(silent)", "carries a vowel", "at the start of a word, a tiny pause")], ex("אַבָּא", "אַ", "aba", "dad")),
  L("bet", "ב", "bet", [s("ב" + DAGESH, "b", "as in bat", "with a dot inside"), s("ב", "v", "as in van", "no dot")], ex("בַּיִת", "בַּ", "bayit", "house"), {
    note: "Heads up: ב without the dot says “v”. Later you will meet ו (vav), which says “v” too.",
  }),
  L("gimel", "ג", "gimel", [s("ג", "g", "as in go", "")], ex("גַּן", "גַּ", "gan", "garden")),
  L("dalet", "ד", "dalet", [s("ד", "d", "as in dog", "")], ex("דָּג", "דָּ", "dag", "fish")),
  L("he", "ה", "he", [s("ה", "h", "as in hat", "often silent at the end of a word")], ex("הַר", "הַ", "har", "mountain")),
  L("vav", "ו", "vav", [s("ו", "v", "as in van", "also writes the vowels “o” and “u” (see Vowels)")], ex("וֶרֶד", "וֶ", "vered", "rose"), {
    note: "Heads up: ו says “v”, just like ב without a dot.",
  }),
  L("zayin", "ז", "zayin", [s("ז", "z", "as in zoo", "")], ex("זְמַן", "זְ", "zman", "time")),
  L("khet", "ח", "khet", [s("ח", "kh", "like the “ch” in Bach", "a throaty sound")], ex("חָתוּל", "חָ", "khatul", "cat")),
  L("tet", "ט", "tet", [s("ט", "t", "as in top", "")], ex("טוֹב", "טוֹ", "tov", "good")),
  L("yod", "י", "yod", [s("י", "y", "as in yes", "also writes the vowels “i” and “e” (see Vowels)")], ex("יָד", "יָ", "yad", "hand")),
  L("kaf", "כ",
    "kaf",
    [s("כ" + DAGESH, "k", "as in kite", "with a dot inside"), s("כ", "kh", "like the “ch” in Bach", "no dot"), s("ך", "kh", "same sound", "final form: only at the end of a word")],
    ex("כֶּלֶב", "כֶּ", "kelev", "dog"),
    { final: "ך", nameNote: "also “khaf”", note: "Heads up: כ without the dot says “kh”, just like ח (khet)." },
  ),
  L("lamed", "ל", "lamed", [s("ל", "l", "as in lamp", "")], ex("לֶחֶם", "לֶ", "lekhem", "bread")),
  L("mem", "מ", "mem", [s("מ", "m", "as in mom", ""), s("ם", "m", "same sound", "final form: only at the end of a word")], ex("מַיִם", "מַ", "mayim", "water"), { final: "ם" }),
  L("nun", "נ", "nun", [s("נ", "n", "as in net", ""), s("ן", "n", "same sound", "final form: only at the end of a word")], ex("נֵר", "נֵ", "ner", "candle"), { final: "ן" }),
  L("samekh", "ס", "samekh", [s("ס", "s", "as in sun", "")], ex("סוּס", "סוּ", "sus", "horse"), {
    note: "Heads up: ס says “s”, just like שׂ (sin).",
  }),
  L("ayin", "ע", "ayin", [s("ע", "(silent)", "carries a vowel", "sounds just like א")], ex("עַיִן", "עַ", "ayin", "eye"), {
    note: "Heads up: ע is silent, just like א (alef).",
  }),
  L("pe", "פ",
    "pe",
    [s("פ" + DAGESH, "p", "as in pen", "with a dot inside"), s("פ", "f", "as in fan", "no dot"), s("ף", "f", "same sound", "final form: only at the end of a word")],
    ex("פֶּה", "פֶּ", "pe", "mouth"),
    { final: "ף", nameNote: "also “fe”" },
  ),
  L("tsadi", "צ", "tsadi", [s("צ", "ts", "as in cats", ""), s("ץ", "ts", "same sound", "final form: only at the end of a word")], ex("צָב", "צָ", "tsav", "turtle"), { final: "ץ" }),
  L("kuf", "ק", "kuf", [s("ק", "k", "as in kite", "")], ex("קָפֶה", "קָ", "kafe", "coffee"), {
    note: "Heads up: ק says “k”, just like כ with a dot.",
  }),
  L("resh", "ר", "resh", [s("ר", "r", "made in the throat", "not rolled")], ex("רֹאשׁ", "רֹ", "rosh", "head")),
  L("shin", "ש", "shin", [s("ש" + SHIN_DOT, "sh", "as in shop", "dot on the right (shin)"), s("ש" + SIN_DOT, "s", "as in sun", "dot on the left (sin)")], ex("שָׁלוֹם", "שָׁ", "shalom", "hello, peace"), { nameNote: "shin and sin" }),
  L("tav", "ת", "tav", [s("ת", "t", "as in top", "")], ex("תּוּת", "תּוּ", "tut", "berry"), {
    note: "Heads up: ת says “t”, just like ט (tet).",
  }),
];

// Vowel signs, shown on alef. Alef is silent, so each sign on its own gives the pure vowel sound.
const PATACH = "\u05B7";
const KAMATZ = "\u05B8";
const TSERE = "\u05B5";
const SEGOL = "\u05B6";
const HIRIQ = "\u05B4";
const HOLAM = "\u05B9";
const KUBUTZ = "\u05BB";
const SHVA = "\u05B0";
const on = (sign: string) => "א" + sign;
const V = (id: string, signs: string, name: string, sounds: Sound[], example: Example, note?: string): LetterCard => ({
  id, kind: "vowel", print: signs, script: null, name, sounds, example, note,
});

export const VOWEL_CARDS: LetterCard[] = [
  V("v-a", on(PATACH) + "  " + on(KAMATZ), "a", [s(on(PATACH), "a", "as in father", "patach (a small line)"), s(on(KAMATZ), "a", "as in father", "kamatz (a line with a small stem)")], ex("מַיִם", "מַ", "mayim", "water")),
  V("v-e", on(TSERE) + "  " + on(SEGOL), "e", [s(on(TSERE), "e", "as in bed", "tsere (two dots side by side)"), s(on(SEGOL), "e", "as in bed", "segol (three dots)")], ex("לֶחֶם", "לֶ", "lekhem", "bread")),
  V("v-i", on(HIRIQ) + "  א" + HIRIQ + "י", "i", [s(on(HIRIQ), "ee", "as in see", "hiriq (one dot)"), s("א" + HIRIQ + "י", "ee", "as in see", "often written with a yod")], ex("שִׁיר", "שִׁי", "shir", "song")),
  V("v-o", on(HOLAM) + "  או" + HOLAM, "o", [s(on(HOLAM), "o", "as in more", "holam (a dot on top)"), s("או" + HOLAM, "o", "as in more", "often written with a vav")], ex("טוֹב", "טוֹ", "tov", "good")),
  V("v-u", on(KUBUTZ) + "  או" + DAGESH, "u", [s(on(KUBUTZ), "u", "as in flute", "kubutz (three dots on a slant)"), s("או" + DAGESH, "u", "as in flute", "shuruk (a vav with a dot)")], ex("סוּס", "סוּ", "sus", "horse")),
  V("v-shva", on(SHVA), "shva", [s(on(SHVA), "e", "a very short “e”, or silent", "shva (two dots, one above the other)")], ex("זְמַן", "זְ", "zman", "time")),
];

export const ALL_CARDS: LetterCard[] = [...CARDS, ...VOWEL_CARDS];

const BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]));
export const cardById = (id: string) => BY_ID.get(id);
export const cardIndex = (id: string) => ALL_CARDS.findIndex((c) => c.id === id);

/** Where a card is in its section, for the card header: "Letter 2 of 22" or "Vowel 1 of 6". */
export function positionLabel(card: LetterCard): string {
  // Looked up by id, not by object: the card has been copied between the server and the browser.
  return card.kind === "letter"
    ? `Letter ${CARDS.findIndex((c) => c.id === card.id) + 1} of ${CARDS.length}`
    : `Vowel ${VOWEL_CARDS.findIndex((c) => c.id === card.id) + 1} of ${VOWEL_CARDS.length}`;
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

// How each letter name is said. Chosen by ear (owner, 2026-11): most names sound right from the bare letter alone;
// a few letters (bet, vav, lamed, ayin, resh) read as the one-letter word they can be at the start of a word
// ("in", "and", "to"...) unless a pronunciation hint is given. The hint is in IPA (standard phonetic symbols).
const NAME_HINT: Record<string, string> = {
  bet: "ˈbet", vav: "ˈvav", lamed: "ˈlamed", ayin: "ˈajin", resh: "ˈʁeʃ",
};

const FINAL_TO_BASE: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

// A bare consonant can't be said, so a letter's sound is a short syllable: the letter plus "a" (ba, va, ga).
// A final form says the same syllable as its base letter. A vowel sign is already on alef, so it is said as is.
export function soundSpeak(card: LetterCard, index: number): string {
  const form = card.sounds[index].form;
  if (card.kind === "vowel") return form;
  const base = [...form].map((ch) => FINAL_TO_BASE[ch] ?? ch).join("");
  const cluster = base.slice(0, 1) + "ַ" + base.slice(1);
  return cluster;
}

/** `text` is what is shown to a reviewer; when `ipa` is set, a voice is told to pronounce that text as those sounds. */
export type Clip = { id: string; text: string; kind: "name" | "sound" | "word"; ipa?: string };

/** Every clip the cards can play, once each, with the text a voice should say. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>();
  for (const card of ALL_CARDS) {
    if (card.kind === "letter") {
      out.set(nameClipId(card), { id: nameClipId(card), text: card.print.split(" ")[0], kind: "name", ...(NAME_HINT[card.id] ? { ipa: NAME_HINT[card.id] } : {}) });
    }
    card.sounds.forEach((_, i) => out.set(soundClipId(card, i), { id: soundClipId(card, i), text: soundSpeak(card, i), kind: "sound" }));
    out.set(exampleClipId(card), { id: exampleClipId(card), text: card.example.hebrew, kind: "word" });
  }
  return [...out.values()];
}
