import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { getSession } from "@/lib/auth-helpers";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const base = `/${locale}`;

  // Session is used here ONLY to decide what to show. All authorization is
  // enforced server-side on the protected pages/actions themselves.
  const session = await getSession();
  const role = session?.user?.role;
  const isAuthed = Boolean(session?.user);
  const isAdmin = role === "owner" || role === "staff";

  const sectionLinks = [
    { href: `${base}/air-kits`, label: dict.nav.airKits },
    { href: `${base}/coilovers`, label: dict.nav.coilovers },
    { href: `${base}/rims`, label: dict.nav.rims },
    { href: `${base}/builds`, label: dict.nav.builds },
    { href: `${base}/air-vs-coilovers`, label: dict.nav.airVsCoilovers },
    { href: `${base}/request-car`, label: dict.nav.requestCar },
  ];

  // Mobile menu mirrors the section links plus account-context entries.
  const mobileLinks = [
    ...sectionLinks,
    { href: `${base}/cart`, label: dict.nav.cart },
    isAuthed
      ? { href: `${base}/account`, label: dict.nav.account }
      : { href: `${base}/login`, label: dict.nav.signIn },
    ...(isAdmin ? [{ href: `${base}/admin`, label: dict.nav.admin }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-surface/90 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={base} className="text-lg font-bold tracking-tight">
          {dict.meta.siteName}
        </Link>

        <nav className="hidden items-center gap-5 text-sm md:flex">
          {sectionLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ink/80 transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href={`${base}/admin`}
              className="hidden text-sm font-medium text-accent sm:inline"
            >
              {dict.nav.admin}
            </Link>
          )}
          <Link
            href={`${base}/cart`}
            className="hidden text-sm font-medium sm:inline"
          >
            {dict.nav.cart}
          </Link>
          <Link
            href={isAuthed ? `${base}/account` : `${base}/login`}
            className="hidden text-sm font-medium sm:inline"
          >
            {isAuthed ? dict.nav.account : dict.nav.signIn}
          </Link>
          <LocaleSwitcher current={locale} />
          <MobileNav
            links={mobileLinks}
            menuLabel={dict.common.menu}
            closeLabel={dict.common.close}
          />
        </div>
      </div>
    </header>
  );
}
