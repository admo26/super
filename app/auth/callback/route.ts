import { NextResponse } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) {
    next = "/";
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Google did not return a sign-in code.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const user = data.session?.user ?? data.user ?? null;

  if (!isAllowedAuthEmail(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/unauthorized`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
