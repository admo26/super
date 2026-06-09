import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";

import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyPlanSummaries } from "@/lib/weekly-plan";

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

function getTodayInPacificAuckland() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = hasSupabaseConfig() ? await createClient() : null;
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;
  const planSummaries = hasSupabaseConfig() ? await getWeeklyPlanSummaries() : [];
  const today = getTodayInPacificAuckland();
  const currentPlanDate = planSummaries
    .filter((plan) => plan.orderDate <= today)
    .at(-1)?.orderDate ?? null;
  const nextPlan = currentPlanDate
    ? planSummaries.find((plan) => plan.orderDate > currentPlanDate) ?? null
    : planSummaries.at(-1) ?? null;

  return (
    <html lang="en">
      <body>
        <header className="site-nav">
          <div className="site-nav__inner">
            <Link href="/" className="site-brand">
              Super
            </Link>
            <nav className="site-links">
              <Link href="/">Current Week</Link>
              {nextPlan ? <Link href={`/?week=${nextPlan.orderDate}`}>Next Week</Link> : null}
              <Link href="/cadence">Cadence</Link>
              <Link href="/recipes">Recipes</Link>
              <Link href="/history">Order History</Link>
              <Link href="/import">Order Import</Link>
            </nav>
            <div className="site-auth">
              {user ? (
                <>
                  <span className="site-user">{user.email}</span>
                  <form action={signOut}>
                    <button className="ghost-button ghost-button--small" type="submit">
                      Sign out
                    </button>
                  </form>
                </>
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
