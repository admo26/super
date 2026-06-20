import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";

import { signOut } from "@/app/auth/actions";
import { NavLinks } from "@/app/nav-links";
import { createClient } from "@/lib/supabase/server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Grocery Plan",
  description: "Weekly grocery planning with recipes, staples, and a shareable order view."
};

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = hasSupabaseConfig() ? await createClient() : null;
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;

  return (
    <html lang="en">
      <body>
        <header className="site-nav">
          <div className="site-nav__inner">
            <Link href="/" className="site-brand">
              Super
            </Link>
            <Suspense
              fallback={
                <nav className="site-links" aria-label="Main navigation">
                  <Link className="site-link" href="/">
                    Current
                  </Link>
                  <Link className="site-link" href="/cadence">
                    Planner
                  </Link>
                  <Link className="site-link" href="/recipes">
                    Recipes
                  </Link>
                </nav>
              }
            >
              <NavLinks isAuthenticated={Boolean(user)} />
            </Suspense>
            <div className="site-auth">
              {user ? (
                <form action={signOut}>
                  <button className="ghost-button ghost-button--small" type="submit">
                    Sign out
                  </button>
                </form>
              ) : (
                <Link href="/login">Sign in</Link>
              )}
            </div>
          </div>
        </header>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
