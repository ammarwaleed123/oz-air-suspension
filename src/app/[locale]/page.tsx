import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";

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

  const categories = [
    {
      href: `${base}/air-kits`,
      title: dict.airKits.title,
      sub: dict.airKits.subtitle,
      cta: dict.home.browseAirKits,
    },
    {
      href: `${base}/coilovers`,
      title: dict.coilovers.title,
      sub: dict.coilovers.subtitle,
      cta: dict.home.browseCoilovers,
    },
    {
      href: `${base}/rims`,
      title: dict.rims.title,
      sub: dict.rims.subtitle,
      cta: dict.home.browseRims,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 sm:py-24">
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
          {dict.home.heroTitle}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/70">
          {dict.home.heroSubtitle}
        </p>
      </section>

      <section className="grid gap-6 pb-20 sm:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-6 transition-shadow hover:shadow-lg"
          >
            <div>
              <h2 className="text-2xl font-bold">{c.title}</h2>
              <p className="mt-2 text-ink/60">{c.sub}</p>
            </div>
            <span className="mt-6 inline-block font-semibold text-accent group-hover:underline">
              {c.cta} →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
