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
    <article className="mx-auto max-w-2xl px-4 py-12">
      <header className="border-b border-black/10 pb-8">
        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          {content.intro}
        </p>
      </header>

      <div className="mt-8 space-y-8">
        {content.sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-xl font-bold">{s.heading}</h2>
            {s.body.map((p, j) => (
              <p key={j} className="mt-2 leading-relaxed text-ink/80">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <footer className="mt-10 rounded-xl bg-black/[0.03] p-6">
        <p className="text-lg font-medium">{content.closing}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href={`${base}/air-kits`} className="text-accent underline">
            {dict.nav.airKits}
          </Link>
          <Link href={`${base}/coilovers`} className="text-accent underline">
            {dict.nav.coilovers}
          </Link>
          <Link href={`${base}/request-car`} className="text-accent underline">
            {dict.nav.requestCar}
          </Link>
        </div>
      </footer>
    </article>
  );
}
