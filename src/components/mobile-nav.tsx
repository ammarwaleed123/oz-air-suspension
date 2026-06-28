"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

// Hamburger menu shown only below the `md` breakpoint. Toggles a panel that
// lists the section links; closes on navigation or when the backdrop is hit.
export function MobileNav({
  links,
  menuLabel,
  closeLabel,
}: {
  links: NavLink[];
  menuLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? closeLabel : menuLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/15"
      >
        {/* Three-line icon, or an X when open. */}
        <span className="relative block h-4 w-5">
          <span
            className={`absolute inset-x-0 top-0 h-0.5 bg-ink transition-transform ${
              open ? "top-1.5 rotate-45" : ""
            }`}
          />
          <span
            className={`absolute inset-x-0 top-1.5 h-0.5 bg-ink transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute inset-x-0 top-3 h-0.5 bg-ink transition-transform ${
              open ? "top-1.5 -rotate-45" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/20"
          />
          <nav className="absolute inset-x-0 top-full z-50 border-b border-black/10 bg-surface shadow-lg">
            <ul className="mx-auto flex max-w-6xl flex-col py-2">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`block px-4 py-3 text-base ${
                        active ? "font-semibold text-accent" : "text-ink/80"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
