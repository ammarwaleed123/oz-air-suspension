import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const base = `/${locale}`;
  const links = [
    { href: `${base}/air-kits`, label: dict.nav.airKits },
    { href: `${base}/coilovers`, label: dict.nav.coilovers },
    { href: `${base}/rims`, label: dict.nav.rims },
    { href: `${base}/builds`, label: dict.nav.builds },
    { href: `${base}/air-vs-coilovers`, label: dict.nav.airVsCoilovers },
    { href: `${base}/request-car`, label: dict.nav.requestCar },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={base} className="text-lg font-bold tracking-tight">
          {dict.meta.siteName}
        </Link>

        <nav className="hidden items-center gap-5 text-sm md:flex">
          {links.map((l) => (
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
          <Link href={`${base}/cart`} className="text-sm font-medium">
            {dict.nav.cart}
          </Link>
          <Link href={`${base}/account`} className="text-sm font-medium">
            {dict.nav.account}
          </Link>
          <LocaleSwitcher current={locale} />
        </div>
      </div>
    </header>
  );
}
