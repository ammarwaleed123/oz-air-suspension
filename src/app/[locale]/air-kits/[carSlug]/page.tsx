import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getAirKitByCarSlug } from "@/db/queries";
import { orderSetups, localizedName, type SetupType } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";

export default async function AirKitProductPage({
  params,
}: {
  params: Promise<{ locale: string; carSlug: string }>;
}) {
  const { locale, carSlug } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  const car = await getAirKitByCarSlug(carSlug);
  if (!car || !car.airKit) notFound();

  const kit = car.airKit;
  const setups = orderSetups(kit.setups);
  const isAr = typedLocale === "ar";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href={`/${typedLocale}/air-kits`}
        className="text-sm text-ink/60 hover:text-ink"
      >
        ← {dict.airKits.title}
      </Link>

      <h1 className="mt-3 text-3xl font-bold">
        {localizedName(car, typedLocale)}
      </h1>
      <p className="mt-1 text-ink/60">
        {isAr ? kit.titleAr : kit.titleEn}
      </p>

      <h2 className="mt-8 text-xl font-semibold">{dict.airKits.setups}</h2>

      {/* Comparison table — scrolls horizontally on small screens so the four
          parallel setups stay side by side. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-start">
          <thead>
            <tr>
              <th className="w-32 border-b border-black/10 p-3 text-start align-bottom text-sm font-medium text-ink/50">
                {dict.airKits.pickSetup}
              </th>
              {setups.map((s) => (
                <th
                  key={s.id}
                  className="border-b border-black/10 p-3 text-start align-bottom"
                >
                  <div className="font-semibold">
                    {dict.airKits.setupLabels[s.setupType as SetupType]}
                  </div>
                  <div className="mt-1 text-lg font-bold text-accent">
                    {formatPrice(s.pricePiastres, typedLocale)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border-b border-black/10 p-3 text-start align-top text-sm font-medium text-ink/50">
                {dict.airKits.features}
              </th>
              {setups.map((s) => {
                const features = isAr ? s.featuresAr : s.featuresEn;
                return (
                  <td
                    key={s.id}
                    className="border-b border-black/10 p-3 align-top"
                  >
                    <ul className="list-disc space-y-1 text-sm marker:text-accent ps-4">
                      {features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 rounded-lg bg-black/[0.04] p-4 text-sm text-ink/70">
        {dict.airKits.disclaimer}
      </p>
    </div>
  );
}
