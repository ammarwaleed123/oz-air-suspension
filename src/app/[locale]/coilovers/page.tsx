import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import { getCoiloverCars, getCarsFull } from "@/db/queries";
import { getSession } from "@/lib/auth-helpers";
import type { Car } from "@/db/schema";
import { CarPickerGrid } from "@/components/car-picker-grid";
import { CarSelect } from "@/components/car-select-fields";
import { CarsManager } from "@/components/cars-manager";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { createCoiloverAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CoiloversPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; carError?: string; ak?: string; co?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const cars = await getCoiloverCars();

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";
  const allCars = isOwner ? await getCarsFull() : [];
  const sp = await searchParams;
  const carError = sp.carError
    ? dict.manage.carHasProducts
        .replace("{ak}", sp.ak ?? "0")
        .replace("{co}", sp.co ?? "0")
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.coilovers.title}</h1>
      <p className="mt-2 text-ink/60">{dict.coilovers.choosePrompt}</p>

      {isOwner && (
        <OwnerToolbar
          dict={dict}
          locale={typedLocale}
          cars={allCars}
          error={sp.error}
          carError={carError}
        />
      )}

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

function OwnerToolbar({
  dict,
  locale,
  cars,
  error,
  carError,
}: {
  dict: Dictionary;
  locale: Locale;
  cars: Car[];
  error?: string;
  carError?: string;
}) {
  const m = dict.manage;
  const input =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
  const errText =
    error === "car"
      ? m.errCarRequired
      : error === "image"
        ? m.errImage
        : error
          ? m.errGeneric
          : null;

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
        {m.ownerTools}
      </p>
      {carError && (
        <p role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {carError}
        </p>
      )}
      {errText && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errText}
        </p>
      )}
      <div className="space-y-3">
        <CarsManager
          cars={cars}
          locale={locale}
          dict={dict}
          redirectTo={`/${locale}/coilovers`}
        />
        <OwnerDisclosure label={m.addCoilover}>
          <form
            action={createCoiloverAction}
            encType="multipart/form-data"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            <input type="hidden" name="locale" value={locale} />
            <CarSelect cars={cars} locale={locale} dict={dict} inputClass={input} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/70">{dict.common.brand}</span>
              <input type="text" name="brand" dir="ltr" required className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/70">{dict.common.manufactureDate}</span>
              <input type="date" name="manufactureDate" required className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/70">{m.priceEgp}</span>
              <input type="number" name="price" step="any" required className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/70">
                {m.descriptionEn} ({m.optional})
              </span>
              <input type="text" name="descriptionEn" dir="ltr" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-ink/70">
                {m.descriptionAr} ({m.optional})
              </span>
              <input type="text" name="descriptionAr" dir="rtl" className={input} />
            </label>
            <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-3">
              <span className="text-ink/70">
                {m.image} ({m.optional})
              </span>
              <input type="file" name="image" accept="image/*" className={input} />
            </label>
            <div>
              <button
                type="submit"
                className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface"
              >
                {m.add}
              </button>
            </div>
          </form>
        </OwnerDisclosure>
      </div>
    </div>
  );
}
