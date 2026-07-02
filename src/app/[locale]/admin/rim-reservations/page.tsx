import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import {
  getRimReservations,
  reconcileLapsedRimReservations,
} from "@/lib/booking";
import { formatPrice } from "@/lib/money";
import { setRimReservationStatusAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDay(dateISO: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateISO}T00:00:00.000Z`));
}

export default async function RimReservationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const t = dict.rimRes;
  const isAr = typedLocale === "ar";

  // Return stock for any reservations whose collection day lapsed w/o pickup.
  await reconcileLapsedRimReservations();
  const reservations = await getRimReservations();

  const statusLabel = (s: string) =>
    s === "confirmed"
      ? t.statusConfirmed
      : s === "completed"
        ? t.statusCompleted
        : s === "no_show"
          ? t.statusNoShow
          : t.statusCancelled;

  return (
    <div>
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p className="mt-2 text-sm text-surface/60">{t.intro}</p>

      {reservations.length === 0 ? (
        <p className="mt-8 text-surface/60">{t.empty}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reservations.map((b) => {
            const items = b.order?.items ?? [];
            const total = b.order?.subtotalPiastres ?? 0;
            const active = b.status === "confirmed";
            return (
              <li key={b.id} className="rounded-xl border border-white/10 bg-coal p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{b.user?.name}</p>
                    <p className="text-sm text-surface/60" dir="ltr">{b.user?.phone}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                    {statusLabel(b.status)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-surface/50">{t.collectionDay}</dt>
                  <dd>{formatDay(b.startDate, typedLocale)}</dd>
                  <dt className="text-surface/50">{t.total}</dt>
                  <dd>{formatPrice(total, typedLocale)}</dd>
                </dl>

                <div className="mt-3 rounded-lg bg-white/[0.03] p-3 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-surface/40">
                    {t.items}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-3">
                        <span>{it.quantity} × {isAr ? it.titleAr : it.titleEn}</span>
                        <span className="text-surface/60">
                          {formatPrice(it.unitPricePiastres * it.quantity, typedLocale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {b.notes && (
                  <p className="mt-2 text-sm text-surface/70">
                    <span className="text-surface/50">{t.note}: </span>
                    {b.notes}
                  </p>
                )}

                {active && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={setRimReservationStatusAction}>
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="status" value="completed" />
                      <button type="submit" className="rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300">
                        {t.markPickedUp}
                      </button>
                    </form>
                    <form action={setRimReservationStatusAction}>
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <button type="submit" className="rounded-lg border border-red-400/60 px-3 py-1.5 text-xs text-red-300">
                        {t.cancelReturn}
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
