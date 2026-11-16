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

## Next steps, in order
1. Create an Anthropic API key (console.anthropic.com). Add it as `ANTHROPIC_API_KEY` in Vercel (Config not needed; use Secret, Production).
   Never paste it in chat. For testing from the build session, the key can be supplied through the secure credential form.
2. Build the paste-lyrics page and the Claude translation + vocab step. Provider interface under `src/lib/ai/`,
   model from `AI_MODEL` (default `claude-sonnet-5-5`).
3. Song reading view (tap to reveal English, transliteration toggle), vocab management, quiz, flashcards (Leitner),
   libraries, public library and suggestions, Spotify/YouTube embeds.
4. Custom domain `milim.britvan.net`: add it in Vercel, then a CNAME in Namecheap (host `milim`, value shown by Vercel).
   Then change Supabase Site URL / Redirect URLs to the new domain.
5. Housekeeping: delete the stray Vercel variable named `default` if still present.

## Notes
- Friends-and-family scale for now. Tighten rules (vocab insert policy, moderation) before a wider rollout.
- Do not share the Supabase `sb_secret_...` key anywhere. It isn't needed yet.
- Dashboard menu names in Supabase and Vercel change often; when unsure, send a screenshot.
