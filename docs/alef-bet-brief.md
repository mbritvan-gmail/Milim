# Alef-bet trainer: feature brief

Status: scope agreed. Next step is a plan and mockups for approval, then a staged build. v1 includes cursive (script) and audio. Handwriting practice and stroke order are out of v1.

This is a feature brief: it says what to build and why, what already exists to build on, and how to work on it. The person who owns the app is not a programmer, so decisions, status and questions are written in plain language.

## 1. How to work on this (read first)

**Branch.** Start from the latest work, branch `claude/milim-handoff-review-pmh51c` (it has everything described in `STATUS.md`; `main` may be behind). Create your own branch from it, `claude/alef-bet-trainer` unless the session assigns another name, and push only there. Do not push to the handoff branch or `main`. Do not open a pull request unless asked.

**Another session is working on the Songs module at the same time.** Do not edit:
- `src/app/(app)/songs/**`, `src/components/song-*.tsx`, `src/lib/lyric-repeats.ts`, `src/lib/nikud-run.ts`, `src/lib/nikud-admin.ts`, `src/lib/lyrics.ts`
- Settings: `src/app/(app)/settings/**` and `src/lib/settings.ts` (the other session is changing them now; the trainer needs no new settings)
- the AI provider code in `src/lib/ai/**` (the trainer does not need AI; audio generation is a separate script, see section 7)
- any other code related to songs (that session is cleaning it up)
- the `.song-page` rules in `src/app/globals.css`

If your work needs a change to flashcards, the dictionary, `vocab_entries`, or any existing table, **stop and ask the owner first**; the other session may be changing the same thing. Keep changes to shared files minimal and additive:
- **Home** (`src/app/(app)/home/page.tsx`): only add the new tile. Do not change the existing tiles, their glyphs or the layout code.
- **`src/app/globals.css`**: append new rules at the end; don't modify existing rules.
- **`STATUS.md`**: add one new section for this feature at the end; don't edit other sections.
- **Design canvas** (https://claude.ai/artifact/WKRPZHy6Q97EHsJSQrmMzX): the owner edits it too. Read the live `project/canvas.json` immediately before publishing, keep every existing board, and add yours below the last row.

**Database.** Any change goes in a new file in `supabase/migrations/`, with a timestamp later than the latest file there. It must be additive, safe to run twice, and must not change how existing tables behave. Give the owner the SQL as a paste-ready block and say plainly what stops working until it is run.

**Mockups before building.** For new screens the owner approves a mockup on the Design canvas first. Mock up at least: the trainer start screen (groups and progress), a letter introduction card (print and script side by side), a recognize question, a word-reading question, and a group-check result. Dark and light themes. Do not write feature code until they are approved.

**Staged build.** Tell the owner when each stage is ready to look at, and verify each with `npm run build`, `npx eslint`, and screenshots at 360, 390 and 430 px wide.
1. Tile, start screen, letter data.
2. Letter cards connected to the existing flashcards.
3. Recognize, look-alike and word-reading drills, and group checks.
4. Audio.
5. The script unit (group 11) and the final check (group 12).

**Reporting.** Say what you did, what you did not test, and what the owner needs to do (SQL to run, things to try on their phone). Ask before adding any dependency. If anything here conflicts with how the codebase already works, follow the codebase and say what you changed and why.

## 2. Build on what exists

Milim already has the parts below. The trainer is a new area of the app, built from them. It must not introduce a parallel architecture. Before writing code, find how each is done today and follow it.

- **Home screen.** Smoked-glass tiles in a 3-across grid with the last row centered. Each tile has a tint color and a 24x24 stroke glyph (see the Home page and `.module-tile` in `globals.css`). The trainer gets its own tile, named "Alef-bet", with a tint distinct from the four existing ones and a glyph in the same style. This tile is allowed to use a Hebrew letter (alef) as its glyph; the other four were deliberately kept free of Hebrew letters for it. A fifth tile makes a second row of two, centered; check it at 360, 390 and 430 px.
- **Flashcards.** Each letter becomes a card in the existing flashcard system and is reviewed like any other card. Do not build a second card component or review flow.
- **Where letters live (decide in the plan, ask the owner).** Words in milim are shared rows in `vocab_entries`, with per-person progress in `user_words`, and Word Packs ("Pack", capitalized in the UI) group them. Putting letters in the shared dictionary would make them show up in the Dictionary and in "all words" study. Propose how to avoid that (for example a pack-like source that is hidden from the Dictionary by default) before building.
- **Quizzes and drills.** If Word Packs or songs already have a quiz or multiple-choice component, reuse it. If not, build one small reusable multiple-choice component.
- **Audio.** Check whether the app already plays audio (songs use embedded players). Reuse existing playback code if there is any; do not add a second audio system.
- **Data.** Store letters in the same style as existing dictionary and vocabulary data. No new database or file format.
- **Example words.** Prefer words already in the dictionary and Word Packs. Add a new word only through the existing mechanism.
- **Settings.** The **Show nikud** and **Show pronunciation** (transliteration) settings already exist in Settings; reuse them. Do not add a second nikud toggle. All settings are app-wide; no new per-trainer settings.
- **Pop-ups.** Screens that open over another page are intercepting routes under `src/app/(app)/@modal` using `<Overlay nav>` (keeps the bottom bar) or `<Overlay>` (full screen, for study screens). Small panels use `src/components/sheet.tsx` (centered). Follow the flashcards for study-style screens.
- **Fonts and UI.** Reuse existing components, theme tokens (dark default, light, system) and Hebrew text handling. The current look wins over anything described here. Find how fonts are loaded today (`next/font/google` in `src/app/layout.tsx`) and load the script font the same way.
- **Libraries, tests, naming, file layout.** Use what the project has; ask before adding a dependency. Pure logic is tested with a small esbuild-bundled script; follow existing conventions.

## 3. What it is

A short, guided course that takes a complete beginner from not knowing the letters to reading simple Hebrew words, in both print and cursive, with audio for every letter and example word. It teaches **modern Hebrew only**. Letters are taught in small groups. Each group moves from learning, to recognition, to recall, to reading real words made only of letters the learner already knows. Print comes first, then a script unit.

## 4. Scope of v1

- All 22 letters plus the 5 final forms (ך ם ן ף ץ), in print and in cursive.
- Letter names and sounds, shown in text and played as audio.
- The dots that change a letter's sound: dagesh (בּ כּ פּ) and the shin/sin dot (שׁ שׂ).
- Vowel signs (nikud) as a unit, and vav and yod as vowel letters.
- Reading practice on real words, in print and then in script.
- Works offline: the fonts and audio files are bundled with the app.

Out of v1: handwriting practice, stroke order, tracing, speaking practice, and reading long text without nikud.

## 5. Modern Hebrew sounds: teach what speakers actually say

Do not teach distinctions that modern speakers don't make. Several letters share a sound, and the trainer should say so plainly.

| Letter | Name | Sound in modern Hebrew |
| --- | --- | --- |
| א | alef | silent, or a tiny pause; carries a vowel |
| ב / בּ | bet / vet | v / b |
| ג | gimel | g |
| ד | dalet | d |
| ה | he | h (often silent at the end of a word) |
| ו | vav | v (also o or u, see vowel letters) |
| ז | zayin | z |
| ח | khet | kh (throaty, like "Bach") |
| ט | tet | t |
| י | yod | y (also i or e, see vowel letters) |
| כ / כּ / ך | kaf / khaf | kh / k |
| ל | lamed | l |
| מ / ם | mem | m |
| נ / ן | nun | n |
| ס | samekh | s |
| ע | ayin | silent, like alef |
| פ / פּ / ף | pe / fe | f / p |
| צ / ץ | tsadi | ts |
| ק | kuf | k |
| ר | resh | r (made in the throat, not rolled) |
| שׁ / שׂ | shin / sin | sh / s |
| ת | tav | t |

Sounds shared by more than one letter, to call out in the lessons: א and ע (silent), ט and ת (t), כּ and ק (k), כ and ח (kh), ס and שׂ (s), ב without the dot and ו (v).

Loan sounds written with a geresh (ג׳ j, ז׳ zh, צ׳ ch) get one short lesson near the end.

## 6. Cursive (script)

Hebrew handwriting looks quite different from print, and learners need both. The script letters are the same Unicode letters shown in a handwriting font, so no new letter data is needed; the trainer only needs a second font family.

- **Font.** Suggested starting point: **Gveret Levin**, an open-license Hebrew handwriting font. **Playpen Sans Hebrew** is the open-license alternative. Both are under the SIL Open Font License, which allows bundling. Keep the license file with the font.
- **Not suitable.** Solitreo and Noto Rashi Hebrew: they look like cursive but are Sephardic and Rashi scripts, not the handwriting Israelis use today.
- **A font is one person's hand.** Israeli schools teach a particular style. A Hebrew speaker should pick the font that comes closest and approve all 27 letter forms and the sample words before release. If neither font passes, say so and stop. Do not switch fonts without asking.
- **Check the rendering.** All 27 forms, final forms and sample words, on each platform the app targets (an iPhone and a desktop browser at minimum). Handwriting fonts often draw nikud badly. Script is normally written without nikud, so show script letters and words without it, and keep nikud in print.
- **Look-alikes.** Confusable letters in cursive differ from print; do not reuse the print sets. Ship a placeholder list that is easy to change and leave the real sets for the Hebrew speaker to define after seeing the font.
- **Teaching.** Print is learned first (groups 1 to 10). The script unit (group 11) goes back through the same letter groups and teaches print-to-script matching, recognition in script, final forms in script, then short words in script.
- **Cards.** Each letter's introduction card shows its print and script forms side by side once the script unit has been unlocked.

## 7. Audio

Letters can't really be learned from text alone. Sources considered:

1. On-device text-to-speech: free, but single letters and syllables are often pronounced badly. Not suitable as the main source.
2. Neural text-to-speech, generated once and bundled as files (for example Microsoft Azure he-IL voices Hila and Avri). About 100 to 150 short clips; cheap and offline.
3. Recordings by a native speaker: best quality, about an hour of work for the same clips.

**Plan.** Ship v1 with option 2 and swap in native recordings later without code changes. Name files by id (`letter-bet-name`, `letter-bet-sound-b`, `word-bayit`) and list them in one manifest the app reads.

- **Clips.** Each letter's name ("bet"); each sound as a consonant plus a vowel ("ba", "va"), because a bare consonant can't be pronounced; each example word. For silent alef and ayin, the sound clip is just the vowel. One clip per vowel sign on a neutral consonant.
- **Playback.** A speaker button on letter cards, quiz questions and word reading. Tap to play. No autoplay and no new setting. If a clip is missing, hide that button.
- **Listening drills.** "Hear a sound, pick the letter" in the recognize step.
- **Generation script.** Keep it out of the app bundle; never commit API keys. **Ask the owner which provider and voice to use before generating anything.**
- **Review.** A Hebrew speaker must listen to every clip and reject wrong ones; isolated letters and short syllables are the most likely to be wrong.
- **License.** Check the provider's terms before bundling generated audio in a published app; record provider, voice and date in the repository.

## 8. Teaching order (a proposal, adjustable)

Small groups of 4 letters or fewer, with look-alike letters kept in different groups.

1. ב מ ש א
2. ל ה י נ
3. ר ד ת ט
4. כ ח ק ג
5. ס ז ו ע
6. פ צ
7. Final forms ך ם ן ף ץ (each taught right after seeing it next to its base letter)
8. Dots that change sounds: dagesh and shin/sin
9. Vowel signs (nikud), then vav and yod as vowel letters
10. Geresh letters, then a print reading check
11. Script unit: the same letter groups in cursive, then script words
12. Final check, mixing print and script

Print look-alike sets to drill once the letters have been seen: ב/כ, ד/ר, ה/ח/ת, ו/ז/ן, ג/נ, ט/מ, ם/ס, ע/צ.

## 9. What each group contains

1. **Meet the letters.** Big glyph, name, sound, speaker button, one example word. Final forms and sound-changing dots appear here too when the group has them.
2. **Recognize.** Show a letter, pick its sound or name. Hear a sound, pick the letter. Show a sound, pick the letter.
3. **Tell them apart.** Multiple choice among look-alikes from the group so far.
4. **Recall.** Letters become cards in the existing flashcard review and come back over time.
5. **Read words.** Short real words made only of letters learned so far, following the nikud and transliteration settings. Pick the meaning or the transliteration; tap to hear the word.
6. **Group check.** A short mixed quiz. Passing unlocks the next group. A learner can take the check first to test out of a group.

## 10. Settings

- **Transliteration:** the existing setting. Letter names and sound hints on the introduction cards are the lesson itself, so they always show in Latin letters. The setting applies to word-reading practice.
- **Nikud:** print word-reading follows the existing toggle. The vowel-signs unit always shows nikud, because the signs are the lesson. Script words never show nikud.
- All settings are app-wide. Do not add per-trainer settings.

## 11. Data model

Illustrative; adapt it to the project's conventions and to the "where letters live" decision above.

```json
{ "letter": "ב", "name": "bet", "group": 1,
  "sounds": [
    { "form": "בּ", "translit": "b", "audioId": "letter-bet-sound-b" },
    { "form": "ב", "translit": "v", "audioId": "letter-bet-sound-v" } ],
  "nameAudioId": "letter-bet-name",
  "final": null,
  "lookalikes": ["כ"],
  "scriptLookalikes": [],
  "exampleWordIds": ["bayit"] }
```

- Letter data holds sound and form variants, so a letter such as ב can show both of its sounds.
- There is no separate script glyph: script is the same character in the script font.
- Example words are references to dictionary entries, not copies. Word audio is keyed by word id.
- Progress per group (not started, learning, passed) uses the existing progress storage where it fits.
- A Hebrew speaker must check letter names, sounds, example words, nikud, script rendering and every audio clip before release.

## 12. Seed example words (unverified, hand-written)

Prefer words already in the dictionary. These are only fallbacks.

אבא aba · בית bayit · גן gan · דג dag · הר har · זמן zman · חתול khatul · טוב tov · יד yad · כלב kelev · לחם lekhem · מים mayim · סוס sus · פה pe · קפה kafe · ראש rosh · שלום shalom · תות tut

## 13. Done when

- The trainer has its own tile on Home, in the same style as the other tiles, and opens to its own start screen; Home looks right at 360, 390 and 430 px with five tiles.
- A new learner can complete groups 1 to 12 in order and read simple words in print and in script at the end.
- Every one of the 27 letter forms has a card in the flashcard review, showing print and script.
- Every letter name, sound and example word has a working audio clip, and the speaker buttons play it offline.
- The look-alike drills and group checks work and are reachable from the trainer.
- Nikud and transliteration settings behave as described.
- The script font and audio files are bundled, with licenses recorded.
- Nothing in the existing flashcards, dictionary, vocabulary or songs sections changed behavior, and the Songs module files were not touched.
- `STATUS.md` has a section for the trainer; the owner has the SQL (if any) and a list of what was and wasn't tested.

## 14. Open questions for the owner

- Is the group order right? A Hebrew speaker or teacher should look at it before release.
- Which script font looks closest to the handwriting taught in Israel, and which letter pairs are confusable in script?
- Which text-to-speech provider and voice for the first clips, and do its terms allow bundling the audio?
- Who will record the native-speaker clips later?
- Where do letters live so they don't clutter the Dictionary (see section 2)?
- When a word needed for reading practice isn't in the dictionary: add it through the existing mechanism, or use fewer words per group?

## 15. Later

Native-speaker recordings to replace generated clips; minimal-pair listening drills (ח vs כ, ע vs א); handwriting and stroke-order tracing (needs stroke data a font can't provide); speed-reading drills; reading text without nikud.
