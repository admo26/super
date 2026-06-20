"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, History, LogIn, LogOut } from "lucide-react";

import { signOut } from "@/app/auth/actions";

type NavLinksProps = {
  isAuthenticated: boolean;
};

const links = [
  { href: "/cadence", label: "Plan", icon: ClipboardList },
  { href: "/history", label: "Order History", icon: History }
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
          <CalendarDays aria-hidden="true" />
          This Week
        </Link>
        {links.map((link) => (
          <Link
            className={pathname === link.href ? "site-link site-link--active" : "site-link"}
            href={link.href}
            key={link.href}
          >
            <link.icon aria-hidden="true" />
            {link.label}
          </Link>
        ))}
        <div className="site-links__auth">
          {isAuthenticated ? (
            <form action={signOut}>
              <button className="site-link site-links__auth-button" type="submit">
                <LogOut aria-hidden="true" />
                Log out
              </button>
            </form>
          ) : (
            <Link className="site-link" href="/login">
              <LogIn aria-hidden="true" />
              Log in
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
