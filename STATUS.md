# Milim: where we left off

Last updated: 2026-11-20. Branch: `claude/milim-handoff-review-pmh51c` (the Alef-bet work is on it too). Live preview: https://milim-seven.vercel.app. Two code reviews were done on 2026-11-20 (the second after the owner's Alef-bet changes) and their fixes pushed; the Vercel deploys of every recent commit succeeded.

## How to continue (read this first in a new chat)
**What milim is:** a mobile-first web app that teaches Hebrew through song lyrics. Next.js 16 (App Router, cacheComponents, `proxy.ts`; read `node_modules/next/dist/docs/` before writing Next code, see `AGENTS.md`), Tailwind, Supabase (Postgres + auth + RLS), Vercel at milim.britvan.net, Anthropic for AI behind a provider interface (`src/lib/ai`). Brand is lowercase "milim".

**Who the user is:** non-technical. They check things on their phone, run SQL by pasting it into the Supabase SQL editor, and want plain-language answers. Give them SQL as a paste-ready block (also saved in `supabase/migrations/`, safe to run twice) and say plainly what stops working until it runs. Always say what you did not test.

**How we work**
- Develop on branch `claude/milim-handoff-review-pmh51c`; commit and push after each change (that is how it deploys to Vercel). Do not open a PR unless asked.
- For anything with new UI the user usually asks for a mockup first, on their Design canvas artifact (https://claude.ai/artifact/WKRPZHy6Q97EHsJSQrmMzX; read the live `project/canvas.json` before publishing, the user edits it too). Do not build until they approve.
- Verify with `npm run build` and `npx eslint`; `npx tsc --noEmit` shows two known errors from generated types (`LayoutProps`, `.next/types`), ignore those. For visual checks use Playwright against `next start` with a temporary page under `src/app/(app)/ui-test`, and delete it afterwards. Unit-test pure logic (e.g. `src/lib/lyric-repeats.ts`, `src/lib/section-detect.ts`, `src/lib/study.ts`) with an esbuild bundle in the scratchpad; test SQL on a throwaway local Postgres (stub `auth.uid()`). Without Supabase env vars the proxy lets every page through, so a temporary `ui-test` page can be opened in Playwright after a build without them.
- **Database gotchas:** the database returns at most 1000 rows per request whatever `.limit()` says, so lists that can grow use `readAllRows` (`src/lib/paged.ts`) with a unique `.order()`. Never run an old SQL script again after a newer one replaced its functions (see `20261118000000_learning_model.sql`); run each script once, in date order. The app tolerates a missing newer column wherever possible and shows a plain message when it cannot.
- **Parallel sessions:** another session (the Alef-bet trainer) pushes to this branch too; always `git pull` first, and stay out of `src/app/(app)/alef-bet`, `src/lib/alef-bet` and `src/app/(app)/@modal/(.)alef-bet` unless asked.
- Pop-up screens are intercepting routes under `src/app/(app)/@modal` using `<Overlay nav>` (keeps the bottom bar; study sessions at `/study` and Alef-bet cards use `<Overlay>` full screen). Landing pages of the Home modules (`/songs`, `/vocabulary`, `/flashcards`, `/dictionary`, `/alef-bet`) are standalone pages, not pop-ups. Small panels (`src/components/sheet.tsx`) are portals centered on screen.
- Styling: theme tokens in `src/app/globals.css` (dark default, light, system). Home glass tiles use `.module-tile`; the song page uses colors scoped to `.song-page`. Do not restyle other screens unless asked.
- Cost: the whole song library cost about 20 cents to add nikud; one verb conjugation is about 4 cents (so conjugations stay on demand and are saved for everyone in `word_forms`).

**Recently finished (2026-11):** smoked-glass Home; lyrics-first song page; every song has nikud and new songs get it automatically; section headers guessed for new songs (plain `Chorus` / `Verse 1` recognised too) and editable in Edit mode; Dictionary (look things up, search, sort) split from Flash Cards (the place to practise: by status, a Song or a Pack), Flash Cards landing is a standalone page and sessions are pop-ups at `/study`; smarter flash card spacing and remembered misses; the 1000-word Dictionary limit fixed; app-wide Voice setting (Settings > Sound); the Alef-bet trainer with recorded clips in two voices.

**Next up (pick with the user)**
1. The owner has another major app update planned for the next session: ask what it is first.
2. **Goal-based learning program** (brainstorming in the owner's chat first; they will bring a one-page summary): a daily plan built from the songs and Packs a person has added (flash cards, questions, reviews of learned words over time, other reinforcement), shaped by a goal. Reviewing learned words over time and a "just N cards" session size were deliberately left for it. Mock up on the Design canvas before building.
3. Before sharing widely: report/takedown path, terms note, sign-up control (invite only), Anthropic spend limit, Deezer terms check, **Azure terms for bundling the generated Alef-bet audio**, and a Hebrew speaker listening to every Alef-bet clip.
4. Notifications (suggestions, filled requests); pronouns/prepositions forms; "N new words" pack updates.

## Nikud for existing songs
- Done (2026-11): every song now has nikud, added with a temporary Settings tool that has since been removed. New songs get nikud automatically when added. The temporary database function `fill_line_nikud` has been dropped. There is no button or automatic catch-up for nikud any more: only new songs get it, when they are added.

## Automatic sections and section editing (built; editing REQUIRES `supabase/migrations/20261208000000_reorder_lines.sql`)
- New songs pasted without any `[headers]` get a best guess when added (`src/lib/section-detect.ts`, used in `songs/new/actions.ts`): paragraphs (blank lines) are stanzas; a stanza that comes back (60% of its lines shared) is the Chorus; the rest are numbered Verses; strict rules add Pre-chorus (a repeated stanza always right before the chorus), Bridge (last lone stanza between choruses after 2 verses and 2 choruses, not longer than a verse), Outro (short last stanza after the final chorus), Intro (very short opener, 4+ stanzas). Without blank lines it looks for a repeating block of 2 to 8 lines. Headers pasted without brackets are recognised too and stored in bracket form (`bareSectionLabel` in `src/lib/lyrics.ts`): a line that is only a section name such as `Chorus`, `Verse 1`, `Pre-Chorus:`, `(Bridge)`, `פזמון`, `בית א'` (exact names only; a bare Hebrew `בית` needs a letter or number). Lyrics that already have headers (either way), or a single stanza with no repeats, are left alone. Rules only, no AI; if results are weak, a Claude check could be added. Existing songs are not touched.
- Headers are ordinary rows (`[Verse 1]`). In Edit mode (owner) each header has a grip (drag, or arrow keys), its name (tap to rename: Verse, Pre-chorus, Chorus, Bridge, Intro, Outro, Interlude, Solo + number), and a trash can (removes only the header). A line's Edit sheet has "Add section above this line". Everything has Undo. Server actions in `edit-actions.ts` (`addSection`, `removeSection`, `renameSection`, `reorderLines`); `reorderLines` refuses any order that changes the lyric lines' order. The database function `reorder_lines` moves lines (adding and moving need it; renaming and removing do not).
- Checked: detection with unit tests on made-up songs, the SQL on a real Postgres, the Edit mode screen in a browser with stand-in data. Not yet tried against the live database.

## Dictionary and Flash Cards split (built; no new SQL; not yet seen live)
- Dictionary (`/dictionary`) is for looking words up: search, the All / New / Learning / Learned chips now only filter (default All), nikud in rows (follows Show nikud), and a line under each word with its part of speech and where it comes from ("verb · from Hava Nagila, Hatikva", "from 3 songs", "Pack: Nature"; `src/lib/word-sources.ts`). The Study button was removed; "I know this / Reset" stay. A Sort button beside the search box (English A to Z default, Hebrew א to ת; verbs are filed under the main word, "to love" under L) is remembered on the device (`src/lib/dictionary-sort.ts`).
- Flash Cards start screen has "My words" (All / New / Still learning / Learned with counts, as before) and "Or practise words from": **A Song** and **A Word Pack** pickers (`flashcards/study-picker.tsx`) listing the Songs and added Packs with how many words are left to learn, and tapping one starts its flash cards at once (`/study?song=` / `?module=`; "Review" of everything if all are learned). Song and Pack pages keep their own study buttons.
- Checked: the "from …" text with unit tests; the picker and Dictionary in a browser with stand-in data. The live database path is not yet exercised.

## Smarter flash card spacing and order (built; the between-sessions part REQUIRES `supabase/migrations/20261210000000_miss_tracking.sql`)
- Within a session (`src/lib/study.ts`): a card not yet learned never comes straight back. After a miss it returns after 5 other cards, then 4, then 3 for later misses of the same word; after a correct answer it waits 10 cards for a word not missed this session (6 for one that was), times the number of correct answers in a row (so 10, 20, 30 or 6, 12, 18), at most 30; if fewer cards are left it goes to the end. These numbers are principled guesses (spacing grows on success, shrinks on failure), not tuned on real sessions. Undo restores all of it.
- Between sessions: `user_words.miss_count` (a miss adds 1, a correct answer takes 1 off, learning / "I know this" / reset clears it; the RPCs `record_answer`, `mark_word_known`, `reset_word` and `restore_word` (new optional `p_miss_count`) were replaced). A session now starts in a weighted shuffle (`sessionOrder`): random, but words with misses (up to 4) tend to come first (a word missed 4 times is first about 70% of the time against 20% by chance). Until the SQL runs nothing breaks: misses read as 0 and Undo falls back to the old call.
- Decided against, for now: a "just 20 cards" session size, keeping a Pack's own order, and reviewing learned words over time. Idea for later: a goal-based learning plan built from the person's songs and Packs (flashcards, questions, reviews of learned words).
- Checked: spacing, undo and ordering with unit tests; the SQL transitions on a real Postgres; lint and build. Not yet seen in the live app.

## Voice setting (built; REQUIRES `supabase/migrations/20261212000000_speech_voice.sql`)
- Settings > **Sound** (marked Whole app) has **Voice** (Female / Male), saved to `profiles.speech_voice` (default `female`). Read it anywhere with `loadSettings(...).speechVoice` (`SpeechVoice`, `isSpeechVoice` in `src/lib/settings.ts`); older databases without the column fall back to `female`. Saving without the column shows a friendly "voice script hasn't been run" message. Meant for every spoken-word feature, so the name is generic.

## SQL scripts (user)
All scripts live in `supabase/migrations/`. The user has run them as features shipped: through `20261204000000_lyrics_size.sql`, then `20261208000000_reorder_lines.sql` (section moving), `20261210000000_miss_tracking.sql` (remembered misses) and `20261212000000_speech_voice.sql` (Voice) are all run (confirmed by the user). If a feature says it needs a database update, ask which script and have them run it. Most are safe to run again, but run each once in date order and never re-run `20261118000000_learning_model.sql` after the miss-tracking script.

## Done
- Product decisions locked (see README "Rules baked into the database").
- Next.js 16 app, dark/soft-blue theme, Assistant Hebrew font (swap in src/app/layout.tsx).
- Supabase project created; migration `supabase/migrations/20261116000000_initial_schema.sql` applied (13 tables + `master_dictionary` view).
- Vercel project deployed from this branch.
- Magic-link login coded: `/login`, `/auth/confirm`, `/auth/signout`, protected `/songs`, and `src/proxy.ts`.
  - The site root forwards `/?code=...` to `/auth/confirm`, so sign-in works even if Supabase's redirect allow-list is off.
- Vercel environment variables set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production). Old stray variable named `default` should be deleted.

## Verified
- Full magic-link sign-in works on https://milim-seven.vercel.app via Resend SMTP (sender milim@britvan.net),
  using the custom Magic Link template that points at `/auth/confirm?token_hash=...`.

## Built and live-tested once (a real song translated well on the deployed site)
- `/songs/new`: paste Hebrew lyrics (+ title, artist, optional Spotify/YouTube link, private/public) -> Claude translates lines,
  adds transliteration, and extracts key vocab -> saved to Supabase -> `/songs/[id]`.
- `/songs/[id]`: tap a line to reveal English, "show all", pronunciation (transliteration) toggle saved to the profile, key words list, embedded player.
- AI layer: `src/lib/ai/` (provider interface; `AnthropicProvider`; model from `AI_MODEL`, default `claude-sonnet-5-5`).
  Long songs are split into 12-line chunks processed in parallel; replies are schema-validated (Zod) with one retry.
- Safeguards: 15 new songs per user per 24h, 100 lines / 12,000 characters per song, non-Hebrew lines ignored.
- Verified end to end by the user with a real song. Bracketed section labels like `[Chorus]` / `[בית א']` become headings (not translated).
- No server-side refusal fallback is configured (lyrics are benign); refusals show a friendly error.

## Built since (awaiting live test)
- Per-song quiz at `/songs/[id]/quiz`: up to 15 words (unlearned first), 4 choices, Clue button, server-graded results saved, retakes,
  best score on the song page. Wrong answers come from the AI once, cached in `quiz_options`. Its answers count toward the same word statuses.
- "Find on YouTube" / "Find on Spotify" on the add-lyrics form (YouTube needs `YOUTUBE_API_KEY` in Vercel).
- Signed-in pages live in the `src/app/(app)` route group. Bottom tab bar: Songs / Library / Dictionary.

## Learning model v2 (built; REQUIRES the SQL script `supabase/migrations/20261118000000_learning_model.sql`)
- Statuses everywhere: **New** (never answered) / **Learning** / **Learned**. A word is Learned after N correct answers
  (N = a per-person setting, 1 to 3, default 2; quiz and flashcard answers both count). One miss on a Learned word
  puts it back to Learning with progress cleared. No calendar / spaced-repetition boxes any more.
- Dictionary `/dictionary`: filter chips (All / New / Learning / Learned) both filter the list and choose what to study; the Study button sits right under
  the chips. English left, Hebrew right (blue). Tapping a word opens its card `/dictionary/[id]` (I know this / Reset to Learning).
- Study `/study` (a pop-up over the page you were on; old `/flashcards?...` links redirect here): `?filter=new|learning|learned|all`, `?song=ID&scope=unlearned|learned`. Tap the card to reveal.
  Still learning (yellow) / Got it / I know this (not shown for Learned words). Within a session a missed card returns after 6 other cards and a correct-but-not-yet-learned one after 10 (or goes to the end of a short queue); the session ends when
  everything is learned or the person leaves with the X. Undo (circle, top) restores the card, the queue and the database row. Direction pill: Hebrew to English,
  English to Hebrew, Mixed. No pronunciation on the front of a Hebrew-first card. Summary counts each word once (first answer).
- Settings `/settings` (gear on the Songs page): correct answers to learn (1 to 3), default study direction, show pronunciation (one switch for the whole app), Sign out.
- Song page: Practice card with "Study N words" (that song's unlearned words), Quiz, "Review the N learned words"; key words show status badges and link to their cards.
- Key words from the AI now keep pronouns, prepositions, conjunctions, no/yes; only "shel", the object marker "et" and loose one-letter prefixes are skipped.
- Logic checked with unit tests; the SQL rules checked on a real Postgres; screens checked in a browser with sample data. The live database path is not yet exercised.

## Public library (built; needs a live test with two accounts)
- `/library` lists every public, non-archived song with who shared it; "Add" puts it in your list (a reference, not a copy). Songs you haven't added show an
  "Add to my songs" banner. Owners of private songs can "Share in the public library" (one-way, confirmed). Public songs can be archived, never deleted.
- Database sharing rules checked against a real Postgres: others see public songs only, can add them, can't edit or share someone else's song, can't add private ones.

## Verbs
- New songs store verbs as Hebrew infinitives with English "to ..." (e.g. לאהוב / to love). Songs added earlier keep the old past-tense forms until re-added
  (or until the planned "regenerate key words" feature).

## Song editing (built; no new SQL needed)
- Owners get an Edit / Done button on their song: edit a line (English, pronunciation, Hebrew typos), tap a Hebrew word to add it (Claude fills in lemma, pronunciation, meaning, part of speech),
  remove a word from the Song Vocabulary with an x (removed words stay out of the Dictionary unless another song has them), edit song details (title, artist, Spotify/YouTube link + Find buttons). Undo toast after each edit.
- Other people on a public song get the same Edit button; in it each line is tappable to suggest better English; the owner reviews them in a Suggestions box at the top of the song (Approve / Reject, with Undo). Notes are stored as JSON in `edit_suggestions.proposed_value`.
- "Key words" is now **Song Vocabulary** everywhere. Needs a live test with two accounts.

## Home screen and modules (built)
- Signed-in landing is `/home`: three tiles, Songs / Flash Cards / Dictionary, no extra text. The bottom bar on every signed-in screen is Back / Home / Settings (the per-page gear and the old Songs / Library / Dictionary tabs are gone).
- Songs has two views, **My songs** and **Public library** (`/songs`, `/library`). `/flashcards` is the Flash Cards home, a standalone page like Songs and Vocabulary (study sessions open over it as pop-ups at `/study`; its X returns to it) (New / Still learning / Learned / All, with counts).
- Light / dark theme: Settings > Appearance (System / Light / Dark, default Dark). Stored per device in localStorage (key `milim-theme`) and applied by a head script before paint. The sign-in screen stays dark. To make it follow the person across devices, add a profile column later.

## Songs cleanup (built)
- The "back to songs / library / dictionary / song" links at the top of pages are gone (the bottom bar's Back covers it). Study / quiz end-of-session buttons stay.
- Remove song (delete / archive / remove from my list, with the same warnings) now appears only while editing a song. Share in the public library stays visible to owners.
- Changing a setting refreshes pages already visited, so Back shows the new setting without a reload (revalidatePath in `saveSettings`, plus settings in the song and Dictionary view keys).
- Songs list: a dropdown (Add song / Edit) next to the title. Edit mode puts a minus on every row (asks first; wording depends on the song) and a "Make public" button on your own private songs. No Private/Public switch anywhere: public is one-way.
- New songs default to Public; Private must be chosen on purpose. On a song, Edit shows "Make public" (private songs only) next to Remove and Done.

## Verb conjugation and noun / adjective forms (built; REQUIRES the SQL script `supabase/migrations/20261120000000_conjugation.sql`; not yet live-tested with the AI)
- Verb cards (flashcard back, and a word's page in the Dictionary) get a **Conjugation** button that opens a full-screen view with Present / Past / Future tabs; the last tab opened is remembered on the device.
- Forms are written by Claude the first time anyone opens a verb (`getConjugation` in `src/app/(app)/conjugation/actions.ts`, prompt in `src/lib/ai/anthropic.ts`) and saved in `verb_forms` for everyone. If it fails the view shows a "Try again" message.
- Forms are stored as prefix / stem / suffix segments with plain, vowel-marked and pronunciation text (`src/lib/conjugation.ts`), so the toggles only change drawing. Past "you" m/f collapse to one line with a note when nikud is off.
- Settings: new "Show nikud" switch (Display, whole app; `profiles.show_nikud`); the existing "Show pronunciation" switch also drives conjugations.
- Colors are theme tokens `--seg-prefix / --seg-stem / --seg-suffix`.
- Song Vocabulary shows the dictionary form (verbs: infinitive) with a small "in the song: ..." line when the sung form differs.
- Decision: no Hebrew-speaker review step; we rely on the model. Possible later: a "report a mistake" button, an edit mode on the Dictionary, other tenses, testing steps.
- Old songs' verbs may still be stored as sung forms (not infinitive) until re-added; a one-off cleanup could normalize them.

## Pop-up screens (built)
- Settings, a Dictionary word, a vocabulary module, a study session (`@modal/(.)study`) and a quiz open as full-screen pop-ups over the page you were on, with an X (also Escape and the browser Back button). Built with Next.js intercepting + parallel routes: `src/app/(app)/@modal/(.)settings`, `(.)flashcards`, `(.)dictionary/[id]`, `(.)songs/[id]/quiz`, the shared `src/components/overlay.tsx`, and the `modal` slot in `src/app/(app)/layout.tsx`.
- Opening the same address directly (refresh, shared link) shows the normal full page. Pages are reused, not copied.
- Inside a pop-up, "Back to ..." buttons close it (`CloseOrLink`); the study screen's own exit X is hidden there. When a pop-up closes, the page underneath refreshes (`StaleRefresher`).
- The quiz start (a server action redirect) and the quiz's Retake (now `router.refresh()`) are not yet checked live.

## Forms for nouns and adjectives (built; same SQL script)
- Noun and adjective cards (flashcard back, Dictionary word page) get a **Forms** button (verbs keep **Conjugation**). Adjectives: four-way grid (masculine / feminine x singular / plural). Nouns: gender tag, singular, plural, and an optional one-line note from the model for irregular plurals. Construct (smichut) forms are deliberately left out.
- One table, `word_forms` (kind + forms JSON), serves verbs, nouns and adjectives; the SQL script renames the earlier `verb_forms` table if it exists. Code: `src/lib/word-forms.ts`, `src/components/word-forms.tsx`, `src/app/(app)/word-forms/actions.ts` (`getWordForms`), `inflectWord` in `src/lib/ai/anthropic.ts`.
- Later: pronouns and prepositions (inflected forms like לי, לך, לו).

## Vocabulary modules (built; REQUIRES `supabase/migrations/20261122000000_vocabulary_modules.sql`; not yet live-tested)
- Home has a fourth icon, **Vocabulary** (`/vocabulary`): list of modules (yours, public ones, ones you added) with Added / Not added and a learned progress bar. The ⋯ menu has **New module**.
- New module (`/vocabulary/new`): title + pasted Hebrew words (one per line or commas, up to 100) + Public (default) / Private. Claude (`defineWords`) fills in lemma, nikud, pronunciation, English, part of speech, gender and plural; words are saved as shared dictionary words (new nullable columns `vocalized`, `gender`, `plural` on `vocab_entries`; existing words get blanks filled by `fill_word_extras`).
- Module page (`/vocabulary/[id]`): read-only preview (nikud / pronunciation follow the settings), **Add module** puts its words in the Dictionary (`user_modules`), then **Start flashcards** (`/study?module=ID`, `&scope=all` to review everything). Owners get Edit like songs: rename, remove a word (confirm + Undo), add more words by pasting, Make public (one-way), Remove module (delete private / archive public / remove from list).
- Owners can reorder a module's words in Edit mode: drag the grip on the right of a row (or focus it and use the up / down arrow keys); the order is saved straight away (`reorderModuleWords`).
- The Vocabulary list's hamburger menu has **New module** and **Edit** (minus to remove with confirmation, **Make public** on your own private modules). A module's pop-up has its X beside Edit.
- Same rules as songs: public is permanent, public modules are archived not deleted. Dictionary = songs + added modules (`master_dictionary` view). Not built yet: suggestions from other people, nikud for song words, "N new words" version updates, a "From the X module" line on cards, nikud in the Dictionary list rows.
- If the SQL hasn't been run, the Vocabulary page says so instead of failing, and everything else keeps working.

## Nikud for songs (built; REQUIRES `supabase/migrations/20261124000000_song_nikud.sql`; not yet live-tested with the AI)
- When a song is added, Claude adds nikud to every lyric line (`lines.vocalized`) and every Song Vocabulary word (`vocab_entries.vocalized`, via `fill_word_extras`); an answer is only accepted if it is the original text with vowel marks added (`isPointedVersion`), so the words can never change.
- Lyrics, Song Vocabulary, flashcards and the Dictionary word page follow the Show nikud switch where nikud exists; edit mode keeps plain text. Editing a line's Hebrew clears that line's saved nikud.

## Song groups, search, sort and reorder (built; REQUIRES `supabase/migrations/20261126000000_song_groups.sql`)
- Songs hamburger menu: Add song / **Create group** / Edit. Groups are named folders (a song is in one group or none); songs not in a group show under "Not in a group" once a group exists. Groups collapse; empty groups stay.
- Search box (title or artist, across all groups, results show the group) and a Sort button (My order / Title / Artist / Recently added, remembered on the device; sorts inside each group).
- Edit mode: drag the grip (or arrow keys) to reorder songs within a group and groups themselves; the folder moves a song to another group (or a new one); Rename and delete (minus) on a group (its songs are kept, moved to "Not in a group"); the existing minus and Make public stay. Search and sort are paused while editing.
- Data: `song_groups`, plus `user_songs.group_id` and `user_songs.position` (per person). Code: `src/app/(app)/songs/songs-list.tsx`, `group-actions.ts`, `src/lib/songs-order.ts`, `src/lib/drag-reorder.ts`.

## Search boxes and module order (built; module order REQUIRES `supabase/migrations/20261128000000_module_order.sql`)
- Search boxes (songs, modules) have an X to clear them (`src/components/search-box.tsx`).
- Vocabulary list: search modules by title; modules you have added come first ("Your modules", in your own order), the rest follow ("More modules"). In Edit, drag the grip (or arrow keys) to reorder your added modules (`user_modules.position`, `reorderModules`).

## Two player links, preferred player, song search with album art (built; REQUIRES `supabase/migrations/20261130000000_song_links.sql`)
- A song can have a Spotify link and a YouTube link (`songs.spotify_url` / `youtube_url`; the old single `media_url` / `media_type` is kept in step with YouTube preferred, so older code and databases still work). Settings > Player > Preferred player (Spotify / YouTube, default YouTube; `profiles.preferred_player`). A song opens with the preferred player; with both links a small switch flips between them (`src/components/song-player.tsx`). milim cannot tell whether someone is logged in to Spotify (browsers keep other sites' cookies private), hence the setting.
- Add lyrics and Edit > Title, artist & links: "Find the song" searches Deezer's public catalog (no key; Hebrew and English titles both work, verified live) and fills in title, artist, album and cover art; then player links (Find on Spotify / Find on YouTube, or paste a link) sit above the lyrics box. Cover art is stored as an address only, accepted only from Deezer's image servers (`isTrustedCover`). Cover art shows on the song page and in the Songs list. Code: `src/components/song-links.tsx`, `src/lib/deezer.ts`, `src/lib/song-links.ts`.
- Check Deezer's terms before a wide launch (display of cover art, "Search by Deezer" credit is shown). The build session's network allowlist now includes api.deezer.com.

## About page
- Home's bottom bar shows **About** where Back would be (Back is irrelevant on Home). `/about` (opens as a pop-up with an X) has what's in milim, a few things to know, the photo credits (from `src/lib/login-photos.ts`, so new photos are credited automatically) and thanks. The Home screen no longer shows a photo credit; the sign-in screen still does.

## Song requests (built; REQUIRES `supabase/migrations/20261202000000_song_requests.sql`)
- Songs menu > **Request song** (`/songs/request`): search the song (Deezer), optionally add Spotify / YouTube links, request it. If the song is already in the library (or already requested) it offers to add / open it instead. Requests are public; no upvotes, no limits; the author can cancel while open.
- **Requests** tab (third tab beside My songs and Public library, `/songs/requests`): open requests with **Add lyrics** (or Cancel for your own); **Done** lists requests filled in the last 14 days (your own ready one is highlighted, with Open).
- **Add lyrics** from a request opens `/songs/new?request=ID` prefilled (title, artist, album, cover art, links); the song is always public and owned by the filler; on save the database function `fulfill_song_request` marks the request filled and adds the song to the requester's list (a row for another user, hence the function). If someone else filled it first, the song is still added to the library.
- Not built: notifications (the requester finds out on the Requests tab), fading done requests beyond 14 days is just a filter.

## Songs open as pop-ups
- A song opens over the page you were on (Songs list, Library, Requests, a Dictionary link), with its **X beside Edit** (`@modal/(.)songs/[id]`); opened directly (a reload, or right after creating a song) it is the normal page with a fallback X to the Songs list. Add lyrics (`/songs/new`) and Request a song (`/songs/request`) are pop-ups too, with their own routes in the modal slot so "new" and "request" are never read as a song id. Creating a song or a request, and removing a song or a Pack, replace the form in the history so the X returns to the list.
- The Requests tab moved to `/requests` (top level), because anything under `/songs/` would be caught by the song pop-up route.

## Naming
- Vocabulary modules are called **Word Packs** ("Pack", capitalized) everywhere users see them; "modules" is reserved for the Home screen sections (Songs, Vocabulary, Flash Cards, Dictionary). Code, routes and database tables keep the name `modules`.

## Remaining work, in order
1. Run the learning-model SQL script in Supabase, then live-test study, dictionary, settings and the public library with two real accounts. Set up `YOUTUBE_API_KEY`.
2. Close sign-ups to invited people only (Supabase: turn off new sign-ups, invite friends/family), or add an allowed-email list.
3. (Editing is built; see above.)
4. User-created libraries (named collections, e.g. by genre or difficulty; tables `libraries` / `library_songs` already exist).
5. (Edit suggestions are built; see above.)
6. Help / tips page (section names in [brackets], one line per row, public is permanent, pronunciation setting).
7. Before sharing widely: report / takedown path for public lyrics and a short terms note, Anthropic spend limit and usage watching, tighten who may add vocab entries.
8. Notifications: tell owners when someone suggests an edit (in-app notifications or email); tell suggesters when it is approved or rejected.
9. Later ideas: a small "due" badge on the Dictionary tab, a "words not reviewed in 30 days" nudge for learned words, more dictionary upgrades.
10. Housekeeping: delete the stray Vercel variable named `default`; lowercase "milim" in the Supabase email template. Optional SQL, once the simplified Alef-bet page is confirmed live: `drop table if exists public.alef_cards_seen;`.
11. Still not seen in the live app (built and checked only with tests and stand-in data): section editing in Edit mode and automatic sections for a new song, the Dictionary "from ..." lines and Sort, the Flash Cards pickers and the `/study` pop-up routing (X returns to the page you came from), the new spacing and miss ordering in a real session, and the Voice setting saving to the account.

## Notes
- Naming: a song's word list is called the **Song Vocabulary** (not "key words"); the **Dictionary** is the words from all of a person's songs.
- Editing plan (mockup approved in outline, see the "milim editing mockups" artifact): owners get an Edit button on their songs (edit a line's English / pronunciation / Hebrew,
  remove a word from the song vocabulary with an x, add one by tapping a Hebrew word, edit song details, Undo after each edit). Other users can suggest a change to a line's English;
  the owner reviews them in an inbox (approve / reject). "Regenerate" was dropped. Open question: keep words a person has studied in the Dictionary even after they are removed from every song.
- Screens that copy server data into their own memory (study, quiz, dictionary, word card, song key words, library, settings) are given a `key`
  (a fresh id per visit, or a fingerprint of the data) so they never show stale statuses or hold on to an earlier session when navigated back to.
  Without this, "Practice this word" showed an older session's word and the Dictionary kept old statuses after studying.
- The back of a card (`src/components/word-card-back.tsx`) is shared by the flashcards and a word's page in the Dictionary, with "Heard in <song>".
- The settings gear is on Songs, Library and Dictionary.
- Sign-in links open a "Sign in to milim" button page (`/auth/confirm`); the one-time token is only used when the button is pressed, so mail apps / scanners that preview links can't use it up. Works with the existing Supabase template (no change needed).
- Lesson: the database returns at most 1000 rows per request, whatever `.limit()` says (the Dictionary silently stopped at exactly 1000 words). Lists that can grow past that must be read with `readAllRows` (`src/lib/paged.ts`) and a unique `.order()`. Done for the Dictionary, Flash Cards counts and study cards, "heard in" lookups and Pack word counts. Still capped on purpose or by size: Library (300 songs), Vocabulary list (300 Packs), Requests (200); raise them with `readAllRows` when they get close.
- Lesson: don't embed `profiles(...)` from `songs` in a Supabase query; `songs` relates to `profiles` two ways (owner and via `user_songs`), which makes the embed ambiguous and the query fail. Look names up separately.
- The sign-in screen (also the landing page: `/` redirects to `/login` or `/songs`) rotates taglines (`src/components/rotating-tagline.tsx`)
  and crossfades Israel photos (`src/lib/login-photos.ts`, files in `public/login-bg`). All photos are from Wikimedia Commons (mostly CC BY-SA, one public domain);
  the credit under the screen links to each file's page. Add photos by dropping a file in `public/login-bg` and adding an entry with its credit.
- User-facing brand text is lowercase "milim". The Supabase email template still needs the same edit (done in the Supabase dashboard).
- This build session now runs in a personal "milim" cloud environment whose network also allows commons.wikimedia.org and upload.wikimedia.org.
- Daily new-song limit is a cost safety net: `DAILY_SONG_LIMIT` env var, default 100 per user per 24h.
- Spotify embeds play 30-second previews unless the listener is logged in to Spotify (Premium for full songs); Safari often blocks that. We added an "Open the full song" link. Possible later: Spotify Web Playback SDK (Premium only), or YouTube links for full playback.
- Friends-and-family scale for now. Tighten rules (vocab insert policy, moderation) before a wider rollout.
- Do not share the Supabase `sb_secret_...` key anywhere. It isn't needed yet.
- Dashboard menu names in Supabase and Vercel change often; when unsure, send a screenshot.

## Home redesign (smoked glass)
- Home tiles: dark smoked glass with a per-module tint (Songs blue, Vocabulary green, Flash Cards amber, Dictionary coral), 3 across with the last row centered, more transparent; lighter frosted tiles with deeper icon colors in the light theme.
- Title מילים uses the system font; labels have a soft dark halo for legibility on bright photos.
- Bottom bar is glass on Home only (light glass in light theme); other screens keep the standard bar.
- CSS lives in `globals.css` (`.module-tile`, `.module-label`, `--tile-*`/`--nav-glass-*` variables). No SQL needed.

## Song page redesign (lyrics first)
- Header: 64px cover, title, round Edit (pencil) and Close buttons. Compact YouTube/Spotify tabs, video, then a one-row Practice card (N words to learn, Study, Quiz).
- Lyrics: one card with section bands, tap-a-line English (gray placeholder bar when hidden), a Show/Hide English pill. Transliteration stays italic and muted and is controlled only by the Settings toggle.
- Repeats (display only): a section that repeats an earlier one collapses to a "Repeat" band; back-to-back repeated lines/blocks show once with a "Repeats N×" chip (`src/lib/lyric-repeats.ts`). Edit and suggest modes show every line.
- New setting **Lyrics size** (Small / Medium / Large, default Medium) in Settings. **Needs SQL:** `supabase/migrations/20261204000000_lyrics_size.sql` (until it runs, the size just stays Medium and saving shows a message).
- Colors are scoped to `.song-page` (dark and light values in `globals.css`); other screens unchanged.

## Alef-bet trainer (now on the main working branch; no SQL needed)
- Home has a fifth tile, **Alef-bet** (second, between Songs and Vocabulary; lavender, an alef set in Heebo 400, 44px, via `src/components/alef-glyph.tsx`). Do not change the tile; the owner likes it as is.
- `/alef-bet` is **one page with every letter and vowel**, nothing to check off, no groups, no progress, no subtitle: Letters (אותיות, 22 tiles, right to left so alef is top right, final forms share their letter's tile) and Vowels (תנועות, 6 tiles). Tapping a tile opens its card full screen over the page (`@modal/(.)alef-bet/[card]`, like Flash Cards); opened directly it is a normal page. **Next / Previous go through all 28 cards in order** (22 letters, then 6 vowels); the header says "Letter 2 of 22" / "Vowel 1 of 6"; the last card says Done; the X is on the right.
- Design decisions (owner, 2026-11): one card per letter showing print, script, sounds and an example word (no back of card, no flash cards, **no quizzes**, **no progress saving, no database table**). Letters are not stored as words, so they never reach the Dictionary, flash cards or song quizzes. No Basic words link on this page: the owner's "Basic words" Word Pack is just a normal Pack in Vocabulary. No offline mode.
- Vowel signs are shown **on alef** (silent, so the sign alone gives the pure vowel sound), always with nikud.
- Content lives in `src/lib/alef-bet/letters.ts` (names, sounds, example words; checked by a small script that tests each example word and the order). Unverified: a Hebrew speaker should check names, sounds, example words and vowel descriptions.
- Script font: Gveret Levin through `next/font/google` (`src/lib/alef-bet/fonts.ts`). A stand-in until a Hebrew speaker confirms it matches the handwriting taught in Israel (alternative: Playpen Sans Hebrew).
- Nikud and pronunciation settings apply to the example word; sound hints are always shown.
- **Sound clips (done):** each card has speaker buttons for the letter's name, each sound and the example word (`[card]/speaker-button.tsx`, plain browser audio, no dependency, tap to play, never automatic). 237 clips in **two voices**, made with Microsoft Azure's Hebrew voices (he-IL-HilaNeural = Female, he-IL-AvriNeural = Male) and saved as files in `public/audio/alef-bet/hila/` and `/avri/` (about 2 MB). `src/lib/alef-bet/audio-manifest.json` lists which clips exist per voice; a clip missing from it just has no button. Generated by `scripts/alef-bet-audio/generate.mjs` (key and region from the environment, never stored; `--dry-run`, `--only id --redo` to remake one clip; also writes `docs/alef-bet-audio.md`). The owner listened to samples and approved the voices. **Still to do: a Hebrew speaker should listen to every clip** (single letters and syllables are the likeliest to be wrong) and check Azure's terms on bundling the audio before a wide launch.
- **Voice:** the speaker buttons play the person's app-wide **Voice** setting (Settings, Sound: `loadSettings(...).speechVoice`, saved to `profiles.speech_voice`, female = Hila, male = Avri, falls back to female if the column is missing). The card page reads it and passes it down; there is no switch on the Alef-bet page any more. An earlier temporary on-page switch kept its choice in localStorage (`milim-alef-voice`); that key is now simply ignored.
- **The letter card (owner's design, 2026-11):** Print and Script panels both show a letter's dotted and undotted forms side by side (bet/vet, kaf/khaf/ך, pe/fe/ף, shin/sin; `forms`); the names are a pair with a speaker each (`name2`). Below, a **Nikud (ניקוד) list down the page**: five rows in order (a, e, i, o, u), one cell per form of the letter, each cell showing the letter with **all the usual signs** (patach+kamatz, tsere+segol, hiriq, holam+vav-holam, kubutz+shuruk) and **one speaker per cell** (tap the cell to hear it; `nikudRows` in `src/lib/alef-bet/letters.ts`). Vav and yod only get the plain signs. No picker, no Latin syllable boxes, no English example words ("b as in bat"), no "Heads up" boxes. Then **three example words** per card (71 distinct), the taught letter highlighted, a speaker each (row, left to right: speaker, English, Hebrew, because Hebrew is read right to left), shown with nikud/transliteration per Settings (`examples`; unverified: a Hebrew speaker should check the words). The 6 vowel cards keep a simple row per sign; the shva has no speaker (`Sound.silent`: it is usually silent, in some words a very short e). A word is a clip shared by every card that uses it (`wordClipId`).
- **How the audio is made (chosen by ear, 2026-11):** Azure is given plain Hebrew for almost everything. A **letter name** is the letter with the two dots (shva) under it; shin is שְׁ. A **letter's sound** is the letter (with its dot) with each of a, e, i, o, u (`soundClipId`, `<card>-sound-<n>-<vowel>`). **Words** the owner found fine keep their vowel marks; the words added later (and gan, dag, tut) are said as everyday spelling without vowel marks (`Example.say`), except boker, melekh, sefer and shem, which sounded wrong plain and are said with their vowel marks. The vav card's words are rose, curtain and pink (loan words like video were rejected as too foreign), tut after the carrier word זה which is cut off with ffmpeg (`generate.mjs`). **Exceptions that needed guidance** (`NAME_HINT` in letters.ts): the names bet, vet, kaf, khaf, pe, fe, sin, vav, lamed, ayin carry a pronunciation hint in standard phonetic symbols (a lone letter that can be a one-letter word is read as that word otherwise). 237 clips per voice. The temporary review page was deleted (2026-11); `/audio` is not a public path any more. Perakh is now said with its vowel marks; tut means "strawberry" on the cards (the Basic Words Pack's own definition is separate, in the Pack).
- **Layout rules (owner, 2026-11), apply to every row:** Hebrew sits to the right of English; the speaker is at the right end of the row (in the Nikud list the Hebrew sits right next to it); anything with two forms runs in Hebrew order (bet on the right, vet on the left: Print panel, name row, Nikud columns); Print is on the right, Script on the left; the vowel tiles on the Alef-bet page run right to left like the letters. Example words: English, Hebrew, speaker. Vowel rows: sound and note, sign, speaker.
- **Notes (הערות) list** on letter cards between Nikud and Example words (`NOTES` / `notesFor` in letters.ts): plain lines, English left, the form it is about on the right (alef and ayin silent, vav and yod also write vowels, final forms, the dot on bet / kaf / pe / shin, chet, he, resh). The vowel cards keep the word "Vowel" (owner's choice).
- **Spelling convention** (same as the rest of the app, see `src/lib/ai/anthropic.ts`): ח = "ch", כ = "kh", צ = "ts", ש = "sh". So chet (card id stays `khet`), chatul, chalon, chalav, lechem, tapuach, sameach, perach, kerach, shulchan; kaf / khaf, melekh and brakha keep kh. The recordings were renamed, not remade (the voice reads the Hebrew).
- The web address follows the card as Next / Previous are pressed (`history.replaceState`), so a reload stays on the same card and Back still closes the cards.
- Sound clips are public static files (served without a sign-in check, `src/proxy.ts` skips `.mp3`) and the phone keeps them for a day (`headers()` in next.config.ts). **When any clip is regenerated under the same file name, bump `CLIP_VERSION` in `src/lib/alef-bet/audio-clips.ts`** (it is added to every clip address as `?v=`), otherwise phones keep the old recording for up to a day. Renamed or removed clip files give a 404 to a tab still running an older version of the page; a reload fixes it.
- **Unverified (2026-11-20):** the address changing by hand with `history.replaceState` while a card is open as a pop-up over `/alef-bet`. Next.js documents `replaceState` as supported, but nothing was tried in a signed-in browser. Check: open a card from `/alef-bet`, press Next twice, press X (it should return to the Alef-bet page), then reload a card address. If the pop-up ever misbehaves, remove the `replaceState` effect in `card-runner.tsx`. The khaf name clip (`kaf-name2`, hint `ˈxaf`) was redone in both voices and has not been checked by a Hebrew speaker.
- Tests: `npm test` (tests/alef-bet.test.mjs) checks the card data, the notes, the spelling convention and that the manifest matches the files. It does not listen to audio.
- Cleanup for the owner: an earlier version created `alef_cards_seen`; it is unused now. Optional SQL: `drop table if exists public.alef_cards_seen;` (run once the simplified page is live).

## App icon (built; no SQL)
- Favicon and phone icon: a blue (`#2E6C99`) rounded square with a cream (`#FFF0D6`) מ, Heebo ExtraBold turned into a path (no font needed). Files: `src/app/icon.svg` (master), `src/app/favicon.ico` (16/32/48), `src/app/apple-icon.png` (180, full-bleed). Next writes the tags itself; the browser bar colour (`themeColor` in `src/app/layout.tsx`) is now the same blue. Rebuild or swap the font with `scripts/icons/make-icons.py`.
- No web app manifest or 192/512/maskable icons yet (the brief says only add them if the app should install to a phone home screen). If wanted: add `src/app/manifest.ts`, the three PNGs, and add `webmanifest` to the skip list in `src/proxy.ts` so signed-out visitors can fetch it.
- Not checked: how it looks on a real phone or in Safari's tab bar.
