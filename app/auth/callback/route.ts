import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { isAllowedAuthEmail } from "@/lib/auth";

type CookieValue = {
  name: string;
  value: string;
  options?: any;
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieMap = new Map<string, string>();
  const pendingCookies: CookieValue[] = [];
  const cookieStore = await cookies();
  cookieStore.getAll().forEach(({ name, value }) => {
    cookieMap.set(name, value);
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return [...cookieMap.entries()].map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieMap.set(name, value);
            pendingCookies.push({ name, value, options });
          });
        }
      }
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  let destination = "/login";

  if (!error) {
    const user = data.session?.user ?? data.user ?? null;

    if (isAllowedAuthEmail(user?.email)) {
      destination = next;
    } else {
      await supabase.auth.signOut();
      destination = "/unauthorized";
    }
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
