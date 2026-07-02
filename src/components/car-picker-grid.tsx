import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localizedName } from "@/lib/catalog";
import { ProductImage } from "./product-image";

type PickerCar = {
  slug: string;
  nameEn: string;
  nameAr: string;
  yearStart: number | null;
  yearEnd: number | null;
  imageUrl?: string | null;
};

// Shared car picker used by both Air Kits and Coilovers. `basePath` is the
// localized section root (e.g. "/ar/air-kits"); each card links to
// `${basePath}/${slug}`.
export function CarPickerGrid({
  cars,
  basePath,
  locale,
  emptyLabel,
  tone = "light",
}: {
  cars: PickerCar[];
  basePath: string;
  locale: Locale;
  emptyLabel: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  if (cars.length === 0) {
    return (
      <p className={`py-12 ${dark ? "text-surface/60" : "text-ink/60"}`}>
        {emptyLabel}
      </p>
    );
  }

  const card = dark
    ? "flex h-full flex-col rounded-xl border border-white/10 bg-coal p-5 transition-colors hover:border-accent"
    : "flex h-full flex-col rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent";
  const name = dark ? "text-lg font-semibold text-surface" : "text-lg font-semibold";
  const yearC = dark ? "mt-1 text-sm text-surface/50" : "mt-1 text-sm text-ink/50";

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => {
        const years =
          car.yearStart && car.yearEnd
            ? `${car.yearStart}–${car.yearEnd}`
            : car.yearStart
              ? `${car.yearStart}+`
              : null;
        return (
          <li key={car.slug}>
            <Link href={`${basePath}/${car.slug}`} className={`group ${card}`}>
              <div className="mb-3 overflow-hidden rounded-lg">
                <ProductImage
                  src={car.imageUrl}
                  alt={localizedName(car, locale)}
                />
              </div>
              <span className={name}>{localizedName(car, locale)}</span>
              {years && <span className={yearC}>{years}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
