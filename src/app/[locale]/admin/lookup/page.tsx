import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getBookingByOrderId } from "@/db/queries";
import { parseOrderRef, orderReference } from "@/lib/receipt";
import { formatPrice } from "@/lib/money";
import { localizedName } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function formatSlot(s: string, e: string, locale: Locale): string {
  const f = (d: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${d}T00:00:00.000Z`));
  return `${f(s)} → ${f(e)}`;
}

// Owner/staff order lookup. The admin layout already guards staff+owner; this
// page is reached by scanning the receipt QR (or typing a reference).
export default async function LookupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const sp = await searchParams;

  const ref = sp.ref?.trim() ?? "";
  const orderId = ref ? parseOrderRef(ref) : null;
  const booking = orderId ? await getBookingByOrderId(orderId) : null;

  const items = booking?.order?.items ?? [];
  const hasAir = items.some((i) => i.kind === "air_kit_setup");
  const hasCoil = items.some((i) => i.kind === "coilover");
  const subtotal = booking?.order?.subtotalPiastres ?? 0;
  const balance = booking ? Math.max(0, subtotal - booking.depositPiastres) : 0;

  return (
    <div>
      <h2 className="text-xl font-semibold">{dict.lookup.title}</h2>

      <form method="get" className="mt-4 flex gap-2">
        <input
          name="ref"
          defaultValue={ref}
          placeholder={dict.lookup.prompt}
          dir="ltr"
          className="w-full max-w-xs rounded-lg border border-white/20 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface"
        >
          {dict.lookup.search}
        </button>
      </form>

      {ref && !booking && (
        <p className="mt-6 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {dict.lookup.notFound}
        </p>
      )}

      {booking && (
        <div className="mt-6 rounded-xl border border-white/10 bg-coal p-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold" dir="ltr">
              {orderReference(booking.orderId)}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              {booking.status === "confirmed"
                ? dict.booking.statusConfirmed
                : booking.status === "completed"
                  ? dict.booking.statusCompleted
                  : booking.status === "no_show"
                    ? dict.booking.statusNoShow
                    : booking.status === "cancelled"
                      ? dict.booking.statusCancelled
                      : dict.booking.statusHeld}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-surface/50">{dict.schedule.customer}</dt>
            <dd>{booking.user?.name ?? "—"}</dd>
            <dt className="text-surface/50">{dict.schedule.phone}</dt>
            <dd dir="ltr">{booking.user?.phone ?? "—"}</dd>
            <dt className="text-surface/50">{dict.schedule.car}</dt>
            <dd>
              {booking.car ? localizedName(booking.car, typedLocale) : "—"}
            </dd>
            <dt className="text-surface/50">{dict.schedule.installing}</dt>
            <dd>
              {hasAir && hasCoil
                ? dict.schedule.installBoth
                : hasAir
                  ? dict.schedule.installAir
                  : dict.schedule.installCoilovers}
            </dd>
            <dt className="text-surface/50">{dict.booking.yourSlot}</dt>
            <dd>{formatSlot(booking.startDate, booking.endDate, typedLocale)}</dd>
            <dt className="text-surface/50">{dict.schedule.deposit}</dt>
            <dd>{formatPrice(booking.depositPiastres, typedLocale)}</dd>
            <dt className="text-surface/50">{dict.schedule.balance}</dt>
            <dd>{formatPrice(balance, typedLocale)}</dd>
          </dl>

          {booking.coiloversAlreadyInstalled && (
            <p className="mt-3 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
              {dict.schedule.coiloverStatedFlag}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
