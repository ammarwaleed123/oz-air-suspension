import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";
import { computeCart } from "@/lib/cart";
import { todayInCairo } from "@/lib/schedule";
import { formatPrice } from "@/lib/money";
import { reserveRimsAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_KEYS: Record<
  string,
  "errNoRims" | "errInvalidDay" | "errOutOfStock" | "errGeneric"
> = {
  no_rims: "errNoRims",
  invalid_day: "errInvalidDay",
  out_of_stock: "errOutOfStock",
  generic: "errGeneric",
};

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const r = dict.reserve;

  const user = await getCurrentUser();
  if (!user) redirect(`/${typedLocale}/login`);
  if (user.role === "owner" || user.role === "staff") {
    redirect(`/${typedLocale}/admin`);
  }

  const cart = await computeCart(user.id);
  // Rims-only path. If the order has installable items, it must go through the
  // install booking (which also carries any rims). Nothing to reserve otherwise.
  if (cart.lines.some((l) => l.requiresInstall)) {
    redirect(`/${typedLocale}/booking`);
  }
  const rimLines = cart.lines.filter((l) => l.kind === "rim");

  const sp = await searchParams;
  const errorKey = sp.error ? ERROR_KEYS[sp.error] : undefined;
  const today = todayInCairo();
  const isAr = typedLocale === "ar";

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-xl px-4 py-14">
        <p className="cat-label">{dict.nav.rims}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-5xl">{r.title}</h1>
        <p className="mt-4 text-surface/70">{r.intro}</p>

        {rimLines.length === 0 ? (
          <div className="mt-8">
            <p className="text-surface/60">{r.empty}</p>
            <Link href={`/${typedLocale}/rims`} className="mt-3 inline-block font-semibold text-accent underline">
              {r.browse}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-white/10 rounded-xl border border-white/10 bg-coal">
              {rimLines.map((line) => (
                <li key={line.cartItemId} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{isAr ? line.nameAr : line.nameEn}</p>
                    <p className="mt-1 text-sm text-surface/60">
                      {line.quantity} × {formatPrice(line.unitPricePiastres, typedLocale)}
                    </p>
                  </div>
                  <span className="font-semibold">{formatPrice(line.lineTotalPiastres, typedLocale)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <span className="text-surface/60">{r.total}</span>
              <span className="font-semibold text-accent">{formatPrice(cart.subtotalPiastres, typedLocale)}</span>
            </div>
            <p className="mt-2 text-xs text-surface/50">{r.payOnCollection}</p>

            {errorKey && (
              <p role="alert" className="mt-4 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {r[errorKey]}
              </p>
            )}

            <form action={reserveRimsAction} className="mt-6 flex flex-col gap-4">
              <input type="hidden" name="locale" value={typedLocale} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-surface/70">{r.dayLabel}</span>
                <input
                  type="date"
                  name="day"
                  required
                  min={today}
                  defaultValue={today}
                  className="w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface [color-scheme:dark]"
                />
                <span className="text-xs text-surface/50">{r.dayHint}</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-surface/70">{r.note}</span>
                <textarea
                  name="note"
                  rows={2}
                  placeholder={r.notePlaceholder}
                  className="w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40"
                />
              </label>
              <button type="submit" className="rounded-lg bg-accent px-5 py-3 text-sm font-bold uppercase tracking-wide text-white">
                {r.submit}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
