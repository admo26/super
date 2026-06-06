import { NextResponse, type NextRequest } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set(["/login", "/auth/callback", "/unauthorized"]);

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export async function proxy(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  const email = user?.email ?? null;
  const isAllowed = isAllowedAuthEmail(email);

  if (PUBLIC_PATHS.has(pathname)) {
    if (user && isAllowed) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (user && !isAllowed && pathname !== "/unauthorized") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return response;
  }

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!isAllowed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "This account is not authorized." }, { status: 403 });
    }

    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
