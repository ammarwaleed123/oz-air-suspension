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
  // Owner/staff don't shop — send them to the admin area.
  if (user.role === "owner" || user.role === "staff") {
    redirect(`/${typedLocale}/admin`);
  }

  // All amounts computed server-side from current DB prices.
  const cart = await computeCart(user.id);
  const isAr = typedLocale === "ar";

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <p className="cat-label">{dict.nav.cart}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-5xl">{dict.cart.title}</h1>

      {cart.lines.length === 0 ? (
        <div className="mt-6">
          <p className="text-surface/60">{dict.cart.empty}</p>
          <Link
            href={`/${typedLocale}/air-kits`}
            className="mt-3 inline-block font-semibold text-accent underline"
          >
            {dict.cart.browse}
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10 bg-coal">
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
                    {sub && <p className="text-sm text-surface/50">{sub}</p>}
                    {line.requiresInstall && (
                      <p className="mt-1 text-xs text-accent">
                        {dict.cart.requiresInstall}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-surface/60">
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
                        className="text-xs text-red-300 underline"
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
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-surface/60">{dict.cart.subtotal}</span>
              <span className="font-medium">
                {formatPrice(cart.subtotalPiastres, typedLocale)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-surface/60">
                {dict.cart.installDeposit} ({cart.depositPercent}%)
              </span>
              <span className="font-semibold text-accent">
                {formatPrice(cart.depositPiastres, typedLocale)}
              </span>
            </div>
            <p className="mt-3 text-xs text-surface/50">
              {dict.cart.depositNote.replace(
                "{percent}",
                String(cart.depositPercent)
              )}
            </p>
          </div>

          {cart.lines.some((l) => l.requiresInstall) ? (
            <div className="mt-5">
              <p className="text-sm text-surface/60">{dict.cart.installNote}</p>
              <Link
                href={`/${typedLocale}/booking`}
                className="mt-2 inline-block rounded-md bg-accent px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              >
                {dict.cart.bookInstall}
              </Link>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-sm text-surface/60">{dict.cart.rimNote}</p>
              <Link
                href={`/${typedLocale}/reserve`}
                className="mt-2 inline-block rounded-md bg-accent px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              >
                {dict.cart.reserveRims}
              </Link>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
