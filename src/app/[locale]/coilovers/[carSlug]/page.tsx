import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCoiloversByCarSlug, coiloverIdsWithOrders } from "@/db/queries";
import { localizedName, formatMonthYear } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { getSession } from "@/lib/auth-helpers";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { ConfirmButton } from "@/components/confirm-button";
import {
  updateCoiloverAction,
  deleteCoiloverAction,
  reactivateCoiloverAction,
} from "../actions";

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

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";

  const car = await getCoiloversByCarSlug(carSlug, isOwner);
  if (!car) notFound();

  const items = car.coilovers;
  const isAr = typedLocale === "ar";
  const orderedSet = isOwner
    ? await coiloverIdsWithOrders(items.map((c) => c.id))
    : new Set<number>();
  const backPath = `/${typedLocale}/coilovers/${carSlug}`;
  const input =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href={`/${typedLocale}/coilovers`}
        className="text-sm text-ink/60 hover:text-ink"
      >
        ← {dict.coilovers.title}
      </Link>

      <h1 className="mt-3 text-3xl font-bold">
        {localizedName(car, typedLocale)}
      </h1>
      <p className="mt-1 text-ink/60">{dict.coilovers.title}</p>

      {items.length === 0 ? (
        <p className="mt-8 text-ink/60">{dict.coilovers.noneForCar}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((co) => (
            <li
              key={co.id}
              className="flex flex-col rounded-xl border border-black/10 bg-white p-5"
            >
              <div className="mb-3">
                <ProductImage src={co.imageUrl} alt={co.brand} />
              </div>
              <span className="text-lg font-semibold">
                {co.brand}
                {isOwner && !co.isActive && (
                  <span className="ms-2 rounded-full bg-black/10 px-2 py-0.5 align-middle text-xs font-medium text-ink/60">
                    {dict.manage.hidden}
                  </span>
                )}
              </span>
              <span className="mt-1 text-sm text-ink/50">
                {dict.common.manufactureDate}:{" "}
                {formatMonthYear(co.manufactureDate, typedLocale)}
              </span>
              {(isAr ? co.descriptionAr : co.descriptionEn) && (
                <p className="mt-2 text-sm text-ink/70">
                  {isAr ? co.descriptionAr : co.descriptionEn}
                </p>
              )}
              <span className="mt-4 text-xl font-bold text-accent">
                {formatPrice(co.pricePiastres, typedLocale)}
              </span>
              <div className="mt-3">
                <AddToCartButton
                  locale={typedLocale}
                  kind="coilover"
                  productId={co.id}
                  label={dict.common.addToCart}
                />
              </div>

              {isOwner && (
                <div className="mt-3 flex items-center gap-2 border-t border-black/10 pt-3">
                  <OwnerDisclosure label={dict.manage.edit} variant="ghost">
                    <form
                      action={updateCoiloverAction}
                      encType="multipart/form-data"
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="id" value={co.id} />
                      <input type="hidden" name="redirectTo" value={backPath} />
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-ink/70">{dict.common.brand}</span>
                        <input type="text" name="brand" dir="ltr" required defaultValue={co.brand} className={input} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-ink/70">{dict.common.manufactureDate}</span>
                        <input type="date" name="manufactureDate" required defaultValue={co.manufactureDate} className={input} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-ink/70">{dict.manage.priceEgp}</span>
                        <input type="number" name="price" step="any" required defaultValue={co.pricePiastres / 100} className={input} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-ink/70">
                          {dict.manage.descriptionEn} ({dict.manage.optional})
                        </span>
                        <input type="text" name="descriptionEn" dir="ltr" defaultValue={co.descriptionEn ?? ""} className={input} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-ink/70">
                          {dict.manage.descriptionAr} ({dict.manage.optional})
                        </span>
                        <input type="text" name="descriptionAr" dir="rtl" defaultValue={co.descriptionAr ?? ""} className={input} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                        <span className="text-ink/70">
                          {dict.manage.image} ({dict.manage.optional})
                        </span>
                        <input type="file" name="image" accept="image/*" className={input} />
                        <span className="text-xs text-ink/50">{dict.manage.keepImage}</span>
                      </label>
                      <div>
                        <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface">
                          {dict.manage.update}
                        </button>
                      </div>
                    </form>
                  </OwnerDisclosure>
                  {co.isActive ? (
                    <form action={deleteCoiloverAction}>
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="id" value={co.id} />
                      <input type="hidden" name="redirectTo" value={backPath} />
                      <ConfirmButton className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700">
                        {orderedSet.has(co.id) ? dict.manage.deactivate : dict.manage.delete}
                      </ConfirmButton>
                    </form>
                  ) : (
                    <form action={reactivateCoiloverAction}>
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="id" value={co.id} />
                      <input type="hidden" name="redirectTo" value={backPath} />
                      <button type="submit" className="rounded-md border border-green-400 px-3 py-1.5 text-xs text-green-700">
                        {dict.manage.reactivate}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
