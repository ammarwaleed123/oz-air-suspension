import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCoiloversByCarSlug } from "@/db/queries";
import { localizedName, formatMonthYear } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";

export default async function CoiloverListPage({
  params,
}: {
  params: Promise<{ locale: string; carSlug: string }>;
}) {
  const { locale, carSlug } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  const car = await getCoiloversByCarSlug(carSlug);
  if (!car) notFound();

  const items = car.coilovers;
  const isAr = typedLocale === "ar";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href={`/${typedLocale}/coilovers`}
        className="text-sm text-ink/60 hover:text-ink"
      >
        ← {dict.coilovers.title}
      </Link>

      <h1 className="mt-3 text-3xl font-bold">
        {localizedName(car, typedLocale)}
      </h1>
      <p className="mt-1 text-ink/60">{dict.coilovers.title}</p>

      {items.length === 0 ? (
        <p className="mt-8 text-ink/60">{dict.coilovers.noneForCar}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((co) => (
            <li
              key={co.id}
              className="flex flex-col rounded-xl border border-black/10 bg-white p-5"
            >
              <span className="text-lg font-semibold">{co.brand}</span>
              <span className="mt-1 text-sm text-ink/50">
                {dict.common.manufactureDate}:{" "}
                {formatMonthYear(co.manufactureDate, typedLocale)}
              </span>
              {(isAr ? co.descriptionAr : co.descriptionEn) && (
                <p className="mt-2 text-sm text-ink/70">
                  {isAr ? co.descriptionAr : co.descriptionEn}
                </p>
              )}
              <span className="mt-4 text-xl font-bold text-accent">
                {formatPrice(co.pricePiastres, typedLocale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
