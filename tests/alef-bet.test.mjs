import assert from "node:assert/strict";
// Checks for the Alef-bet module's content (letters.ts) and its sound clips. Run: npm test
// Needs no network and no browser. It does not listen to the audio: a person has to do that.
import * as m from "../src/lib/alef-bet/letters.ts";
import { readFileSync, readdirSync } from "node:fs";
const root = new URL("../", import.meta.url);
const rd = (p) => readFileSync(new URL(p, root), "utf8");
const clips = m.allClips(); const ids = new Set(clips.map(c=>c.id));
assert.equal(ids.size, clips.length); assert.equal(clips.length, 237);
// every card: three example words, the highlight pieces make up the word, the highlight is not empty
const words = new Map();
for (const c of m.ALL_CARDS) {
  assert.equal(c.examples.length, 3, c.id);
  for (const w of c.examples) { assert.ok(w.hl.length>0, c.id+" "+w.translit); const full=w.pre+w.hl+w.post; assert.match(m.plainHebrew(full), /^[א-ת]+$/, w.translit); assert.ok(ids.has(m.wordClipId(w)), w.translit);
    const prev=words.get(w.translit); if (prev) assert.equal(prev, full+"|"+w.english, "same word everywhere: "+w.translit); words.set(w.translit, full+"|"+w.english); }
}
assert.equal(words.size, 71);
// a spot check of the highlights
const hl = (card, t) => m.cardById(card).examples.find(w=>w.translit===t).hl;
assert.equal(hl("bet","aviv"), "בִ"); assert.equal(hl("kaf","melekh"), "ךְ"); assert.equal(hl("mem","yam"), "ם"); assert.equal(hl("v-o","tov"), "טוֹ"); assert.equal(hl("v-i","shir"), "שִׁי"); assert.equal(hl("v-u","sus"), "סוּ");
// words that were wrong before: said plainly or after a carrier; no hints on words
const word = (t) => clips.find(c=>c.id==="word-"+t.replace(/[^a-z]/g,""));
assert.equal(word("gan").text, "גן"); assert.equal(word("dag").text, "דג"); assert.equal(word("tut").carrier, "זה");
assert.equal(word("tsipor").text, "ציפור"); assert.equal(word("shulchan").text, "שולחן"); assert.equal(word("shtayim").text, "שתיים");
assert.equal(word("bayit").text, "בַּיִת"); // existing, fine words keep their vowel marks
assert.ok(clips.filter(c=>c.kind==="word").every(c=>!c.ipa));
// spelling convention (same as the rest of the app): ח = ch, כ = kh. A word with ח and no כ must not use "kh".
for (const [t, v] of words) { const heb = m.plainHebrew(v.split("|")[0]); if (/ח/.test(heb) && !/[כך]/.test(heb)) assert.ok(!t.includes("kh"), "ch not kh: " + t); if (/[כך]/.test(heb) && !/ח/.test(heb) && !/[כך]ּ/.test(v)) {} }
assert.equal(m.cardById("khet").name, "chet"); assert.equal(m.cardById("kaf").name2, "khaf");
// the notes list: only plain Hebrew forms, never empty text, and the letters that need teaching have some
for (const c of m.ALL_CARDS) for (const n of m.notesFor(c)) { assert.ok(n.text.length > 0, c.id); if (n.glyph) assert.match(n.glyph, /^[א-ת\u05B0-\u05C7]+$/, c.id); }
for (const id of ["alef","bet","he","vav","khet","yod","kaf","mem","nun","ayin","pe","tsadi","resh","shin"]) assert.ok(m.notesFor(m.cardById(id)).length > 0, "notes for " + id);
assert.equal(m.notesFor(m.cardById("v-a")).length, 0);
// the nikud list: five rows in order; one cell per non-final form; every cell has a clip
const rows = (id) => m.nikudRows(m.cardById(id));
assert.deepEqual(rows("bet").map(r=>r.vowel), ["a","e","i","o","u"]);
assert.deepEqual(rows("bet")[0].cells.map(c=>c.glyph), ["בַּ בָּ","בַ בָ"]);
assert.deepEqual(rows("bet")[3].cells.map(c=>c.glyph), ["בֹּ בּוֹ","בֹ בוֹ"]);
assert.deepEqual(rows("bet")[4].cells.map(c=>c.glyph), ["בֻּ בּוּ","בֻ בוּ"]);
assert.equal(rows("nun")[0].cells.length, 1); assert.equal(rows("nun")[0].cells[0].glyph, "נַ נָ");
assert.equal(rows("kaf")[0].cells.length, 2); // the final form has no cell
assert.equal(rows("vav")[3].cells[0].glyph, "וֹ"); assert.equal(rows("yod")[4].cells[0].glyph, "יֻ");
assert.equal(rows("alef")[2].cells[0].glyph, "אִ");
for (const c of m.CARDS) for (const r of m.nikudRows(c)) for (const cell of r.cells) assert.ok(ids.has(cell.clipId), cell.clipId);
// the manifest and files
const man=JSON.parse(rd("src/lib/alef-bet/audio-manifest.json"));
for (const v of ["hila","avri"]) { for (const id of ids) { assert.ok(man[v][id], v+" "+id); readFileSync(new URL(`public/audio/alef-bet/${v}/${man[v][id]}`, root)); }
  assert.equal(readdirSync(new URL(`public/audio/alef-bet/${v}/`, root)).length, 237, v + " has no stray files");
   assert.equal(Object.keys(man[v]).length, 237); }
console.log("ok: 237 clips x 2 voices, 71 words, 3 per card, nikud rows, notes, spelling");
