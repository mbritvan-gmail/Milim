import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const HOME = "/home";
const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "recovery", "invite", "email_change"];

function failure(origin: string) {
  return NextResponse.redirect(`${origin}/login?error=link`, { status: 303 });
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Landing point for the link in the sign-in email.
//
// Mail apps and security scanners often open ("prefetch") links in the background, which would
// use up a one-time sign-in token before the person taps it. So opening the link only shows a
// "Sign in" button; the token is used when that button is pressed (see POST below).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  // After signing in, everyone lands on Home (a "next" address in an older link is ignored).
  const next = HOME;

  if (tokenHash && type && OTP_TYPES.includes(type as EmailOtpType)) {
    const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="referrer" content="no-referrer">
<title>Sign in · milim</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;
         background: #0b0f17; color: #e8edf5; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 360px; text-align: center; }
  h1 { margin: 0; font-size: 56px; color: #7aa8ff; font-weight: 700; }
  p { color: #8b98ad; line-height: 1.5; }
  .name { margin: 4px 0 24px; font-size: 20px; font-weight: 600; color: #e8edf5; }
  button { width: 100%; height: 52px; border: 0; border-radius: 12px; background: #7aa8ff; color: #0b0f17; font-size: 17px; font-weight: 600; cursor: pointer; }
  button:hover { background: #5b8def; }
  small { display: block; margin-top: 16px; color: #8b98ad; font-size: 12px; }
</style></head>
<body><main>
  <h1>מילים</h1>
  <p class="name">milim</p>
  <form method="post" action="/auth/confirm">
    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}">
    <input type="hidden" name="type" value="${escapeHtml(type)}">
    <input type="hidden" name="next" value="${escapeHtml(next)}">
    <button type="submit">Sign in to milim</button>
  </form>
  <small>One tap to finish signing in. This extra step stops email apps from using up your link.</small>
</main></body></html>`;
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
        "x-robots-tag": "noindex",
      },
    });
  }

  // PKCE style link (older emails): it only works in the browser that asked for it, so a
  // background scanner can't use it up.
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`, { status: 303 });
    } catch (error) {
      console.error("auth confirm (code) failed", error);
    }
  }
  return failure(origin);
}

// The "Sign in" button: this is where the one-time token is actually used.
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
  try {
    const form = await request.formData();
    const tokenHash = String(form.get("token_hash") ?? "");
    const type = String(form.get("type") ?? "");
    const next = HOME;
    if (!tokenHash || !OTP_TYPES.includes(type as EmailOtpType)) return failure(origin);

    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    if (error) return failure(origin);
    return NextResponse.redirect(`${origin}${next}`, { status: 303 });
  } catch (error) {
    console.error("auth confirm (verify) failed", error);
    return failure(origin);
  }
}
