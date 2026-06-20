"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, selectedWeek]);

  return (
    <div className={`site-links-shell${isOpen ? " site-links-shell--open" : ""}`}>
      <button
        type="button"
        className="site-links__toggle"
        aria-expanded={isOpen}
        aria-controls="site-navigation"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav className="site-links" id="site-navigation" aria-label="Main navigation">
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
    </div>
  );
}
