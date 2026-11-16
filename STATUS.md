# Milim: where we left off

Last updated: 2026-11-16 (login verified). Branch: `claude/milim-handoff-review-pmh51c`. Live preview: https://milim-seven.vercel.app

## Done
- Product decisions locked (see README "Rules baked into the database").
- Next.js 16 app, dark/soft-blue theme, Heebo Hebrew font.
- Supabase project created; migration `supabase/migrations/20261116000000_initial_schema.sql` applied (13 tables + `master_dictionary` view).
- Vercel project deployed from this branch.
- Magic-link login coded: `/login`, `/auth/confirm`, `/auth/signout`, protected `/songs`, and `src/proxy.ts`.
  - The site root forwards `/?code=...` to `/auth/confirm`, so sign-in works even if Supabase's redirect allow-list is off.
- Vercel environment variables set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production). Old stray variable named `default` should be deleted.

## Verified
- Full magic-link sign-in works on https://milim-seven.vercel.app via Resend SMTP (sender milim@britvan.net),
  using the custom Magic Link template that points at `/auth/confirm?token_hash=...`.

## Built, awaiting live test (needs the real Anthropic key + Supabase on the deployed site)
- `/songs/new`: paste Hebrew lyrics (+ title, artist, optional Spotify/YouTube link, private/public) -> Claude translates lines,
  adds transliteration, and extracts key vocab -> saved to Supabase -> `/songs/[id]`.
- `/songs/[id]`: tap a line to reveal English, "show all", pronunciation (transliteration) toggle saved to the profile, key words list, embedded player.
- AI layer: `src/lib/ai/` (provider interface; `AnthropicProvider`; model from `AI_MODEL`, default `claude-sonnet-5-5`).
  Long songs are split into 25-line chunks processed in parallel; replies are schema-validated (Zod) with one retry.
- Safeguards: 15 new songs per user per 24h, 100 lines / 12,000 characters per song, non-Hebrew lines ignored.
- Unit-checked locally with a stubbed AI client (chunking, merging, retries, refusals). NOT yet run against the real API or database.
- No server-side refusal fallback is configured (lyrics are benign); refusals show a friendly error.

## Next steps, in order
1. Live test on the deployed site: add a short song, check translations/vocab/transliteration; fix whatever the real API or database shows.
2. Edit/regenerate translations, tap a word to add key vocab, remove vocab (owner only).
3. Per-song quiz (cached distractors in `quiz_options`), results + retakes, Leitner flashcards, Master Dictionary page.
4. Libraries, public library page, edit suggestions + owner approval.
5. Custom domain `milim.britvan.net`: add it in Vercel, then a CNAME in Namecheap (host `milim`, value shown by Vercel).
   Then change Supabase Site URL / Redirect URLs to the new domain.
6. Housekeeping: delete the stray Vercel variable named `default` if still present.

## Notes
- Friends-and-family scale for now. Tighten rules (vocab insert policy, moderation) before a wider rollout.
- Do not share the Supabase `sb_secret_...` key anywhere. It isn't needed yet.
- Dashboard menu names in Supabase and Vercel change often; when unsure, send a screenshot.
