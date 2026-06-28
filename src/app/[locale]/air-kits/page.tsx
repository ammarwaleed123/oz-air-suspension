import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getAirKitCars } from "@/db/queries";
import { CarPickerGrid } from "@/components/car-picker-grid";

// Catalog is DB-backed and managed via admin, so render live rather than
// prerendering at build time.
export const dynamic = "force-dynamic";

export default async function AirKitsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const cars = await getAirKitCars();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.airKits.title}</h1>
      <p className="mt-2 text-ink/60">{dict.airKits.choosePrompt}</p>

      <div className="mt-8">
        <CarPickerGrid
          cars={cars}
          basePath={`/${typedLocale}/air-kits`}
          locale={typedLocale}
          emptyLabel={dict.airKits.noCars}
        />
      </div>
    </div>
  );
}
