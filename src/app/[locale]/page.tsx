import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getAirKitCars, getActiveBuilds } from "@/db/queries";
import { localizedName } from "@/lib/catalog";
import { FindMyBuild } from "@/components/find-my-build";

export const dynamic = "force-dynamic";

// Manual image override: if a file named `<base>.{jpg,png,webp,…}` exists in
// `public/brand/`, the home page uses it. Otherwise it falls back to whatever
// is passed (a build photo). This lets the owner swap home-page imagery by just
// dropping a file in — no code change needed. See README "Home page images".
function homeImage(base: string, fallback: string | null): string | null {
  for (const ext of ["jpg", "jpeg", "png", "webp", "avif"]) {
    const rel = `/brand/${base}.${ext}`;
    if (existsSync(join(process.cwd(), "public", rel))) return rel;
  }
  return fallback;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const base = `/${typedLocale}`;
  const h = dict.home;

  // Real data: cars that actually have an air kit (the picker), and the public
  // builds showcase (teaser). Both come straight from the database — fetched in
  // parallel so it's one round-trip's latency, not two.
  const [cars, builds] = await Promise.all([
    getAirKitCars(),
    getActiveBuilds(),
  ]);

  // Each of these can be overridden by dropping a file in public/brand/
  // (home-hero.*, home-airkit.*, home-coilover.*, home-rim.*, home-guide.*).
  // Until then they fall back to the cinematic build photos.
  const heroImage = homeImage("home-hero", builds[0]?.imageUrl ?? null);
  const guideImage = homeImage(
    "home-guide",
    builds[1]?.imageUrl ?? builds[0]?.imageUrl ?? null
  );

  const categories = [
    { href: `${base}/air-kits`, title: dict.airKits.title, sub: dict.airKits.subtitle, img: homeImage("home-airkit", builds[0]?.imageUrl ?? null) },
    { href: `${base}/coilovers`, title: dict.coilovers.title, sub: dict.coilovers.subtitle, img: homeImage("home-coilover", builds[1]?.imageUrl ?? null) },
    { href: `${base}/rims`, title: dict.rims.title, sub: dict.rims.subtitle, img: homeImage("home-rim", builds[2]?.imageUrl ?? null) },
  ];

  const trust = [
    { label: h.trustAuthorizedLabel, text: h.trustAuthorizedText },
    { label: h.trustPrecisionLabel, text: h.trustPrecisionText },
    { label: h.trustWarrantyLabel, text: h.trustWarrantyText },
  ];

  return (
    <div className="grow bg-ink text-surface">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/40" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-20 sm:pt-28">
          <span className="loc-tag inline-block bg-accent px-3 py-1.5">
            {h.locationTag}
          </span>
          <h1 className="display mt-5 text-6xl uppercase sm:text-8xl">
            {h.heroTitle}
          </h1>
          <p className="mt-5 max-w-xl text-base text-surface/70 sm:text-lg">
            {h.heroSubtitle}
          </p>

          <div className="mt-8 max-w-3xl">
            <FindMyBuild
              cars={cars.map((c) => ({
                slug: c.slug,
                make: typedLocale === "ar" ? c.brandAr : c.brandEn,
                model: c.model,
                yearStart: c.yearStart,
                yearEnd: c.yearEnd,
              }))}
              basePath={`${base}/air-kits`}
              labels={{
                selectMake: h.selectMake,
                selectModel: h.selectModel,
                year: h.yearLabel,
                findMyBuild: h.findMyBuild,
                empty: h.pickerEmpty,
                requestYourCar: h.requestYourCar,
                requestHref: `${base}/request-car`,
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────── */}
      <section className="border-y border-white/10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
          {trust.map((t) => (
            <div key={t.label} className="px-4 py-5 text-center">
              <p className="cat-label">{t.label}</p>
              <p className="mt-1 text-sm text-surface/70">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pick your path ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <p className="cat-label">{h.pickPathLabel}</p>
        <h2 className="display mt-2 text-4xl uppercase sm:text-5xl">
          {h.pickPathTitle}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group relative flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-xl border border-white/10 bg-coal"
            >
              {c.img && (
                <Image
                  src={c.img}
                  alt={c.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              )}
              {/* Readability + a subtle red wash that deepens on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-transparent" />
              <div className="absolute inset-0 bg-accent/0 transition-colors duration-500 group-hover:bg-accent/10" />
              <div className="relative p-6">
                <h3 className="display text-3xl">{c.title}</h3>
                <p className="mt-2 text-sm text-surface/70">{c.sub}</p>
                <span className="mt-4 inline-block text-sm font-bold uppercase tracking-wide text-accent">
                  {h.explore}{" "}
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 rtl:hidden">
                    →
                  </span>
                  <span className="hidden transition-transform duration-300 group-hover:-translate-x-1 rtl:inline">
                    ←
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent builds (real) ─────────────────────────────────── */}
      {builds.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="cat-label">{h.buildsLabel}</p>
              <h2 className="display mt-2 text-4xl uppercase sm:text-5xl">
                {h.buildsTitle}
              </h2>
              <p className="mt-2 text-sm text-surface/60">{h.buildsSub}</p>
            </div>
            <Link
              href={`${base}/builds`}
              className="shrink-0 text-sm font-bold uppercase tracking-wide text-accent hover:underline"
            >
              {h.viewAll} <span className="rtl:hidden">→</span>
              <span className="hidden rtl:inline">←</span>
            </Link>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {builds.slice(0, 3).map((b) => {
              const title = localizedName(
                { nameEn: b.titleEn, nameAr: b.titleAr },
                typedLocale
              );
              return (
                <li key={b.id}>
                  <Link href={`${base}/builds`} className="group block">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-coal">
                      <Image
                        src={b.imageUrl}
                        alt={title}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="cat-label">{b.year}</p>
                        <p className="display text-2xl">{title}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Air or Coilovers? teaser ─────────────────────────────── */}
      <section className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 sm:py-20 md:grid-cols-2">
          <div>
            <p className="cat-label">{h.guideLabel}</p>
            <h2 className="display mt-2 text-4xl uppercase sm:text-5xl">
              {h.guideTitle}
            </h2>
            <p className="mt-4 text-surface/70">{h.guideSub}</p>
            <ul className="mt-5 space-y-2 text-sm text-surface/80">
              <li className="flex gap-2">
                <span className="text-accent">▪</span>
                {h.guideAir}
              </li>
              <li className="flex gap-2">
                <span className="text-accent">▪</span>
                {h.guideCoil}
              </li>
            </ul>
            <Link
              href={`${base}/air-vs-coilovers`}
              className="mt-7 inline-block rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
            >
              {h.readGuide} <span className="rtl:hidden">→</span>
              <span className="hidden rtl:inline">←</span>
            </Link>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10 bg-coal">
            {guideImage && (
              <Image
                src={guideImage}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-80"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
