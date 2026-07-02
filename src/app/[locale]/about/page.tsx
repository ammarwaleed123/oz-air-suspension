import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import {
  shopWhatsAppNumber,
  toWhatsAppDigits,
  whatsAppLink,
} from "@/lib/receipt";

export const dynamic = "force-dynamic";

// Owner drops a photo at public/brand/about-hero.{jpg,png,webp,…} and it shows
// beside the title. Until then the hero is text-only (no broken image).
function aboutHero(): string | null {
  for (const ext of ["jpg", "jpeg", "png", "webp", "avif"]) {
    const rel = `/brand/about-hero.${ext}`;
    if (existsSync(join(process.cwd(), "public", rel))) return rel;
  }
  return null;
}

// The real Google Maps location for the shop (resolved from the owner's link
// https://maps.app.goo.gl/TgeKWSV7q1tUmUui9 → "Abanob Oz, First 6th of October").
const MAP_PLACE = "XW3P+7WV Abanob Oz, First 6th of October, Giza Governorate";
const MAP_EMBED =
  "https://www.google.com/maps?q=" +
  encodeURIComponent(MAP_PLACE) +
  "&output=embed";
const MAP_LINK = "https://maps.app.goo.gl/TgeKWSV7q1tUmUui9";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const a = dict.about;

  const heroImg = aboutHero();
  const shopNumber = shopWhatsAppNumber();
  const waDigits = toWhatsAppDigits(shopNumber);
  const waHref = waDigits
    ? whatsAppLink(shopNumber, "")
    : `/${typedLocale}/request-car`;
  const telHref = shopNumber ? `tel:${shopNumber.replace(/\s/g, "")}` : undefined;
  const displayNumber = shopNumber || "—";

  return (
    <div className="grow bg-ink text-surface">
      {/* ── Editorial hero ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:pt-24">
        <div className={heroImg ? "grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center" : ""}>
          <div>
            <p className="cat-label">{a.label}</p>
            <h1 className="display mt-3 max-w-4xl text-5xl uppercase sm:text-7xl">
              {a.title}
            </h1>

            {/* Story — explicitly flagged as placeholder so it's never mistaken
                for the shop's real history. */}
            <div className="mt-8 max-w-2xl">
              <span className="inline-block rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                {a.placeholderTag}
              </span>
              <p className="mt-4 text-surface/70">{a.story1}</p>
              <p className="mt-3 text-surface/70">{a.story2}</p>
            </div>
          </div>

          {heroImg && (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="relative aspect-[4/3]">
                <Image
                  src={heroImg}
                  alt={a.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Contact block ────────────────────────────────────────── */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="cat-label">{a.contactLabel}</p>
          <h2 className="display mt-2 text-4xl uppercase sm:text-5xl">
            {a.contactTitle}
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {/* Visit */}
            <div className="rounded-xl border border-white/10 bg-coal p-6">
              <PinIcon />
              <p className="cat-label mt-4">{a.visitLabel}</p>
              <p className="mt-2 text-sm text-surface/80">
                {dict.footer.address}
              </p>
            </div>

            {/* WhatsApp */}
            <a
              href={waHref}
              target={waDigits ? "_blank" : undefined}
              rel={waDigits ? "noopener noreferrer" : undefined}
              className="group rounded-xl border border-white/10 bg-coal p-6 transition-colors hover:border-accent"
            >
              <ChatIcon />
              <p className="cat-label mt-4">{a.whatsappLabel}</p>
              <p className="mt-2 text-sm font-semibold text-accent" dir="ltr">
                {displayNumber}
              </p>
            </a>

            {/* Call */}
            <a
              href={telHref}
              className="group rounded-xl border border-white/10 bg-coal p-6 transition-colors hover:border-accent"
            >
              <PhoneIcon />
              <p className="cat-label mt-4">{a.callLabel}</p>
              <p className="mt-2 text-sm font-semibold text-accent" dir="ltr">
                {displayNumber}
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* ── Map (moved here from the footer) ─────────────────────── */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="flex items-center justify-between gap-4">
            <p className="cat-label">{a.visitLabel}</p>
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold uppercase tracking-wide text-accent hover:underline"
            >
              {a.openMap} <span className="rtl:hidden">→</span>
              <span className="hidden rtl:inline">←</span>
            </a>
          </div>
          <a
            href={MAP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block overflow-hidden rounded-xl border border-white/10"
            aria-label={a.openMap}
          >
            <iframe
              title={MAP_PLACE}
              src={MAP_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="pointer-events-none h-80 w-full"
            />
          </a>
        </div>
      </section>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-12 7.6L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5Z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden="true">
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l-1 5a2 2 0 0 1-2 1.5A15 15 0 0 1 3.5 6 2 2 0 0 1 5 4Z" />
    </svg>
  );
}
