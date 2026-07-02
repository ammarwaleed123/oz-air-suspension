import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { getSession } from "@/lib/auth-helpers";
import { getCartCount } from "@/lib/cart";
import { shopWhatsAppNumber, toWhatsAppDigits } from "@/lib/receipt";
import { BrandLogo } from "./brand-logo";
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
  // Owner/staff don't shop, so they get no cart at all.
  const showCart = !isAdmin;

  // Cart count for the badge (cheap count query; id comes from the JWT).
  let cartCount = 0;
  if (showCart && session?.user?.id) {
    const uid = Number(session.user.id);
    if (Number.isInteger(uid)) cartCount = await getCartCount(uid);
  }

  const waDigits = toWhatsAppDigits(shopWhatsAppNumber());
  const waHref = waDigits ? `https://wa.me/${waDigits}` : `${base}/request-car`;

  const sectionLinks = [
    { href: `${base}/air-kits`, label: dict.nav.airKits },
    { href: `${base}/coilovers`, label: dict.nav.coilovers },
    { href: `${base}/rims`, label: dict.nav.rims },
    { href: `${base}/builds`, label: dict.nav.builds },
    { href: `${base}/air-vs-coilovers`, label: dict.nav.airVsCoilovers },
    { href: `${base}/about`, label: dict.nav.about },
    { href: `${base}/request-car`, label: dict.nav.requestCar },
  ];

  // Mobile menu mirrors the section links plus account-context entries.
  const mobileLinks = [
    ...sectionLinks,
    ...(showCart
      ? [
          {
            href: `${base}/cart`,
            label:
              cartCount > 0
                ? `${dict.nav.cart} (${cartCount})`
                : dict.nav.cart,
          },
        ]
      : []),
    isAuthed
      ? { href: `${base}/account`, label: dict.nav.account }
      : { href: `${base}/login`, label: dict.nav.signIn },
    ...(isAdmin ? [{ href: `${base}/admin`, label: dict.nav.admin }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-surface backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={base} aria-label="OZ" className="shrink-0">
          <BrandLogo className="h-8 sm:h-9" priority />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          {sectionLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-surface/75 transition-colors hover:text-surface"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher current={locale} />

          {isAdmin && (
            <Link
              href={`${base}/admin`}
              className="hidden text-sm font-semibold text-accent sm:inline"
            >
              {dict.nav.admin}
            </Link>
          )}

          {/* Account icon */}
          <Link
            href={isAuthed ? `${base}/account` : `${base}/login`}
            aria-label={isAuthed ? dict.nav.account : dict.nav.signIn}
            className="hidden text-surface/80 transition-colors hover:text-surface sm:inline-flex"
          >
            <UserIcon />
          </Link>

          {/* Cart icon with count badge */}
          {showCart && (
            <Link
              href={`${base}/cart`}
              aria-label={dict.nav.cart}
              className="relative hidden text-surface/80 transition-colors hover:text-surface sm:inline-flex"
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -end-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          )}

          {/* Red WhatsApp CTA */}
          <a
            href={waHref}
            target={waDigits ? "_blank" : undefined}
            rel={waDigits ? "noopener noreferrer" : undefined}
            className="hidden rounded-md bg-accent px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:inline-block"
          >
            {dict.nav.whatsapp}
          </a>

          <MobileNav
            links={mobileLinks}
            menuLabel={dict.common.menu}
            closeLabel={dict.common.close}
            whatsappHref={waHref}
            whatsappExternal={Boolean(waDigits)}
            whatsappLabel={dict.nav.whatsapp}
          />
        </div>
      </div>
    </header>
  );
}

function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L23 7H6" />
    </svg>
  );
}
