# Milim: where we left off

Last updated: 2026-11-16. Branch: `claude/milim-handoff-review-pmh51c`. Live preview: https://milim-seven.vercel.app

## Done
- Product decisions locked (see README "Rules baked into the database").
- Next.js 16 app, dark/soft-blue theme, Heebo Hebrew font.
- Supabase project created; migration `supabase/migrations/20261116000000_initial_schema.sql` applied (13 tables + `master_dictionary` view).
- Vercel project deployed from this branch.
- Magic-link login coded: `/login`, `/auth/confirm`, `/auth/signout`, protected `/songs`, and `src/proxy.ts`.
  - The site root forwards `/?code=...` to `/auth/confirm`, so sign-in works even if Supabase's redirect allow-list is off.
- Vercel environment variables set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production). Old stray variable named `default` should be deleted.

## Not yet verified
- A full end-to-end sign-in. The last attempt hit Supabase's built-in email rate limit ("email rate limit exceeded"),
  which means the connection to Supabase works. It resets after about an hour; Resend removes the limit.

## Next steps, in order
1. **Resend SMTP** (user has a Resend account)
   - Verify the sending domain in Resend; add the SPF/DKIM DNS records in Namecheap.
   - Create a Resend API key.
   - In Supabase, Authentication -> email/SMTP settings: enter Resend SMTP details (host `smtp.resend.com`, port 465, user `resend`, password = API key).
2. **Edit the Magic Link email template** (possible once SMTP is set up) so links work across browsers:
   `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/songs">Sign in to Milim</a>`
3. In Supabase, URL Configuration: Site URL = deployed address, Redirect URLs include `<address>/**` and `http://localhost:3000/**`.
4. Test the full login end to end, then delete the stray `default` variable in Vercel if still there.
5. Build the paste-lyrics page and the Claude translation + vocab step. Provider interface under `src/lib/ai/`, model from `AI_MODEL`
   (default `claude-sonnet-5-5`). The user will add `ANTHROPIC_API_KEY` through a secure form, never in chat.
6. Song reading view (tap to reveal English, transliteration toggle), vocab management, quiz, flashcards (Leitner),
   libraries, public library and suggestions, Spotify/YouTube embeds.
7. Custom domain `milim.britvan.net`: add it in Vercel, then a CNAME in Namecheap (host `milim`, value shown by Vercel).

## Notes
- Friends-and-family scale for now. Tighten rules (vocab insert policy, moderation) before a wider rollout.
- Do not share the Supabase `sb_secret_...` key anywhere. It isn't needed yet.
- Dashboard menu names in Supabase and Vercel change often; when unsure, send a screenshot.
