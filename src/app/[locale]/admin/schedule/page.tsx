import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getDaySchedule } from "@/lib/booking";
import { todayInCairo, addDays } from "@/lib/schedule";
import { formatPrice } from "@/lib/money";
import { localizedName } from "@/lib/catalog";
import { setBookingStatusAction } from "./actions";

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

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  const sp = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.day ?? "")
    ? (sp.day as string)
    : todayInCairo();

  const entries = await getDaySchedule(day);

  const statusLabel = (s: string) =>
    s === "confirmed"
      ? dict.schedule.statusConfirmed
      : s === "completed"
        ? dict.schedule.statusCompleted
        : s === "no_show"
          ? dict.schedule.statusNoShow
          : dict.schedule.statusCancelled;

  const installLabel = (hasAir: boolean, hasCoil: boolean) =>
    hasAir && hasCoil
      ? dict.schedule.installBoth
      : hasAir
        ? dict.schedule.installAir
        : dict.schedule.installCoilovers;

  const base = `/${typedLocale}/admin/schedule`;

  return (
    <div>
      <h2 className="text-xl font-semibold">{dict.schedule.title}</h2>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href={`${base}?day=${addDays(day, -1)}`}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm"
        >
          ‹ {dict.schedule.prevDay}
        </Link>
        <div className="flex items-center gap-2 text-center">
          <span className="font-semibold">{formatDay(day, typedLocale)}</span>
          <Link
            href={base}
            className="rounded-lg border border-black/15 px-2 py-1 text-xs text-ink/60"
          >
            {dict.schedule.today}
          </Link>
        </div>
        <Link
          href={`${base}?day=${addDays(day, 1)}`}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm"
        >
          {dict.schedule.nextDay} ›
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="mt-8 text-ink/60">{dict.schedule.noBookings}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {entries.map((e) => {
            const carName =
              e.carNameEn || e.carNameAr
                ? localizedName(
                    { nameEn: e.carNameEn ?? "", nameAr: e.carNameAr ?? "" },
                    typedLocale
                  )
                : "—";
            const active = e.status === "confirmed";
            return (
              <li
                key={e.bookingId}
                className="rounded-xl border border-black/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{e.customerName}</p>
                    <p className="text-sm text-ink/60" dir="ltr">
                      {e.customerPhone}
                    </p>
                  </div>
                  <span className="rounded-full bg-black/[0.06] px-3 py-1 text-xs font-medium">
                    {statusLabel(e.status)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-ink/50">{dict.schedule.car}</dt>
                  <dd>{carName}</dd>
                  <dt className="text-ink/50">{dict.schedule.installing}</dt>
                  <dd>{installLabel(e.hasAir, e.hasCoil)}</dd>
                  <dt className="text-ink/50">{dict.schedule.deposit}</dt>
                  <dd>{formatPrice(e.depositPiastres, typedLocale)}</dd>
                  <dt className="text-ink/50">{dict.schedule.balance}</dt>
                  <dd>{formatPrice(e.balancePiastres, typedLocale)}</dd>
                </dl>

                {e.coiloversAlreadyInstalled && (
                  <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    {dict.schedule.coiloverStatedFlag}
                  </p>
                )}

                {e.note && (
                  <p className="mt-2 text-sm text-ink/70">
                    <span className="text-ink/50">{dict.schedule.note}: </span>
                    {e.note}
                  </p>
                )}

                {/* Owner/staff actions — only on active (confirmed) bookings. */}
                {active && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["completed", dict.schedule.markDone],
                        ["no_show", dict.schedule.markNoShow],
                        ["cancelled", dict.schedule.cancelBooking],
                      ] as const
                    ).map(([status, label]) => (
                      <form key={status} action={setBookingStatusAction}>
                        <input type="hidden" name="locale" value={typedLocale} />
                        <input type="hidden" name="day" value={day} />
                        <input
                          type="hidden"
                          name="bookingId"
                          value={e.bookingId}
                        />
                        <input type="hidden" name="status" value={status} />
                        <button
                          type="submit"
                          className={
                            status === "cancelled"
                              ? "rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700"
                              : "rounded-lg border border-black/15 px-3 py-1.5 text-xs"
                          }
                        >
                          {label}
                        </button>
                      </form>
                    ))}
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
