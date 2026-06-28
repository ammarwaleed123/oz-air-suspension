import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCoiloverCars } from "@/db/queries";
import { CarPickerGrid } from "@/components/car-picker-grid";

// DB-backed catalog — render live (see air-kits page for rationale).
export const dynamic = "force-dynamic";

export default async function CoiloversPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const cars = await getCoiloverCars();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.coilovers.title}</h1>
      <p className="mt-2 text-ink/60">{dict.coilovers.choosePrompt}</p>

      <div className="mt-8">
        <CarPickerGrid
          cars={cars}
          basePath={`/${typedLocale}/coilovers`}
          locale={typedLocale}
          emptyLabel={dict.coilovers.noCars}
        />
      </div>
    </div>
  );
}
