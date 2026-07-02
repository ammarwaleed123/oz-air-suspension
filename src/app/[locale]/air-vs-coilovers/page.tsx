import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getExplainer } from "@/content/air-vs-coilovers";

// NOTE: body copy is DRAFT content (see src/content/air-vs-coilovers.ts).
export default async function AirVsCoiloversPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const content = getExplainer(typedLocale);
  const base = `/${typedLocale}`;

  return (
    <div className="grow bg-ink text-surface">
      <article className="mx-auto max-w-2xl px-4 py-14 sm:py-20">
        <header className="border-b border-white/10 pb-8">
          <p className="cat-label">{dict.nav.airVsCoilovers}</p>
          <h1 className="display mt-2 text-4xl uppercase leading-[0.95] sm:text-6xl">
            {content.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-surface/70">
            {content.intro}
          </p>
        </header>

        <div className="mt-10 space-y-10">
          {content.sections.map((s, i) => (
            <section key={i}>
              <h2 className="display text-2xl uppercase sm:text-3xl">{s.heading}</h2>
              {s.body.map((p, j) => (
                <p key={j} className="mt-3 leading-relaxed text-surface/80">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {/* Quick comparison table */}
        <section className="mt-12">
          <h2 className="display text-2xl uppercase sm:text-3xl">{dict.compare.title}</h2>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.04]">
                  <th className="px-5 py-3 text-start text-xs font-semibold uppercase tracking-wider text-surface/50">
                    {dict.compare.feature}
                  </th>
                  <th className="w-20 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-accent sm:w-28">
                    {dict.compare.air}
                  </th>
                  <th className="w-20 px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-accent sm:w-28">
                    {dict.compare.coil}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[
                  { label: dict.compare.rideHeight, air: true, coil: false },
                  { label: dict.compare.trackPerf, air: false, coil: true },
                  { label: dict.compare.dailyComfort, air: true, coil: true },
                  { label: dict.compare.lowMaintenance, air: false, coil: true },
                  { label: dict.compare.parkedStance, air: true, coil: false },
                  { label: dict.compare.lowerPrice, air: false, coil: true },
                ].map((r) => (
                  <tr key={r.label}>
                    <td className="px-5 py-4 text-surface">{r.label}</td>
                    <td className="px-4 py-4 text-center">{r.air ? <YesIcon /> : <NoIcon />}</td>
                    <td className="px-4 py-4 text-center">{r.coil ? <YesIcon /> : <NoIcon />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-lg font-medium">{content.closing}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`${base}/air-kits`}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
            >
              {dict.nav.airKits}
            </Link>
            <Link
              href={`${base}/coilovers`}
              className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-surface transition-colors hover:border-accent"
            >
              {dict.nav.coilovers}
            </Link>
            <Link
              href={`${base}/request-car`}
              className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-surface transition-colors hover:border-accent"
            >
              {dict.nav.requestCar}
            </Link>
          </div>
        </footer>
      </article>
    </div>
  );
}

function YesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-accent" aria-label="Yes">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function NoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-surface/30" aria-label="No">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
