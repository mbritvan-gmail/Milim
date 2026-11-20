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
  /** The sign is usually silent (shva): no clip, so no speaker. */
  silent?: boolean;
};

export type Example = {
  /** The word split around the letter being taught, so that letter can be highlighted: pre + hl + post. */
  pre: string;
  hl: string;
  post: string;
  translit: string;
  english: string;
  /** What a voice reads when that should not be the pointed word (the everyday spelling without vowel marks). */
  say?: string;
  /** A word said first and cut off afterwards (for a word that is misread when said alone). */
  carrier?: string;
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
  /** Three example words, a speaker each. */
  examples: Example[];
};


const DAGESH = "ּ";
const SHIN_DOT = "ׁ";
const SIN_DOT = "ׂ";

const L = (
  id: string,
  glyph: string,
  name: string,
  sounds: Sound[],
  examples: Example[],
  extra: { final?: string; name2?: string; forms?: string[] } = {},
): LetterCard => ({
  id,
  kind: "letter",
  print: extra.final ? `${glyph} ${extra.final}` : glyph,
  script: extra.final ? `${glyph} ${extra.final}` : glyph,
  name,
  name2: extra.name2,
  sounds,
  examples,
  forms: extra.forms,
});

const s = (form: string, say: string, note: string, as?: number): Sound => ({ form, say, note, ...(as === undefined ? {} : { as }) });
const w = (pre: string, hl: string, post: string, translit: string, english: string, extra: { say?: string; carrier?: string } = {}): Example => ({ pre, hl, post, translit, english, ...extra });

export const CARDS: LetterCard[] = [
  L("alef", "א", "alef", [s("א", "(silent)", "at the start of a word, a tiny pause")], [w("", "אַ", "בָּא", "aba", "dad"), w("", "אִ", "מָּא", "ima", "mom", { say: "אמא" }), w("", "א", "וֹר", "or", "light", { say: "אור" })]),
  L("bet", "ב", "bet", [s("ב" + DAGESH, "b", "with a dot inside"), s("ב", "v", "no dot")], [w("", "בַּ", "יִת", "bayit", "house"), w("", "בֹּ", "קֶר", "boker", "morning"), w("אָ", "בִ", "יב", "aviv", "spring", { say: "אביב" })], {
    name2: "vet",
    forms: ["ב" + DAGESH, "ב"],
  }),
  L("gimel", "ג", "gimel", [s("ג", "g", "")], [w("", "גַּ", "ן", "gan", "garden", { say: "גן" }), w("", "גֶּ", "שֶׁם", "geshem", "rain", { say: "גשם" }), w("", "גָּ", "דוֹל", "gadol", "big", { say: "גדול" })]),
  L("dalet", "ד", "dalet", [s("ד", "d", "")], [w("", "דָּ", "ג", "dag", "fish", { say: "דג" }), w("", "דֶּ", "לֶת", "delet", "door", { say: "דלת" }), w("", "דֹּ", "ב", "dov", "bear", { say: "דב" })]),
  L("he", "ה", "he", [s("ה", "h", "often silent at the end of a word")], [w("", "הַ", "ר", "har", "mountain"), w("", "ה", "וּא", "hu", "he", { say: "הוא" }), w("יַלְדָּ", "ה", "", "yalda", "girl", { say: "ילדה" })]),
  L("vav", "ו", "vav", [s("ו", "v", "also writes the vowels “o” and “u” (see Vowels)")], [w("", "וֶ", "רֶד", "vered", "rose"), w("", "וִ", "ילוֹן", "vilon", "curtain", { say: "וילון" }), w("", "וָ", "רוֹד", "varod", "pink", { say: "ורוד" })]),
  L("zayin", "ז", "zayin", [s("ז", "z", "")], [w("", "זְ", "מַן", "zman", "time"), w("", "זָ", "הָב", "zahav", "gold", { say: "זהב" }), w("", "זַ", "יִת", "zayit", "olive", { say: "זית" })]),
  L("khet", "ח", "khet", [s("ח", "kh", "a throaty sound")], [w("", "חָ", "תוּל", "khatul", "cat"), w("", "חַ", "לּוֹן", "khalon", "window", { say: "חלון" }), w("", "חָ", "לָב", "khalav", "milk", { say: "חלב" })]),
  L("tet", "ט", "tet", [s("ט", "t", "")], [w("", "ט", "וֹב", "tov", "good"), w("", "טֶ", "לֶפוֹן", "telefon", "phone", { say: "טלפון" }), w("", "טָ", "עִים", "ta'im", "tasty", { say: "טעים" })]),
  L("yod", "י", "yod", [s("י", "y", "also writes the vowels “i” and “e” (see Vowels)")], [w("", "יָ", "ד", "yad", "hand"), w("", "יֶ", "לֶד", "yeled", "boy", { say: "ילד" }), w("", "י", "וֹם", "yom", "day", { say: "יום" })]),
  L("kaf", "כ",
    "kaf",
    [s("כ" + DAGESH, "k", "with a dot inside"), s("כ", "kh", "no dot"), s("ך", "kh", "final form: only at the end of a word", 1)],
    [w("", "כֶּ", "לֶב", "kelev", "dog"), w("", "כִּ", "סֵּא", "kise", "chair", { say: "כסא" }), w("מֶלֶ", "ךְ", "", "melekh", "king")],
    { final: "ך", name2: "khaf", forms: ["כ" + DAGESH, "כ", "ך"] },
  ),
  L("lamed", "ל", "lamed", [s("ל", "l", "")], [w("", "לֶ", "חֶם", "lekhem", "bread"), w("", "לַ", "יְלָה", "layla", "night", { say: "לילה" }), w("", "לֵ", "ב", "lev", "heart", { say: "לב" })]),
  L("mem", "מ", "mem", [s("מ", "m", ""), s("ם", "m", "final form: only at the end of a word", 0)], [w("", "מַ", "יִם", "mayim", "water"), w("", "מ", "וֹרֶה", "moreh", "teacher", { say: "מורה" }), w("יָ", "ם", "", "yam", "sea", { say: "ים" })], { final: "ם" }),
  L("nun", "נ", "nun", [s("נ", "n", ""), s("ן", "n", "final form: only at the end of a word", 0)], [w("", "נֵ", "ר", "ner", "candle"), w("", "נַ", "עַל", "na'al", "shoe", { say: "נעל" }), w("בֵּ", "ן", "", "ben", "son", { say: "בן" })], { final: "ן" }),
  L("samekh", "ס", "samekh", [s("ס", "s", "")], [w("", "ס", "וּס", "sus", "horse"), w("", "סֵ", "פֶר", "sefer", "book"), w("", "סַ", "בָּא", "saba", "grandpa", { say: "סבא" })]),
  L("ayin", "ע", "ayin", [s("ע", "(silent)", "sounds just like א")], [w("", "עַ", "יִן", "ayin", "eye"), w("", "עָ", "נָן", "anan", "cloud", { say: "ענן" }), w("", "עֶ", "רֶב", "erev", "evening", { say: "ערב" })]),
  L("pe", "פ",
    "pe",
    [s("פ" + DAGESH, "p", "with a dot inside"), s("פ", "f", "no dot"), s("ף", "f", "final form: only at the end of a word", 1)],
    [w("", "פֶּ", "ה", "pe", "mouth"), w("", "פֶּ", "רַח", "perakh", "flower", { say: "פרח" }), w("כַּ", "ף", "", "kaf", "spoon", { say: "כף" })],
    { final: "ף", name2: "fe", forms: ["פ" + DAGESH, "פ", "ף"] },
  ),
  L("tsadi", "צ", "tsadi", [s("צ", "ts", ""), s("ץ", "ts", "final form: only at the end of a word", 0)], [w("", "צָ", "ב", "tsav", "turtle"), w("", "צִ", "פּוֹר", "tsipor", "bird", { say: "ציפור" }), w("עֵ", "ץ", "", "ets", "tree", { say: "עץ" })], { final: "ץ" }),
  L("kuf", "ק", "kuf", [s("ק", "k", "")], [w("", "קָ", "פֶה", "kafe", "coffee"), w("", "קֶ", "רַח", "kerakh", "ice", { say: "קרח" }), w("", "ק", "וֹף", "kof", "monkey", { say: "קוף" })]),
  L("resh", "ר", "resh", [s("ר", "r", "not rolled")], [w("", "רֹ", "אשׁ", "rosh", "head"), w("", "רֶ", "גֶל", "regel", "foot", { say: "רגל" }), w("", "רַ", "כֶּבֶת", "rakevet", "train", { say: "רכבת" })]),
  L("shin", "ש", "shin", [s("ש" + SHIN_DOT, "sh", "dot on the right (shin)"), s("ש" + SIN_DOT, "s", "dot on the left (sin)")], [w("", "שָׁ", "לוֹם", "shalom", "hello, peace"), w("", "שֵׁ", "ם", "shem", "name"), w("", "שָׂ", "מֵחַ", "sameakh", "happy", { say: "שמח" })], { name2: "sin", forms: ["ש" + SHIN_DOT, "ש" + SIN_DOT] }),
  L("tav", "ת", "tav", [s("ת", "t", "")], [w("", "תּ", "וּת", "tut", "berry", { say: "תות", carrier: "זה" }), w("", "תַּ", "פּוּחַ", "tapuakh", "apple", { say: "תפוח" }), w("", "תִּ", "ינוֹק", "tinok", "baby", { say: "תינוק" })]),
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
const V = (id: string, signs: string, name: string, sounds: Sound[], examples: Example[]): LetterCard => ({
  id, kind: "vowel", print: signs, script: null, name, sounds, examples,
});

export const VOWEL_CARDS: LetterCard[] = [
  V("v-a", on(PATACH) + "  " + on(KAMATZ), "a", [s(on(PATACH), "a", "patach (a small line)"), s(on(KAMATZ), "a", "kamatz (a line with a small stem)")], [w("", "מַ", "יִם", "mayim", "water"), w("", "דָּ", "ג", "dag", "fish", { say: "דג" }), w("", "כַּ", "ף", "kaf", "spoon", { say: "כף" })]),
  V("v-e", on(TSERE) + "  " + on(SEGOL), "e", [s(on(TSERE), "e", "tsere (two dots side by side)"), s(on(SEGOL), "e", "segol (three dots)")], [w("", "לֶ", "חֶם", "lekhem", "bread"), w("", "נֵ", "ר", "ner", "candle"), w("", "שֵׁ", "ם", "shem", "name")]),
  V("v-i", on(HIRIQ) + "  א" + HIRIQ + "י", "i", [s(on(HIRIQ), "ee", "hiriq (one dot)"), s("א" + HIRIQ + "י", "ee", "often written with a yod")], [w("", "שִׁי", "ר", "shir", "song"), w("", "פִּי", "ל", "pil", "elephant", { say: "פיל" }), w("", "תִּי", "נוֹק", "tinok", "baby", { say: "תינוק" })]),
  V("v-o", on(HOLAM) + "  או" + HOLAM, "o", [s(on(HOLAM), "o", "holam (a dot on top)"), s("או" + HOLAM, "o", "often written with a vav")], [w("", "טוֹ", "ב", "tov", "good"), w("", "רֹ", "אשׁ", "rosh", "head"), w("", "דֹּ", "ב", "dov", "bear", { say: "דב" })]),
  V("v-u", on(KUBUTZ) + "  או" + DAGESH, "u", [s(on(KUBUTZ), "u", "kubutz (three dots on a slant)"), s("או" + DAGESH, "u", "shuruk (a vav with a dot)")], [w("", "סוּ", "ס", "sus", "horse"), w("", "תּוּ", "ת", "tut", "berry", { say: "תות", carrier: "זה" }), w("", "שֻׁ", "לְחָן", "shulkhan", "table", { say: "שולחן" })]),
  V("v-shva", on(SHVA), "shva", [{ ...s(on(SHVA), "silent", "shva: two dots, one above the other. In some words it is a very short “e”."), silent: true }], [w("", "זְ", "מַן", "zman", "time"), w("", "שְׁ", "תַּיִם", "shtayim", "two", { say: "שתיים" }), w("", "בְּ", "רָכָה", "bracha", "blessing", { say: "ברכה" })]),
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
//   word  "word-<translit>"             an example word (letters only in the id)
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



const FINAL_TO_BASE: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const isFinalRow = (sound: Sound) => sound.as !== undefined;

/** The letter's name; `second` is the other name of a letter whose dot changes it (bet / vet). */
export const nameClipId = (card: LetterCard, second = false) => `${card.id}-name${second ? "2" : ""}`;
/** One clip per word, shared by every card that uses it. */
export const wordClipId = (word: Example) => `word-${word.translit.replace(/[^a-z]/g, "")}`;
/** A letter card's sound rows depend on the chosen vowel; a final form plays the clip of the row it repeats. */
export const soundClipId = (card: LetterCard, index: number, vowel: VowelId = DEFAULT_VOWEL) =>
  card.kind === "vowel" ? `${card.id}-sound-${index + 1}` : `${card.id}-sound-${(card.sounds[index].as ?? index) + 1}-${vowel}`;

const signOf = (vowel: VowelId) => VOWEL_OPTIONS.find((v) => v.id === vowel)!.sign;
// The consonant, its dot if it has one, and the vowel mark (the vowel mark goes right after the letter).
const withVowel = (form: string, vowel: VowelId) => form.slice(0, 1) + signOf(vowel) + form.slice(1);

// The usual signs for each nikud: patach and kamatz sound the same (so do tsere and segol), and o and u are most often
// spelled with a vav. One speaker plays the sound for all the forms in a cell.
const NIKUD_FORMS: Record<VowelId, { sign: string; vav?: boolean }[]> = {
  a: [{ sign: PATACH }, { sign: KAMATZ }],
  e: [{ sign: TSERE }, { sign: SEGOL }],
  i: [{ sign: HIRIQ }],
  o: [{ sign: HOLAM }, { sign: HOLAM, vav: true }],
  u: [{ sign: KUBUTZ }, { sign: DAGESH, vav: true }], // kubutz, shuruk
};

export type NikudCell = { glyph: string; clipId: string; label: string };

/**
 * The nikud list on a letter card: five rows in order (a, e, i, o, u), each with one cell per form of the letter (bet and
 * vet), each cell showing the letter with every usual sign for that nikud and playing its sound. Final forms have no
 * cells of their own. Vav and yod are already vowel letters, so they only get the plain signs.
 */
export function nikudRows(card: LetterCard): { vowel: VowelId; cells: NikudCell[] }[] {
  const plainOnly = card.print.startsWith("ו") || card.print.startsWith("י");
  return VOWEL_OPTIONS.map((v) => ({
    vowel: v.id,
    cells: card.sounds.flatMap((sound, i) => {
      if (isFinalRow(sound)) return [];
      const base = sound.form.slice(0, 1);
      const marks = sound.form.slice(1); // the dot, if the form has one
      const forms = NIKUD_FORMS[v.id].filter((f) => !(plainOnly && f.vav));
      const glyph = forms.map((f) => (f.vav ? base + marks + "ו" + f.sign : base + f.sign + marks)).join(" ");
      return [{ glyph, clipId: soundClipId(card, i, v.id), label: syllableLabel(card, i, v.id) }];
    }),
  }));
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
      card.sounds.forEach((sound, i) => {
        if (!sound.silent) add({ id: soundClipId(card, i), text: soundSpeak(card, i, DEFAULT_VOWEL), kind: "sound" });
      });
    }
    for (const word of card.examples) {
      add({ id: wordClipId(word), text: word.say ?? word.pre + word.hl + word.post, kind: "word", ...(word.carrier ? { carrier: word.carrier } : {}) });
    }
  }
  return [...out.values()];
}
