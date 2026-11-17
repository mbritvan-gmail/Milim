# milim

Learn Hebrew through song lyrics. Mobile-first, dark mode, Next.js (App Router) + Supabase + Claude.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the values.
3. Apply the SQL files in `supabase/migrations/`, in date order, to your Supabase project
   (Supabase CLI: `supabase db push`, or paste the file into the SQL editor).
4. `npm run dev`

## Setup checklist (deployment)

- **Supabase**: dedicated project; Authentication -> URL Configuration: Site URL `https://milim.britvan.net`,
  add `http://localhost:3000` as a redirect URL.
- **Resend**: verify the sending domain (SPF/DKIM records in Namecheap), then enter the SMTP details in
  Supabase -> Authentication -> SMTP Settings so magic links send through Resend.
- **Anthropic**: create an API key; set `ANTHROPIC_API_KEY`.
- **Vercel**: import this repo, add the env vars from `.env.example`, add the domain `milim.britvan.net`.
- **Namecheap**: CNAME, host `milim`, value shown by Vercel (usually `cname.vercel-dns.com`).

## Rules baked into the database

- Songs are `private` or `public`. Public is permanent; public songs can be archived, never hard-deleted by users.
- Only the owner edits a public song. Others submit `edit_suggestions` which the owner approves.
- A word is New, Learning or Learned. Learned = N correct answers (N is a per-person setting, 1 to 3, default 2; quiz and flashcards both count). A miss on a learned word puts it back to Learning. See `supabase/migrations/20261118000000_learning_model.sql`.
- Progress tables are per user; content tables are shared.
