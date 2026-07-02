import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import {
  getCoiloverCars,
  getCarsFull,
  getBrands,
  getCoilovers,
} from "@/db/queries";
import { getSession } from "@/lib/auth-helpers";
import { formatMonthYear } from "@/lib/catalog";
import { CarPickerGrid } from "@/components/car-picker-grid";
import { CarsManager } from "@/components/cars-manager";
import { BrandsManager } from "@/components/brands-manager";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { FindMyBuild } from "@/components/find-my-build";
import {
  createCoiloverAction,
  updateCoiloverAction,
  deleteCoiloverAction,
  reactivateCoiloverAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Coilover = Awaited<ReturnType<typeof getCoilovers>>[number];

export default async function CoiloversPage({
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
  const cars = await getCoiloverCars(isOwner);

  const [brands, allCars, products] = isOwner
    ? await Promise.all([getBrands(), getCarsFull(), getCoilovers()])
    : [[], [], []];

  const sp = await searchParams;
  const carError = sp.carError
    ? dict.manage.carHasProducts.replace("{ak}", sp.ak ?? "0").replace("{co}", sp.co ?? "0")
    : undefined;

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="cat-label">{dict.airKits.step1Label}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-6xl">{dict.coilovers.title}</h1>
        <p className="mt-4 max-w-xl text-surface/70">{dict.coilovers.choosePrompt}</p>

        <div className="mt-8 max-w-3xl">
          <FindMyBuild
            cars={cars.map((c) => ({
              slug: c.slug,
              make: typedLocale === "ar" ? c.brandAr : c.brandEn,
              model: c.model,
              yearStart: c.yearStart,
              yearEnd: c.yearEnd,
            }))}
            basePath={`/${typedLocale}/coilovers`}
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
            products={products}
            error={sp.error}
            brandError={Boolean(sp.brandError)}
            carError={carError}
          />
        )}

        <div className="mt-12">
          <CarPickerGrid
            cars={cars}
            basePath={`/${typedLocale}/coilovers`}
            locale={typedLocale}
            emptyLabel={dict.coilovers.noCars}
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
  products,
  error,
  brandError,
  carError,
}: {
  dict: Dictionary;
  locale: Locale;
  brands: Awaited<ReturnType<typeof getBrands>>;
  allCars: Awaited<ReturnType<typeof getCarsFull>>;
  products: Coilover[];
  error?: string;
  brandError?: boolean;
  carError?: string;
}) {
  const m = dict.manage;
  const errText = error === "image" ? m.errImage : error ? m.errGeneric : null;
  const errBox = "mb-3 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200";

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-surface">
      <p className="cat-label mb-4">{m.ownerTools}</p>
      {brandError && <p role="alert" className={errBox}>{m.brandHasCars}</p>}
      {carError && <p role="alert" className={errBox}>{carError}</p>}
      {errText && <p role="alert" className={errBox}>{errText}</p>}

      <div className="space-y-3">
        <BrandsManager brands={brands} locale={locale} dict={dict} redirectTo={`/${locale}/coilovers`} />
        <CarsManager cars={allCars} brands={brands} locale={locale} dict={dict} redirectTo={`/${locale}/coilovers`} dark />
        <CoiloverProducts products={products} locale={locale} dict={dict} />
      </div>
    </div>
  );
}

function CoiloverProducts({
  products,
  locale,
  dict,
}: {
  products: Coilover[];
  locale: Locale;
  dict: Dictionary;
}) {
  const m = dict.manage;
  const input = "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";

  return (
    <OwnerDisclosure label={m.coiloverProducts} variant="ghost" dark>
      <OwnerDisclosure label={m.addCoilover} dark>
        <CoiloverForm action={createCoiloverAction} locale={locale} dict={dict} input={input} submitLabel={m.add} />
      </OwnerDisclosure>

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-surface/60">{m.noProducts}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {products.map((p) => (
            <li key={p.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-surface" dir="ltr">
                  {p.brand} · {formatMonthYear(p.manufactureDate, locale)}
                  {!p.isActive && (
                    <span className="ms-2 rounded bg-white/10 px-2 py-0.5 text-xs text-surface/60">{m.hidden}</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <OwnerDisclosure label={m.edit} variant="ghost" dark>
                    <CoiloverForm action={updateCoiloverAction} locale={locale} dict={dict} input={input} submitLabel={m.update} product={p} />
                  </OwnerDisclosure>
                  {p.isActive ? (
                    <form action={deleteCoiloverAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="redirectTo" value={`/${locale}/coilovers`} />
                      <button type="submit" className="rounded-md border border-red-400/60 px-3 py-1.5 text-xs text-red-300">{m.delete}</button>
                    </form>
                  ) : (
                    <form action={reactivateCoiloverAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="redirectTo" value={`/${locale}/coilovers`} />
                      <button type="submit" className="rounded-md border border-green-400/60 px-3 py-1.5 text-xs text-green-300">{m.reactivate}</button>
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

function CoiloverForm({
  action,
  locale,
  dict,
  input,
  submitLabel,
  product,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  dict: Dictionary;
  input: string;
  submitLabel: string;
  product?: Coilover;
}) {
  const m = dict.manage;
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />
      {product && <input type="hidden" name="id" value={product.id} />}
      {product && <input type="hidden" name="redirectTo" value={`/${locale}/coilovers`} />}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/70">{m.coiloverBrand}</span>
        <input name="brand" dir="ltr" required placeholder="KW / BC Racing" defaultValue={product?.brand ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/70">{m.mfgDate}</span>
        <input type="date" name="manufactureDate" required defaultValue={product?.manufactureDate ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/70">{m.descriptionEn} ({m.optional})</span>
        <input name="descriptionEn" dir="ltr" defaultValue={product?.descriptionEn ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/70">{m.descriptionAr} ({m.optional})</span>
        <input name="descriptionAr" dir="rtl" defaultValue={product?.descriptionAr ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-surface/70">{m.image} ({m.optional})</span>
        <input type="file" name="image" accept="image/*" className={input} />
        {product && <span className="text-xs text-surface/50">{m.keepImage}</span>}
      </label>
      <div className="sm:col-span-2">
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">{submitLabel}</button>
      </div>
    </form>
  );
}
