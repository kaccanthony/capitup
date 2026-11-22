import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfiguration } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

const publicApplicationPaths = new Set([
  "/login",
  "/access-denied",
  "/auth/callback",
  "/api/notion/webhook",
]);

export function isProtectedApplicationPath(pathname: string) {
  return !publicApplicationPaths.has(pathname);
}

function createLoginUrl(request: NextRequest, status?: "unavailable") {
  const loginUrl = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  loginUrl.searchParams.set("next", nextPath);
  if (status) {
    loginUrl.searchParams.set("status", status);
  }

  return loginUrl;
}

function redirectWithCookies(sourceResponse: NextResponse, destination: URL) {
  const redirectResponse = NextResponse.redirect(destination);

  for (const cookie of sourceResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}

export async function updateSupabaseSession(request: NextRequest) {
  // Notion cannot present an app session; the webhook route validates its token/signature.
  if (request.nextUrl.pathname === "/api/notion/webhook") {
    return NextResponse.next({ request });
  }

  const configuration = getSupabasePublicConfiguration();

  if (!configuration) {
    if (isProtectedApplicationPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(createLoginUrl(request, "unavailable"));
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    configuration.url,
    configuration.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && Boolean(data?.claims?.sub);

  if (
    isProtectedApplicationPath(request.nextUrl.pathname) &&
    !isAuthenticated
  ) {
    return redirectWithCookies(response, createLoginUrl(request));
  }

  return response;
}
