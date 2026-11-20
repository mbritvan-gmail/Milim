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
  /** A short note ("with a dot inside"). */
  note: string;
  /** A final form says the same as an earlier row of its card: the index of that row (it has no clips of its own). */
  as?: number;
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
  /** What the Print panel shows when it should include the dotted and undotted forms (bet and vet); default: `print`. */
  forms?: string[];
  /** Glyphs in the Script panel; null where script has nothing to show (vowel signs). */
  script: string | null;
  name: string;
  /** The other name of a letter whose dot changes its name (bet / vet, kaf / khaf, pe / fe, shin / sin). */
  name2?: string;
  sounds: Sound[];
  example: Example;
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
  extra: { final?: string; name2?: string; forms?: string[] } = {},
): LetterCard => ({
  id,
  kind: "letter",
  print: extra.final ? `${glyph} ${extra.final}` : glyph,
  script: extra.final ? `${glyph} ${extra.final}` : glyph,
  name,
  name2: extra.name2,
  sounds,
  example,
  forms: extra.forms,
});

const s = (form: string, say: string, note: string, as?: number): Sound => ({ form, say, note, ...(as === undefined ? {} : { as }) });
const ex = (hebrew: string, lead: string, translit: string, english: string): Example => ({ hebrew, lead, translit, english });

export const CARDS: LetterCard[] = [
  L("alef", "א", "alef", [s("א", "(silent)", "at the start of a word, a tiny pause")], ex("אַבָּא", "אַ", "aba", "dad")),
  L("bet", "ב", "bet", [s("ב" + DAGESH, "b", "with a dot inside"), s("ב", "v", "no dot")], ex("בַּיִת", "בַּ", "bayit", "house"), {
    name2: "vet",
    forms: ["ב" + DAGESH, "ב"],
  }),
  L("gimel", "ג", "gimel", [s("ג", "g", "")], ex("גַּן", "גַּ", "gan", "garden")),
  L("dalet", "ד", "dalet", [s("ד", "d", "")], ex("דָּג", "דָּ", "dag", "fish")),
  L("he", "ה", "he", [s("ה", "h", "often silent at the end of a word")], ex("הַר", "הַ", "har", "mountain")),
  L("vav", "ו", "vav", [s("ו", "v", "also writes the vowels “o” and “u” (see Vowels)")], ex("וֶרֶד", "וֶ", "vered", "rose")),
  L("zayin", "ז", "zayin", [s("ז", "z", "")], ex("זְמַן", "זְ", "zman", "time")),
  L("khet", "ח", "khet", [s("ח", "kh", "a throaty sound")], ex("חָתוּל", "חָ", "khatul", "cat")),
  L("tet", "ט", "tet", [s("ט", "t", "")], ex("טוֹב", "טוֹ", "tov", "good")),
  L("yod", "י", "yod", [s("י", "y", "also writes the vowels “i” and “e” (see Vowels)")], ex("יָד", "יָ", "yad", "hand")),
  L("kaf", "כ",
    "kaf",
    [s("כ" + DAGESH, "k", "with a dot inside"), s("כ", "kh", "no dot"), s("ך", "kh", "final form: only at the end of a word", 1)],
    ex("כֶּלֶב", "כֶּ", "kelev", "dog"),
    { final: "ך", name2: "khaf", forms: ["כ" + DAGESH, "כ", "ך"] },
  ),
  L("lamed", "ל", "lamed", [s("ל", "l", "")], ex("לֶחֶם", "לֶ", "lekhem", "bread")),
  L("mem", "מ", "mem", [s("מ", "m", ""), s("ם", "m", "final form: only at the end of a word", 0)], ex("מַיִם", "מַ", "mayim", "water"), { final: "ם" }),
  L("nun", "נ", "nun", [s("נ", "n", ""), s("ן", "n", "final form: only at the end of a word", 0)], ex("נֵר", "נֵ", "ner", "candle"), { final: "ן" }),
  L("samekh", "ס", "samekh", [s("ס", "s", "")], ex("סוּס", "סוּ", "sus", "horse")),
  L("ayin", "ע", "ayin", [s("ע", "(silent)", "sounds just like א")], ex("עַיִן", "עַ", "ayin", "eye")),
  L("pe", "פ",
    "pe",
    [s("פ" + DAGESH, "p", "with a dot inside"), s("פ", "f", "no dot"), s("ף", "f", "final form: only at the end of a word", 1)],
    ex("פֶּה", "פֶּ", "pe", "mouth"),
    { final: "ף", name2: "fe", forms: ["פ" + DAGESH, "פ", "ף"] },
  ),
  L("tsadi", "צ", "tsadi", [s("צ", "ts", ""), s("ץ", "ts", "final form: only at the end of a word", 0)], ex("צָב", "צָ", "tsav", "turtle"), { final: "ץ" }),
  L("kuf", "ק", "kuf", [s("ק", "k", "")], ex("קָפֶה", "קָ", "kafe", "coffee")),
  L("resh", "ר", "resh", [s("ר", "r", "not rolled")], ex("רֹאשׁ", "רֹ", "rosh", "head")),
  L("shin", "ש", "shin", [s("ש" + SHIN_DOT, "sh", "dot on the right (shin)"), s("ש" + SIN_DOT, "s", "dot on the left (sin)")], ex("שָׁלוֹם", "שָׁ", "shalom", "hello, peace"), { name2: "sin", forms: ["ש" + SHIN_DOT, "ש" + SIN_DOT] }),
  L("tav", "ת", "tav", [s("ת", "t", "")], ex("תּוּת", "תּוּ", "tut", "berry")),
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
const V = (id: string, signs: string, name: string, sounds: Sound[], example: Example): LetterCard => ({
  id, kind: "vowel", print: signs, script: null, name, sounds, example,
});

export const VOWEL_CARDS: LetterCard[] = [
  V("v-a", on(PATACH) + "  " + on(KAMATZ), "a", [s(on(PATACH), "a", "patach (a small line)"), s(on(KAMATZ), "a", "kamatz (a line with a small stem)")], ex("מַיִם", "מַ", "mayim", "water")),
  V("v-e", on(TSERE) + "  " + on(SEGOL), "e", [s(on(TSERE), "e", "tsere (two dots side by side)"), s(on(SEGOL), "e", "segol (three dots)")], ex("לֶחֶם", "לֶ", "lekhem", "bread")),
  V("v-i", on(HIRIQ) + "  א" + HIRIQ + "י", "i", [s(on(HIRIQ), "ee", "hiriq (one dot)"), s("א" + HIRIQ + "י", "ee", "often written with a yod")], ex("שִׁיר", "שִׁי", "shir", "song")),
  V("v-o", on(HOLAM) + "  או" + HOLAM, "o", [s(on(HOLAM), "o", "holam (a dot on top)"), s("או" + HOLAM, "o", "often written with a vav")], ex("טוֹב", "טוֹ", "tov", "good")),
  V("v-u", on(KUBUTZ) + "  או" + DAGESH, "u", [s(on(KUBUTZ), "u", "kubutz (three dots on a slant)"), s("או" + DAGESH, "u", "shuruk (a vav with a dot)")], ex("סוּס", "סוּ", "sus", "horse")),
  V("v-shva", on(SHVA), "shva", [s(on(SHVA), "e", "shva (two dots, one above the other)")], ex("זְמַן", "זְ", "zman", "time")),
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
// the generation script (scripts/alef-bet-audio) so the two always agree. Nothing is spelled out or explained to
// the voice: it is only given Hebrew letters with their vowel marks.
//   name  "<card>-name"                 the letter with the two dots (shva) under it
//   sound "<card>-sound-<n>-<vowel>"    the consonant sound n of a letter card with the vowel a, e, i, o or u
//         "<card>-sound-<n>"            a vowel card's own sign (no picker)
//   word  "word-<translit>"             the example word
// ---------------------------------------------------------------------------
export const VOWEL_OPTIONS = [
  // `sign` is the vowel mark the clips use.
  { id: "a", sign: "\u05B7" }, // patach (and kamatz)
  { id: "e", sign: "\u05B5" }, // tsere (and segol)
  { id: "i", sign: "\u05B4" }, // hiriq
  { id: "o", sign: "\u05B9" }, // holam
  { id: "u", sign: "\u05BB" }, // kubutz (and shuruk)
] as const;
export type VowelId = (typeof VOWEL_OPTIONS)[number]["id"];
export const DEFAULT_VOWEL: VowelId = "a";

/** What a picker button shows: the card's own letter with the usual forms of that vowel (vav and yod are already vowel letters, so they only get the plain forms). */
export function vowelButtonText(card: LetterCard, vowel: VowelId): string {
  const base = card.print.split(" ")[0];
  const plainOnly = base === "ו" || base === "י";
  const forms: string[] =
    vowel === "a" ? [base + PATACH, base + KAMATZ]
    : vowel === "e" ? [base + TSERE, base + SEGOL]
    : vowel === "i" ? [base + HIRIQ]
    : vowel === "o" ? (plainOnly ? [base + HOLAM] : [base + HOLAM, base + "ו" + HOLAM])
    : plainOnly ? [base + KUBUTZ] : [base + KUBUTZ, base + "ו" + DAGESH];
  return forms.join(" ");
}


const FINAL_TO_BASE: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const isFinalRow = (sound: Sound) => sound.as !== undefined;

/** The letter's name; `second` is the other name of a letter whose dot changes it (bet / vet). */
export const nameClipId = (card: LetterCard, second = false) => `${card.id}-name${second ? "2" : ""}`;
export const exampleClipId = (card: LetterCard) => `word-${card.example.translit}`;
/** A letter card's sound rows depend on the chosen vowel; a final form plays the clip of the row it repeats. */
export const soundClipId = (card: LetterCard, index: number, vowel: VowelId = DEFAULT_VOWEL) =>
  card.kind === "vowel" ? `${card.id}-sound-${index + 1}` : `${card.id}-sound-${(card.sounds[index].as ?? index) + 1}-${vowel}`;

const signOf = (vowel: VowelId) => VOWEL_OPTIONS.find((v) => v.id === vowel)!.sign;
// The consonant, its dot if it has one, and the vowel mark (the vowel mark goes right after the letter).
const withVowel = (form: string, vowel: VowelId) => form.slice(0, 1) + signOf(vowel) + form.slice(1);

/** What is shown for a sound row: the letter (with its dot) carrying the chosen vowel. A final form is shown as it is. */
export function soundGlyph(card: LetterCard, index: number, vowel: VowelId): string {
  const sound = card.sounds[index];
  return card.kind === "vowel" || isFinalRow(sound) ? sound.form : withVowel(sound.form, vowel);
}

/** The syllable in Latin letters ("ba", "be", "kha"); a silent letter just gives the vowel ("a"). */
export function syllableLabel(card: LetterCard, index: number, vowel: VowelId): string {
  const sound = card.sounds[index];
  if (card.kind === "vowel") return sound.say;
  return sound.say === "(silent)" ? vowel : `${sound.say}${vowel}`;
}

/** The text a voice reads for a sound row: the letter (final forms: their base letter) with the vowel mark. */
function soundSpeak(card: LetterCard, index: number, vowel: VowelId): string {
  const form = card.sounds[index].form;
  if (card.kind === "vowel") return form;
  const base = [...form].map((ch) => FINAL_TO_BASE[ch] ?? ch).join("");
  return withVowel(base, vowel);
}

/**
 * `text` is the Hebrew a voice reads. When `ipa` is set the voice is also told, in standard phonetic symbols, how that
 * text sounds; when `carrier` is set the text is said after that word and the word is cut off afterwards. Both exist
 * only for clips that did not come out right as plain letters (checked by ear), mostly letters that can also be a
 * one-letter word at the start of a word.
 */
export type Clip = { id: string; text: string; kind: "name" | "sound" | "word"; ipa?: string; carrier?: string };

const SHIN_SHVA = "ש" + "\u05B0" + SHIN_DOT; // shin with the two dots, as chosen by ear
// Names that needed a hint (chosen by ear, 2026-11). Every other name is the letter with the two dots under it.
const NAME_HINT: Record<string, string> = {
  "bet-name": "\u02c8bet", "bet-name2": "\u02c8vet", "kaf-name": "\u02c8kaf", "pe-name": "\u02c8pe", "pe-name2": "\u02c8fe",
  "shin-name2": "\u02c8sin", "vav-name": "\u02c8vav", "lamed-name": "\u02c8lamed", "ayin-name": "\u02c8ajin",
};
// The text for each name that is not simply "letter + two dots".
const NAME_TEXT: Record<string, string> = {
  "bet-name": "ב" + DAGESH, "bet-name2": "ב", "kaf-name": "כ" + DAGESH, "kaf-name2": "כ" + "\u05B0", "pe-name": "פ" + DAGESH, "pe-name2": "פ",
  "shin-name": SHIN_SHVA, "shin-name2": "ש" + SIN_DOT, "vav-name": "ו", "lamed-name": "ל", "ayin-name": "ע",
};
// Example words that came out wrong with vowel marks (chosen by ear): said without them, or after a carrier word.
const WORD_SPEAK: Record<string, { text: string; carrier?: string }> = {
  gan: { text: "גן" }, dag: { text: "דג" }, tut: { text: "תות", carrier: "זה" },
};

/** Every clip the cards can play, once each, with the text a voice should say. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>();
  const add = (clip: Clip) => out.set(clip.id, clip);
  for (const card of ALL_CARDS) {
    if (card.kind === "letter") {
      const base = card.print.split(" ")[0];
      for (const second of card.name2 ? [false, true] : [false]) {
        const id = nameClipId(card, second);
        add({ id, text: NAME_TEXT[id] ?? base + "\u05B0", kind: "name", ...(NAME_HINT[id] ? { ipa: NAME_HINT[id] } : {}) });
      }
      card.sounds.forEach((sound, i) => {
        if (isFinalRow(sound)) return;
        for (const v of VOWEL_OPTIONS) add({ id: soundClipId(card, i, v.id), text: soundSpeak(card, i, v.id), kind: "sound" });
      });
    } else {
      card.sounds.forEach((_, i) => add({ id: soundClipId(card, i), text: soundSpeak(card, i, DEFAULT_VOWEL), kind: "sound" }));
    }
    const word = WORD_SPEAK[card.example.translit];
    add({ id: exampleClipId(card), text: word?.text ?? card.example.hebrew, kind: "word", ...(word?.carrier ? { carrier: word.carrier } : {}) });
  }
  return [...out.values()];
}
