"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/auth/actions";

type NavLinksProps = {
  isAuthenticated: boolean;
};

const links = [
  { href: "/cadence", label: "Plan Ahead" },
  { href: "/recipes", label: "Meal Ideas" },
  { href: "/history", label: "Past Orders" },
  { href: "/import", label: "Add Orders" }
];

export function NavLinks({ isAuthenticated }: NavLinksProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className={`site-links-shell${isOpen ? " site-links-shell--open" : ""}`}>
      <button
        type="button"
        className="site-links__toggle"
        aria-haspopup="menu"
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
        <Link className={pathname === "/" ? "site-link site-link--active" : "site-link"} href="/">
          This Week
        </Link>
        {links.map((link) => (
          <Link
            className={pathname === link.href ? "site-link site-link--active" : "site-link"}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
        <div className="site-links__auth">
          {isAuthenticated ? (
            <form action={signOut}>
              <button className="site-link site-links__auth-button" type="submit">
                Log out
              </button>
            </form>
          ) : (
            <Link className="site-link" href="/login">
              Log in
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
