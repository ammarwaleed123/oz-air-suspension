import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import {
  getAirKitCars,
  getCarsFull,
  getBrands,
  getAirKits,
} from "@/db/queries";
import { getSession } from "@/lib/auth-helpers";
import { SETUP_ORDER, type SetupType } from "@/lib/catalog";
import { CarPickerGrid } from "@/components/car-picker-grid";
import { CarsManager } from "@/components/cars-manager";
import { BrandsManager } from "@/components/brands-manager";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { FindMyBuild } from "@/components/find-my-build";
import {
  createAirKitAction,
  updateAirKitAction,
  deleteAirKitAction,
  reactivateAirKitAction,
} from "./actions";

export const dynamic = "force-dynamic";

type KitWithSetups = Awaited<ReturnType<typeof getAirKits>>[number];

export default async function AirKitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; brandError?: string; carError?: string; ak?: string; co?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const h = dict.home;

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";
  const cars = await getAirKitCars(isOwner);

  const [brands, allCars, kits] = isOwner
    ? await Promise.all([getBrands(), getCarsFull(), getAirKits()])
    : [[], [], []];

  const sp = await searchParams;
  const carError = sp.carError
    ? dict.manage.carHasProducts.replace("{ak}", sp.ak ?? "0").replace("{co}", sp.co ?? "0")
    : undefined;

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="cat-label">{dict.airKits.step1Label}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-6xl">
          {dict.airKits.pickChassis}
        </h1>
        <p className="mt-4 max-w-xl text-surface/70">{dict.airKits.choosePrompt}</p>

        <div className="mt-8 max-w-3xl">
          <FindMyBuild
            cars={cars.map((c) => ({
              slug: c.slug,
              make: typedLocale === "ar" ? c.brandAr : c.brandEn,
              model: c.model,
              yearStart: c.yearStart,
              yearEnd: c.yearEnd,
            }))}
            basePath={`/${typedLocale}/air-kits`}
            labels={{
              selectMake: h.selectMake,
              selectModel: h.selectModel,
              year: h.yearLabel,
              findMyBuild: h.findMyBuild,
              empty: h.pickerEmpty,
              requestYourCar: h.requestYourCar,
              requestHref: `/${typedLocale}/request-car`,
            }}
          />
        </div>

        {isOwner && (
          <OwnerTools
            dict={dict}
            locale={typedLocale}
            brands={brands}
            allCars={allCars}
            kits={kits}
            error={sp.error}
            brandError={Boolean(sp.brandError)}
            carError={carError}
          />
        )}

        <div className="mt-12">
          <CarPickerGrid
            cars={cars}
            basePath={`/${typedLocale}/air-kits`}
            locale={typedLocale}
            emptyLabel={dict.airKits.noCars}
            tone="dark"
          />
        </div>
      </div>
    </div>
  );
}

function OwnerTools({
  dict,
  locale,
  brands,
  allCars,
  kits,
  error,
  brandError,
  carError,
}: {
  dict: Dictionary;
  locale: Locale;
  brands: Awaited<ReturnType<typeof getBrands>>;
  allCars: Awaited<ReturnType<typeof getCarsFull>>;
  kits: KitWithSetups[];
  error?: string;
  brandError?: boolean;
  carError?: string;
}) {
  const m = dict.manage;
  const errText =
    error === "features"
      ? m.errFeatures
      : error === "image"
        ? m.errImage
        : error
          ? m.errGeneric
          : null;
  const errBox =
    "mb-3 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200";

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-surface">
      <p className="cat-label mb-4">{m.ownerTools}</p>
      {brandError && <p role="alert" className={errBox}>{m.brandHasCars}</p>}
      {carError && <p role="alert" className={errBox}>{carError}</p>}
      {errText && <p role="alert" className={errBox}>{errText}</p>}

      <div className="space-y-3">
        <BrandsManager brands={brands} locale={locale} dict={dict} redirectTo={`/${locale}/air-kits`} />
        <CarsManager cars={allCars} brands={brands} locale={locale} dict={dict} redirectTo={`/${locale}/air-kits`} dark />
        <AirKitProducts kits={kits} locale={locale} dict={dict} />
      </div>
    </div>
  );
}

// Air kit PRODUCTS: title + image + shared setups/features. Per-car prices are
// assigned on each car's air-kit page.
function AirKitProducts({
  kits,
  locale,
  dict,
}: {
  kits: KitWithSetups[];
  locale: Locale;
  dict: Dictionary;
}) {
  const m = dict.manage;
  const input =
    "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";

  return (
    <OwnerDisclosure label={m.airKitProducts} variant="ghost" dark>
      <OwnerDisclosure label={m.addAirKit} dark>
        <AirKitForm action={createAirKitAction} locale={locale} dict={dict} input={input} submitLabel={m.add} />
      </OwnerDisclosure>

      {kits.length === 0 ? (
        <p className="mt-4 text-sm text-surface/60">{m.noProducts}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {kits.map((kit) => (
            <li key={kit.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-surface">
                  {locale === "ar" ? kit.titleAr : kit.titleEn}
                  {!kit.isActive && (
                    <span className="ms-2 rounded bg-white/10 px-2 py-0.5 text-xs text-surface/60">
                      {m.hidden}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <OwnerDisclosure label={m.edit} variant="ghost" dark>
                    <AirKitForm action={updateAirKitAction} locale={locale} dict={dict} input={input} submitLabel={m.update} kit={kit} />
                  </OwnerDisclosure>
                  {kit.isActive ? (
                    <form action={deleteAirKitAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={kit.id} />
                      <input type="hidden" name="redirectTo" value={`/${locale}/air-kits`} />
                      <button type="submit" className="rounded-md border border-red-400/60 px-3 py-1.5 text-xs text-red-300">
                        {m.delete}
                      </button>
                    </form>
                  ) : (
                    <form action={reactivateAirKitAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={kit.id} />
                      <input type="hidden" name="redirectTo" value={`/${locale}/air-kits`} />
                      <button type="submit" className="rounded-md border border-green-400/60 px-3 py-1.5 text-xs text-green-300">
                        {m.reactivate}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OwnerDisclosure>
  );
}

function AirKitForm({
  action,
  locale,
  dict,
  input,
  submitLabel,
  kit,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  dict: Dictionary;
  input: string;
  submitLabel: string;
  kit?: KitWithSetups;
}) {
  const m = dict.manage;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {kit && <input type="hidden" name="id" value={kit.id} />}
      {kit && <input type="hidden" name="redirectTo" value={`/${locale}/air-kits`} />}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-surface/70">{m.titleEn}</span>
          <input name="titleEn" dir="ltr" required defaultValue={kit?.titleEn ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-surface/70">{m.titleAr}</span>
          <input name="titleAr" dir="rtl" required defaultValue={kit?.titleAr ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-surface/70">{m.descriptionEn} ({m.optional})</span>
          <input name="descriptionEn" dir="ltr" defaultValue={kit?.descriptionEn ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-surface/70">{m.descriptionAr} ({m.optional})</span>
          <input name="descriptionAr" dir="rtl" defaultValue={kit?.descriptionAr ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-surface/70">{m.image} ({m.optional})</span>
          <input type="file" name="image" accept="image/*" className={input} />
          {kit && <span className="text-xs text-surface/50">{m.keepImage}</span>}
        </label>
      </div>
      <SetupFields dict={dict} input={input} setups={kit?.setups} />
      <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
        {submitLabel}
      </button>
    </form>
  );
}

// The four setups' SHARED feature lists (no price — prices are per car).
function SetupFields({
  dict,
  input,
  setups,
}: {
  dict: Dictionary;
  input: string;
  setups?: { setupType: string; featuresEn: string[]; featuresAr: string[] }[];
}) {
  const m = dict.manage;
  const byType = new Map((setups ?? []).map((s) => [s.setupType, s]));
  return (
    <div>
      <p className="text-sm font-semibold">{m.setups}</p>
      <p className="text-xs text-surface/50">{m.featuresHint}</p>
      <div className="mt-2 space-y-3">
        {SETUP_ORDER.map((type) => {
          const s = byType.get(type);
          return (
            <fieldset key={type} className="rounded-lg border border-white/15 p-3">
              <legend className="px-1 text-sm font-medium">
                {dict.airKits.setupLabels[type as SetupType]}
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-surface/60">{m.featuresEn}</span>
                  <textarea name={`featuresEn_${type}`} rows={3} dir="ltr" defaultValue={s ? s.featuresEn.join("\n") : ""} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-surface/60">{m.featuresAr}</span>
                  <textarea name={`featuresAr_${type}`} rows={3} dir="rtl" defaultValue={s ? s.featuresAr.join("\n") : ""} className={input} />
                </label>
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
