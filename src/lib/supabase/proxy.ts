import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "./env";

// Routes anyone can open without signing in.
const PUBLIC_PATHS = ["/", "/login", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)),
  );
}

// Refreshes the Supabase session cookie on each request, and sends signed-out
// visitors to /login when they open a protected page.
export async function updateSession(request: NextRequest) {
  // If Supabase sends a magic-link code to the site root (when the redirect URL
  // isn't on its allow-list it falls back to the Site URL), hand it to the page
  // that completes the sign-in.
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  // Without Supabase settings (e.g. a deploy before env vars are added) keep the
  // public pages working instead of crashing.
  if (!supabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the session with Supabase; don't trust getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const redirectTo = (path: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed session cookies on the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  // The sign-in screen is the landing page.
  if (pathname === "/") {
    return redirectTo(user ? "/songs" : "/login");
  }

  if (!user && !isPublic(pathname)) {
    return redirectTo("/login", `?next=${encodeURIComponent(pathname)}`);
  }
  if (user && pathname === "/login") {
    return redirectTo("/songs");
  }

  return response;
}
