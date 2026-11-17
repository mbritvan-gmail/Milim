# Milim: where we left off

Last updated: 2026-11-16 (login verified). Branch: `claude/milim-handoff-review-pmh51c`. Live preview: https://milim-seven.vercel.app

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
- Per-song quiz at `/songs/[id]/quiz` (verified by the user): up to 15 words (unlearned first), 4 choices, Clue button, server-graded results saved,
  Leitner updates via `record_answer`, retakes, best score on the song page. Wrong answers come from the AI once, cached in `quiz_options`.
- "Find on YouTube" on the add-lyrics form. Needs `YOUTUBE_API_KEY` in Vercel (Google Cloud -> YouTube Data API v3 key; about 100 searches/day free).
- Bottom tab bar (Songs / Cards / Dictionary). Signed-in pages live in the `src/app/(app)` route group (URLs unchanged).
- Flashcards `/flashcards`: Leitner review of due words across all songs (+ up to 10 new words per 20-card session); `?mode=all` practices anything;
  `?song=ID` studies one song's words. Missed cards come back once at the end ("second look"); only the first answer counts toward progress.
- Master Dictionary `/dictionary`: every word from the user's songs with search (Hebrew/English/pronunciation), status filters, "I know this" (`mark_word_known`),
  pronunciation switch, and shortcuts to review/practice.
- Browser-tested with fake data (flip, requeue, summary, filters, search, failure handling); the real database path is not yet exercised live.

## Public library (built; needs a live test with two accounts)
- `/library` lists every public, non-archived song with who shared it; "Add" puts it in your list (a reference, not a copy). Songs you haven't added show an
  "Add to my songs" banner. Owners of private songs can "Share in the public library" (one-way, confirmed). Public songs can be archived, never deleted.
- Database sharing rules checked against a real Postgres: others see public songs only, can add them, can't edit or share someone else's song, can't add private ones.

## Verbs
- New songs store verbs as Hebrew infinitives with English "to ..." (e.g. לאהוב / to love). Songs added earlier keep the old past-tense forms until re-added
  (or until the planned "regenerate key words" feature).

## Remaining work, in order
1. Live-test flashcards, dictionary and the public library with two real accounts. Set up `YOUTUBE_API_KEY` and test YouTube search.
2. Close sign-ups to invited people only (Supabase: turn off new sign-ups, invite friends/family), or add an allowed-email list.
3. Editing (owner only): edit a line's translation, regenerate a line or the whole song, tap a word to add it to the key words, remove key words,
   and regenerate key words (also refreshes old verbs to infinitives).
4. Dictionary upgrade (flagged by the user as needing work; scope to be defined: e.g. layout, sorting, grouping by song, word detail view).
5. User-created libraries (named collections, e.g. by genre or difficulty; tables `libraries` / `library_songs` already exist) and filing songs into them.
6. Edit suggestions on public songs, with owner approval (table `edit_suggestions` and its rules already exist).
7. Help / tips page (section names in [brackets], one line per row, public is permanent, pronunciation switch).
8. Before sharing widely: report / takedown path for public lyrics and a short terms note, Anthropic spend limit and usage watching, tighten who may add vocab entries.
9. Housekeeping: delete the stray Vercel variable named `default`; lowercase "milim" in the Supabase email template.
Later / not v1: edit lock, search across all songs, leaderboards, nikud, Spotify full playback inside the app (Web Playback SDK, Premium only).

## Notes
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
