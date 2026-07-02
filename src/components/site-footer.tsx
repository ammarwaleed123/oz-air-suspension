import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { shopWhatsAppNumber, toWhatsAppDigits } from "@/lib/receipt";
import { BrandLogo } from "./brand-logo";

export function SiteFooter({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const base = `/${locale}`;
  const f = dict.footer;
  const waDigits = toWhatsAppDigits(shopWhatsAppNumber());
  const waHref = waDigits ? `https://wa.me/${waDigits}` : `${base}/request-car`;

  const shopLinks = [
    { href: `${base}/air-kits`, label: dict.nav.airKits },
    { href: `${base}/coilovers`, label: dict.nav.coilovers },
    { href: `${base}/rims`, label: dict.nav.rims },
    { href: `${base}/builds`, label: dict.nav.builds },
    { href: `${base}/about`, label: dict.nav.about },
  ];

  return (
    <footer className="border-t border-white/10 bg-ink text-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand + description */}
          <div>
            <BrandLogo className="h-10" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-surface/60">
              {f.description}
            </p>
          </div>

          {/* Shop links */}
          <div>
            <p className="cat-label">{f.shopLabel}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {shopLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-surface/70 transition-colors hover:text-surface"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect: address, hours, WhatsApp */}
          <div>
            <p className="cat-label">{f.connectLabel}</p>
            <address className="mt-4 space-y-3 text-sm not-italic text-surface/70">
              <p>{f.address}</p>
              <a
                href={waHref}
                target={waDigits ? "_blank" : undefined}
                rel={waDigits ? "noopener noreferrer" : undefined}
                className="inline-block font-semibold text-accent hover:underline"
              >
                {f.messageWhatsapp}
              </a>
            </address>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-1 border-t border-white/10 pt-6 text-xs text-surface/45 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} OZ — {f.rights}
          </span>
          <span className="cat-label">{f.designedFor}</span>
        </div>
      </div>
    </footer>
  );
}
