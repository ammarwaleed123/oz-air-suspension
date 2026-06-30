import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getAirKitByCarSlug, airKitHasOrders } from "@/db/queries";
import { orderSetups, localizedName, type SetupType } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { getSession } from "@/lib/auth-helpers";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { ConfirmButton } from "@/components/confirm-button";
import { SetupFields } from "../page";
import {
  updateAirKitAction,
  deleteAirKitAction,
  reactivateAirKitAction,
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

  const car = await getAirKitByCarSlug(carSlug);
  if (!car || !car.airKit) notFound();

  const kit = car.airKit;
  const setups = orderSetups(kit.setups);
  const isAr = typedLocale === "ar";

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";
  // A deactivated air kit is hidden from the public catalog.
  if (!kit.isActive && !isOwner) notFound();
  const hasOrders = isOwner ? await airKitHasOrders(kit.id) : false;
  const backPath = `/${typedLocale}/air-kits/${carSlug}`;
  const input =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href={`/${typedLocale}/air-kits`}
        className="text-sm text-ink/60 hover:text-ink"
      >
        ← {dict.airKits.title}
      </Link>

      {kit.imageUrl && (
        <div className="mt-4 max-w-2xl">
          <ProductImage
            src={kit.imageUrl}
            alt={localizedName(car, typedLocale)}
            aspect="aspect-[16/9]"
            sizes="(max-width: 768px) 100vw, 42rem"
            priority
          />
        </div>
      )}

      <h1 className="mt-4 text-3xl font-bold">
        {localizedName(car, typedLocale)}
      </h1>
      <p className="mt-1 text-ink/60">
        {isAr ? kit.titleAr : kit.titleEn}
      </p>

      <h2 className="mt-8 text-xl font-semibold">{dict.airKits.setups}</h2>

      {/* Comparison table — scrolls horizontally on small screens so the four
          parallel setups stay side by side. */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-start">
          <thead>
            <tr>
              <th className="w-32 border-b border-black/10 p-3 text-start align-bottom text-sm font-medium text-ink/50">
                {dict.airKits.pickSetup}
              </th>
              {setups.map((s) => (
                <th
                  key={s.id}
                  className="border-b border-black/10 p-3 text-start align-bottom"
                >
                  <div className="font-semibold">
                    {dict.airKits.setupLabels[s.setupType as SetupType]}
                  </div>
                  <div className="mt-1 text-lg font-bold text-accent">
                    {formatPrice(s.pricePiastres, typedLocale)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border-b border-black/10 p-3 text-start align-top text-sm font-medium text-ink/50">
                {dict.airKits.features}
              </th>
              {setups.map((s) => {
                const features = isAr ? s.featuresAr : s.featuresEn;
                return (
                  <td
                    key={s.id}
                    className="border-b border-black/10 p-3 align-top"
                  >
                    <ul className="list-disc space-y-1 text-sm marker:text-accent ps-4">
                      {features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </td>
                );
              })}
            </tr>
            <tr>
              <th className="p-3" />
              {setups.map((s) => (
                <td key={s.id} className="p-3 align-top">
                  <AddToCartButton
                    locale={typedLocale}
                    kind="air_kit_setup"
                    productId={s.id}
                    label={dict.common.addToCart}
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 rounded-lg bg-black/[0.04] p-4 text-sm text-ink/70">
        {dict.airKits.disclaimer}
      </p>

      {isOwner && (
        <div className="mt-8 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            {dict.manage.ownerTools}
          </p>
          <div className="space-y-3">
            <OwnerDisclosure label={dict.manage.edit}>
              <form
                action={updateAirKitAction}
                encType="multipart/form-data"
                className="space-y-4"
              >
                <input type="hidden" name="locale" value={typedLocale} />
                <input type="hidden" name="id" value={kit.id} />
                <input type="hidden" name="redirectTo" value={backPath} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-ink/70">{dict.manage.titleEn}</span>
                    <input type="text" name="titleEn" dir="ltr" required defaultValue={kit.titleEn} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-ink/70">{dict.manage.titleAr}</span>
                    <input type="text" name="titleAr" dir="rtl" required defaultValue={kit.titleAr} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-ink/70">
                      {dict.manage.descriptionEn} ({dict.manage.optional})
                    </span>
                    <input type="text" name="descriptionEn" dir="ltr" defaultValue={kit.descriptionEn ?? ""} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-ink/70">
                      {dict.manage.descriptionAr} ({dict.manage.optional})
                    </span>
                    <input type="text" name="descriptionAr" dir="rtl" defaultValue={kit.descriptionAr ?? ""} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                    <span className="text-ink/70">
                      {dict.manage.image} ({dict.manage.optional})
                    </span>
                    <input type="file" name="image" accept="image/*" className={input} />
                    <span className="text-xs text-ink/50">{dict.manage.keepImage}</span>
                  </label>
                </div>
                <SetupFields dict={dict} input={input} setups={kit.setups} />
                <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface">
                  {dict.manage.update}
                </button>
              </form>
            </OwnerDisclosure>

            {kit.isActive ? (
              <form action={deleteAirKitAction}>
                <input type="hidden" name="locale" value={typedLocale} />
                <input type="hidden" name="id" value={kit.id} />
                <input type="hidden" name="redirectTo" value={backPath} />
                <ConfirmButton className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700">
                  {hasOrders ? dict.manage.deactivate : dict.manage.delete}
                </ConfirmButton>
              </form>
            ) : (
              <form action={reactivateAirKitAction}>
                <input type="hidden" name="locale" value={typedLocale} />
                <input type="hidden" name="id" value={kit.id} />
                <input type="hidden" name="redirectTo" value={backPath} />
                <button type="submit" className="rounded-md border border-green-400 px-3 py-1.5 text-xs text-green-700">
                  {dict.manage.reactivate}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
