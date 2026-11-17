# Milim: where we left off

Last updated: 2026-11-16 (login verified). Branch: `claude/milim-handoff-review-pmh51c`. Live preview: https://milim-seven.vercel.app

## TO DO FIRST (user)
- Run `supabase/migrations/20261124000000_song_nikud.sql` (adds `lines.vocalized`, for the Add nikud button on songs).
- Run `supabase/migrations/20261122000000_vocabulary_modules.sql` too (vocabulary modules: tables, nikud / gender / plural columns, Dictionary view). Run the conjugation one first.
- Run `supabase/migrations/20261120000000_conjugation.sql` in the Supabase SQL editor (Show nikud setting + saved verb conjugations).

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
- Study `/flashcards` (not in the tab bar): `?filter=new|learning|learned|all`, `?song=ID&scope=unlearned|learned`. Tap the card to reveal.
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
- Songs has two views, **My songs** and **Public library** (`/songs`, `/library`). `/flashcards` with nothing chosen is the Flash Cards home (New / Still learning / Learned / All, with counts).
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
- Settings, a Dictionary word, a vocabulary module, a study session / the Flash Cards start screen and a quiz open as full-screen pop-ups over the page you were on, with an X (also Escape and the browser Back button). Built with Next.js intercepting + parallel routes: `src/app/(app)/@modal/(.)settings`, `(.)flashcards`, `(.)dictionary/[id]`, `(.)songs/[id]/quiz`, the shared `src/components/overlay.tsx`, and the `modal` slot in `src/app/(app)/layout.tsx`.
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
- Module page (`/vocabulary/[id]`): read-only preview (nikud / pronunciation follow the settings), **Add module** puts its words in the Dictionary (`user_modules`), then **Start flashcards** (`/flashcards?module=ID`, `&scope=all` to review everything). Owners get Edit like songs: rename, remove a word (confirm + Undo), add more words by pasting, Make public (one-way), Remove module (delete private / archive public / remove from list).
- Same rules as songs: public is permanent, public modules are archived not deleted. Dictionary = songs + added modules (`master_dictionary` view). Not built yet: suggestions from other people, nikud for song words, "N new words" version updates, a "From the X module" line on cards, nikud in the Dictionary list rows.
- If the SQL hasn't been run, the Vocabulary page says so instead of failing, and everything else keeps working.

## Nikud for songs (built; REQUIRES `supabase/migrations/20261124000000_song_nikud.sql`; not yet live-tested with the AI)
- Owners get an **Add nikud** button when editing a song (only while some lines or words still lack it). Claude adds nikud to every lyric line (`lines.vocalized`) and every Song Vocabulary word (`vocab_entries.vocalized`, via `fill_word_extras`); an answer is only accepted if it is the original text with vowel marks added (`isPointedVersion`), so the words can never change.
- Lyrics, Song Vocabulary, flashcards and the Dictionary word page follow the Show nikud switch where nikud exists; edit mode keeps plain text. Editing a line's Hebrew clears that line's saved nikud. New songs are not given nikud automatically yet.

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
10. Housekeeping: delete the stray Vercel variable named `default`; lowercase "milim" in the Supabase email template.

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
