"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

// Hamburger menu shown only below the `lg` breakpoint. Toggles a panel that
// lists the section links; closes on navigation or when the backdrop is hit.
export function MobileNav({
  links,
  menuLabel,
  closeLabel,
  whatsappHref,
  whatsappExternal,
  whatsappLabel,
}: {
  links: NavLink[];
  menuLabel: string;
  closeLabel: string;
  whatsappHref: string;
  whatsappExternal: boolean;
  whatsappLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? closeLabel : menuLabel}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-surface"
      >
        {/* Three-line icon, or an X when open. */}
        <span className="relative block h-4 w-5">
          <span
            className={`absolute inset-x-0 top-0 h-0.5 bg-surface transition-transform ${
              open ? "top-1.5 rotate-45" : ""
            }`}
          />
          <span
            className={`absolute inset-x-0 top-1.5 h-0.5 bg-surface transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute inset-x-0 top-3 h-0.5 bg-surface transition-transform ${
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
            className="fixed inset-0 z-40 bg-black/60"
          />
          <nav className="absolute inset-x-0 top-full z-50 border-b border-white/10 bg-ink text-surface shadow-2xl">
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
                        active
                          ? "font-semibold text-accent"
                          : "text-surface/80"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
              <li className="px-4 py-3">
                <a
                  href={whatsappHref}
                  target={whatsappExternal ? "_blank" : undefined}
                  rel={whatsappExternal ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className="block rounded-md bg-accent px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-white"
                >
                  {whatsappLabel}
                </a>
              </li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
