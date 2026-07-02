import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import { getCoiloversByCarSlug, getCoilovers } from "@/db/queries";
import { localizedName, formatMonthYear } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { getSession } from "@/lib/auth-helpers";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { assignCoiloverAction, removeCoiloverFitmentAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CoiloverListPage({
  params,
}: {
  params: Promise<{ locale: string; carSlug: string }>;
}) {
  const { locale, carSlug } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const isAr = typedLocale === "ar";

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";

  const car = await getCoiloversByCarSlug(carSlug);
  if (!car) notFound();

  // Sort fitments by coilover brand then newest manufacture date.
  const fitments = [...car.coiloverFitments].sort((a, b) => {
    const ab = a.coilover.brand.localeCompare(b.coilover.brand);
    if (ab !== 0) return ab;
    return b.coilover.manufactureDate.localeCompare(a.coilover.manufactureDate);
  });
  // Customers only see live fitments (active fitment + active product).
  const visible = fitments.filter(
    (f) => isOwner || (f.isActive && f.coilover.isActive)
  );
  const backPath = `/${typedLocale}/coilovers/${carSlug}`;

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Link href={`/${typedLocale}/coilovers`} className="text-sm text-surface/60 hover:text-surface">
          <span className="rtl:hidden">←</span>
          <span className="hidden rtl:inline">→</span> {dict.coilovers.title}
        </Link>

        <p className="cat-label mt-6">{dict.coilovers.title}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-6xl">{localizedName(car, typedLocale)}</h1>

        {visible.length === 0 ? (
          <p className="mt-8 text-surface/60">{dict.coilovers.noneForCar}</p>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((f) => {
              const co = f.coilover;
              return (
                <li key={f.id} className="flex flex-col rounded-xl border border-white/10 bg-coal p-5">
                  <div className="mb-3 overflow-hidden rounded-lg">
                    <ProductImage src={co.imageUrl} alt={co.brand} />
                  </div>
                  <span className="text-lg font-semibold" dir="ltr">
                    {co.brand}
                    {isOwner && (!f.isActive || !co.isActive) && (
                      <span className="ms-2 rounded-full bg-white/10 px-2 py-0.5 align-middle text-xs text-surface/60">{dict.manage.hidden}</span>
                    )}
                  </span>
                  <span className="mt-1 text-sm text-surface/50">
                    {dict.common.manufactureDate}: {formatMonthYear(co.manufactureDate, typedLocale)}
                  </span>
                  {(isAr ? co.descriptionAr : co.descriptionEn) && (
                    <p className="mt-2 text-sm text-surface/70">{isAr ? co.descriptionAr : co.descriptionEn}</p>
                  )}
                  <span className="mt-4 text-xl font-bold text-accent">{formatPrice(f.pricePiastres, typedLocale)}</span>
                  <div className="mt-3">
                    <AddToCartButton
                      locale={typedLocale}
                      kind="coilover"
                      productId={f.id}
                      label={dict.common.addToCart}
                      className="w-full rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                    />
                  </div>

                  {isOwner && (
                    <form action={removeCoiloverFitmentAction} className="mt-3 border-t border-white/10 pt-3">
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="fitmentId" value={f.id} />
                      <input type="hidden" name="redirectTo" value={backPath} />
                      <button type="submit" className="rounded-md border border-red-400/60 px-3 py-1.5 text-xs text-red-300">{dict.manage.removeFitment}</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {isOwner && (
          <OwnerAssign carId={car.id} dict={dict} locale={typedLocale} backPath={backPath} />
        )}
      </div>
    </div>
  );
}

async function OwnerAssign({
  carId,
  dict,
  locale,
  backPath,
}: {
  carId: number;
  dict: Dictionary;
  locale: Locale;
  backPath: string;
}) {
  const m = dict.manage;
  const products = await getCoilovers();
  const input = "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-surface">
      <p className="cat-label mb-4">{m.ownerTools}</p>
      <OwnerDisclosure label={m.assignToCar} dark open>
        {products.length === 0 ? (
          <p className="text-sm text-surface/60">{m.noProducts}</p>
        ) : (
          <form action={assignCoiloverAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="carId" value={carId} />
            <input type="hidden" name="redirectTo" value={backPath} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-surface/70">{m.pickCoilover}</span>
              <select name="coiloverId" required defaultValue="" className={input}>
                <option value="" disabled>{m.pickCoilover}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.brand} · {formatMonthYear(p.manufactureDate, locale)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-surface/70">{m.priceEgp}</span>
              <input type="number" name="price" step="any" required className={input} />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">{m.assignToCar}</button>
            </div>
          </form>
        )}
      </OwnerDisclosure>
    </div>
  );
}
