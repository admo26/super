import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Grocery Plan",
  description: "Weekly grocery planning with recipes, staples, and a shareable order view."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
              <Link href="/recipes">Recipes</Link>
              <Link href="/import">Order Import</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
