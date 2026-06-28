import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";
import { computeCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import { formatMonthYear, type SetupType } from "@/lib/catalog";
import { removeFromCartAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  // Viewing a cart requires an account.
  const user = await getCurrentUser();
  if (!user) redirect(`/${typedLocale}/login`);

  // All amounts computed server-side from current DB prices.
  const cart = await computeCart(user.id);
  const isAr = typedLocale === "ar";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.cart.title}</h1>

      {cart.lines.length === 0 ? (
        <div className="mt-6">
          <p className="text-ink/60">{dict.cart.empty}</p>
          <Link
            href={`/${typedLocale}/air-kits`}
            className="mt-3 inline-block font-semibold text-accent underline"
          >
            {dict.cart.browse}
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
            {cart.lines.map((line) => {
              const name = isAr ? line.nameAr : line.nameEn;
              const sub =
                line.kind === "air_kit_setup" && line.setupType
                  ? dict.airKits.setupLabels[line.setupType as SetupType]
                  : line.kind === "coilover" && line.manufactureDate
                    ? `${dict.common.manufactureDate}: ${formatMonthYear(
                        line.manufactureDate,
                        typedLocale
                      )}`
                    : null;
              return (
                <li
                  key={line.cartItemId}
                  className="flex items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{name}</p>
                    {sub && <p className="text-sm text-ink/50">{sub}</p>}
                    {line.requiresInstall && (
                      <p className="mt-1 text-xs text-accent">
                        {dict.cart.requiresInstall}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-ink/60">
                      {line.quantity} × {formatPrice(line.unitPricePiastres, typedLocale)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-semibold">
                      {formatPrice(line.lineTotalPiastres, typedLocale)}
                    </span>
                    <form action={removeFromCartAction}>
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input
                        type="hidden"
                        name="cartItemId"
                        value={line.cartItemId}
                      />
                      <button
                        type="submit"
                        className="text-xs text-red-700 underline"
                      >
                        {dict.cart.remove}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Totals — server-computed; deposit is % of installable items only. */}
          <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.02] p-5 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-ink/60">{dict.cart.subtotal}</span>
              <span className="font-medium">
                {formatPrice(cart.subtotalPiastres, typedLocale)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-ink/60">
                {dict.cart.installDeposit} ({cart.depositPercent}%)
              </span>
              <span className="font-semibold text-accent">
                {formatPrice(cart.depositPiastres, typedLocale)}
              </span>
            </div>
            <p className="mt-3 text-xs text-ink/50">
              {dict.cart.depositNote.replace(
                "{percent}",
                String(cart.depositPercent)
              )}
            </p>
          </div>

          <p className="mt-4 text-sm text-ink/50">{dict.cart.checkoutSoon}</p>
        </>
      )}
    </div>
  );
}
