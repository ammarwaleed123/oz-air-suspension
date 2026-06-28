import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { localizedName } from "@/lib/catalog";

type PickerCar = {
  slug: string;
  nameEn: string;
  nameAr: string;
  yearStart: number | null;
  yearEnd: number | null;
};

// Shared car picker used by both Air Kits and Coilovers. `basePath` is the
// localized section root (e.g. "/ar/air-kits"); each card links to
// `${basePath}/${slug}`.
export function CarPickerGrid({
  cars,
  basePath,
  locale,
  emptyLabel,
}: {
  cars: PickerCar[];
  basePath: string;
  locale: Locale;
  emptyLabel: string;
}) {
  if (cars.length === 0) {
    return <p className="py-12 text-ink/60">{emptyLabel}</p>;
  }

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
            <Link
              href={`${basePath}/${car.slug}`}
              className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent"
            >
              <span className="text-lg font-semibold">
                {localizedName(car, locale)}
              </span>
              {years && (
                <span className="mt-1 text-sm text-ink/50">{years}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
