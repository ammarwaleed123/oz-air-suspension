import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import { getAirKitCars, getCarsFull, getAllCarsForAdmin } from "@/db/queries";
import { getSession } from "@/lib/auth-helpers";
import { SETUP_ORDER, type SetupType } from "@/lib/catalog";
import type { Car } from "@/db/schema";
import { CarPickerGrid } from "@/components/car-picker-grid";
import { CarSelect } from "@/components/car-select-fields";
import { CarsManager } from "@/components/cars-manager";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { createAirKitAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AirKitsPage({
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

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";
  // Owner also sees cars whose air kit is deactivated (badged), so it can be
  // reactivated; customers see active kits only.
  const cars = await getAirKitCars(isOwner);
  const allCars = isOwner ? await getCarsFull() : [];
  // Only cars without an air kit can receive one.
  const eligibleCars = isOwner
    ? (await getAllCarsForAdmin()).filter((c) => !c.hasAirKit)
    : [];
  const sp = await searchParams;
  const carError = sp.carError
    ? dict.manage.carHasProducts
        .replace("{ak}", sp.ak ?? "0")
        .replace("{co}", sp.co ?? "0")
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.airKits.title}</h1>
      <p className="mt-2 text-ink/60">{dict.airKits.choosePrompt}</p>

      {isOwner && (
        <OwnerToolbar
          dict={dict}
          locale={typedLocale}
          cars={allCars}
          eligibleCars={eligibleCars}
          error={sp.error}
          carError={carError}
        />
      )}

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

function OwnerToolbar({
  dict,
  locale,
  cars,
  eligibleCars,
  error,
  carError,
}: {
  dict: Dictionary;
  locale: Locale;
  cars: Car[];
  eligibleCars: { id: number; nameEn: string; nameAr: string }[];
  error?: string;
  carError?: string;
}) {
  const m = dict.manage;
  const input =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
  const errText =
    error === "car"
      ? m.errCarRequired
      : error === "airkit_exists"
        ? m.errAirKitExists
        : error === "features"
          ? m.errFeatures
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
          redirectTo={`/${locale}/air-kits`}
        />
        <OwnerDisclosure label={m.addAirKit}>
          <form
            action={createAirKitAction}
            encType="multipart/form-data"
            className="space-y-4"
          >
            <input type="hidden" name="locale" value={locale} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CarSelect cars={eligibleCars} locale={locale} dict={dict} inputClass={input} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink/70">{m.titleEn}</span>
                <input type="text" name="titleEn" dir="ltr" required className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-ink/70">{m.titleAr}</span>
                <input type="text" name="titleAr" dir="rtl" required className={input} />
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
              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <span className="text-ink/70">
                  {m.image} ({m.optional})
                </span>
                <input type="file" name="image" accept="image/*" className={input} />
              </label>
            </div>

            <SetupFields dict={dict} input={input} />

            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface"
            >
              {m.add}
            </button>
          </form>
        </OwnerDisclosure>
      </div>
    </div>
  );
}

// The four parallel setups (shared by add + edit). `setups` prefills values.
export function SetupFields({
  dict,
  input,
  setups,
}: {
  dict: Dictionary;
  input: string;
  setups?: {
    setupType: string;
    pricePiastres: number;
    featuresEn: string[];
    featuresAr: string[];
  }[];
}) {
  const m = dict.manage;
  const byType = new Map((setups ?? []).map((s) => [s.setupType, s]));
  return (
    <div>
      <p className="text-sm font-semibold">{m.setups}</p>
      <p className="text-xs text-ink/50">{m.setupPriceHint}</p>
      <div className="mt-2 space-y-3">
        {SETUP_ORDER.map((type) => {
          const s = byType.get(type);
          return (
            <fieldset key={type} className="rounded-lg border border-black/10 p-3">
              <legend className="px-1 text-sm font-medium">
                {dict.airKits.setupLabels[type as SetupType]}
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-ink/60">{m.priceEgp}</span>
                  <input
                    type="number"
                    name={`price_${type}`}
                    step="any"
                    defaultValue={s ? s.pricePiastres / 100 : ""}
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-ink/60">{m.featuresEn}</span>
                  <textarea
                    name={`featuresEn_${type}`}
                    rows={3}
                    dir="ltr"
                    defaultValue={s ? s.featuresEn.join("\n") : ""}
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-ink/60">{m.featuresAr}</span>
                  <textarea
                    name={`featuresAr_${type}`}
                    rows={3}
                    dir="rtl"
                    defaultValue={s ? s.featuresAr.join("\n") : ""}
                    className={input}
                  />
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
