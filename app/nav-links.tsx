"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type NavLinksProps = {
  nextPlanDate: string | null;
};

const links = [
  { href: "/cadence", label: "Planner" },
  { href: "/recipes", label: "Recipes" },
  { href: "/history", label: "History" },
  { href: "/import", label: "Import" }
];

export function NavLinks({ nextPlanDate }: NavLinksProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedWeek = searchParams.get("week");

  return (
    <nav className="site-links" aria-label="Main navigation">
      <Link className={pathname === "/" && !selectedWeek ? "site-link site-link--active" : "site-link"} href="/">
        Current
      </Link>
      {nextPlanDate ? (
        <Link
          className={pathname === "/" && selectedWeek === nextPlanDate ? "site-link site-link--active" : "site-link"}
          href={`/?week=${nextPlanDate}`}
        >
          Next
        </Link>
      ) : null}
      {links.map((link) => (
        <Link
          className={pathname === link.href ? "site-link site-link--active" : "site-link"}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
