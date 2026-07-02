import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import { getAirKitByCarSlug, getAirKits } from "@/db/queries";
import { localizedName, SETUP_ORDER, type SetupType } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { getSession } from "@/lib/auth-helpers";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import {
  assignAirKitAction,
  updateFitmentPricesAction,
  removeFitmentAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AirKitProductPage({
  params,
}: {
  params: Promise<{ locale: string; carSlug: string }>;
}) {
  const { locale, carSlug } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const isAr = typedLocale === "ar";

  const car = await getAirKitByCarSlug(carSlug);
  if (!car) notFound();

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";

  const fitment = car.airKitFitment ?? null;
  const kit = fitment?.airKit ?? null;
  const live = Boolean(fitment?.isActive && kit?.isActive);
  // No (live) kit for this car: customers get a 404; owner sees the assign tool.
  if (!live && !isOwner) notFound();

  const featuresByType = new Map(
    (kit?.setups ?? [])
      .filter((s) => s.isActive)
      .map((s) => [s.setupType, s] as const)
  );
  const priceByType = new Map(
    (fitment?.prices ?? [])
      .filter((p) => p.isActive)
      .map((p) => [p.setupType, p] as const)
  );
  const columns = SETUP_ORDER.filter(
    (t) => featuresByType.has(t) && priceByType.has(t)
  ).map((t) => ({
    setupType: t,
    features: featuresByType.get(t)!,
    price: priceByType.get(t)!,
  }));

  const backPath = `/${typedLocale}/air-kits/${carSlug}`;

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Link href={`/${typedLocale}/air-kits`} className="text-sm text-surface/60 hover:text-surface">
          <span className="rtl:hidden">←</span>
          <span className="hidden rtl:inline">→</span> {dict.airKits.title}
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <p className="cat-label">{dict.airKits.step2Label}</p>
            <h1 className="display mt-2 text-4xl uppercase sm:text-6xl">
              {localizedName(car, typedLocale)}
            </h1>
            {kit && (
              <p className="mt-3 text-surface/70">{isAr ? kit.titleAr : kit.titleEn}</p>
            )}
          </div>
          {kit?.imageUrl && (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <ProductImage src={kit.imageUrl} alt={localizedName(car, typedLocale)} aspect="aspect-[16/9]" sizes="(max-width: 1024px) 100vw, 32rem" priority />
            </div>
          )}
        </div>

        {columns.length > 0 ? (
          <>
            <div className="mt-14">
              <p className="cat-label">{dict.airKits.setups}</p>
              <h2 className="display mt-2 text-3xl uppercase sm:text-5xl">{dict.airKits.compareTitle}</h2>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {columns.map((c) => {
                const features = isAr ? c.features.featuresAr : c.features.featuresEn;
                return (
                  <div key={c.setupType} className="flex flex-col rounded-xl border border-white/10 bg-coal p-6">
                    <h3 className="display text-2xl">{dict.airKits.setupLabels[c.setupType as SetupType]}</h3>
                    <ul className="mt-5 flex-1 space-y-2.5 text-sm text-surface/85">
                      {features.map((f, i) => (
                        <li key={i} className="flex gap-2"><CheckIcon /><span>{f}</span></li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <p className="cat-label">{dict.common.price}</p>
                      <p className="text-2xl font-bold">{formatPrice(c.price.pricePiastres, typedLocale)}</p>
                    </div>
                    <div className="mt-4">
                      <AddToCartButton
                        locale={typedLocale}
                        kind="air_kit_setup"
                        productId={c.price.id}
                        label={dict.common.addToCart}
                        className="w-full rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-sm text-surface/60">* {dict.airKits.depositNote}</p>
            <p className="mt-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-surface/70">{dict.airKits.disclaimer}</p>
          </>
        ) : (
          isOwner && (
            <p className="mt-10 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-surface/70">
              {dict.airKits.noCars}
            </p>
          )
        )}

        {isOwner && (
          <OwnerAssign car={car} fitment={fitment} dict={dict} locale={typedLocale} backPath={backPath} />
        )}
      </div>
    </div>
  );
}

async function OwnerAssign({
  car,
  fitment,
  dict,
  locale,
  backPath,
}: {
  car: NonNullable<Awaited<ReturnType<typeof getAirKitByCarSlug>>>;
  fitment: NonNullable<NonNullable<Awaited<ReturnType<typeof getAirKitByCarSlug>>>["airKitFitment"]> | null;
  dict: Dictionary;
  locale: Locale;
  backPath: string;
}) {
  const m = dict.manage;
  const kits = await getAirKits();
  const input =
    "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";
  const priceByType = new Map((fitment?.prices ?? []).map((p) => [p.setupType, p] as const));

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-surface">
      <p className="cat-label mb-4">{m.ownerTools}</p>

      {fitment ? (
        <div className="space-y-3">
          <OwnerDisclosure label={m.edit} dark open>
            <form action={updateFitmentPricesAction} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="fitmentId" value={fitment.id} />
              <input type="hidden" name="redirectTo" value={backPath} />
              <PriceFields dict={dict} input={input} priceByType={priceByType} />
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">{m.update}</button>
            </form>
          </OwnerDisclosure>
          <form action={removeFitmentAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="fitmentId" value={fitment.id} />
            <input type="hidden" name="redirectTo" value={backPath} />
            <button type="submit" className="rounded-md border border-red-400/60 px-3 py-1.5 text-xs text-red-300">{m.removeFitment}</button>
          </form>
        </div>
      ) : (
        <OwnerDisclosure label={m.assignToCar} dark open>
          {kits.length === 0 ? (
            <p className="text-sm text-surface/60">{m.noProducts}</p>
          ) : (
            <form action={assignAirKitAction} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="carId" value={car.id} />
              <input type="hidden" name="redirectTo" value={backPath} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-surface/70">{m.pickKit}</span>
                <select name="airKitId" required defaultValue="" className={input}>
                  <option value="" disabled>{m.pickKit}</option>
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>{locale === "ar" ? k.titleAr : k.titleEn}</option>
                  ))}
                </select>
              </label>
              <PriceFields dict={dict} input={input} priceByType={new Map()} />
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">{m.assignToCar}</button>
            </form>
          )}
        </OwnerDisclosure>
      )}
    </div>
  );
}

// Per-car price inputs for each setup type (no features — those live on the kit).
function PriceFields({
  dict,
  input,
  priceByType,
}: {
  dict: Dictionary;
  input: string;
  priceByType: Map<string, { pricePiastres: number }>;
}) {
  const m = dict.manage;
  return (
    <div>
      <p className="text-sm font-semibold">{m.setups}</p>
      <p className="text-xs text-surface/50">{m.setupPricesHint}</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SETUP_ORDER.map((type) => {
          const p = priceByType.get(type);
          return (
            <label key={type} className="flex flex-col gap-1 text-xs">
              <span className="text-surface/60">{dict.airKits.setupLabels[type as SetupType]} — {m.priceEgp}</span>
              <input type="number" name={`price_${type}`} step="any" defaultValue={p ? p.pricePiastres / 100 : ""} className={input} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-accent" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
