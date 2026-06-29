import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";
import { computeCart } from "@/lib/cart";
import { getMonthAvailability } from "@/lib/booking";
import { getCarById } from "@/db/queries";
import { todayInCairo, parseISODate } from "@/lib/schedule";
import { localizedName } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { BookingCalendar } from "@/components/booking-calendar";
import { startBookingAction } from "./actions";

export const dynamic = "force-dynamic";

const ERROR_KEYS: Record<string, keyof Awaited<ReturnType<typeof getDictionary>>["booking"]> = {
  no_install: "errNoInstall",
  multiple_cars: "errMultipleCars",
  coilovers_required: "errCoiloversRequired",
  invalid_day: "errInvalidDay",
  slot_unavailable: "errSlotUnavailable",
  slot_taken: "errSlotTaken",
  generic: "errGeneric",
};

function parseMonth(raw: string | undefined): { year: number; month0: number } {
  const today = todayInCairo();
  const def = { year: parseISODate(today).getUTCFullYear(), month0: parseISODate(today).getUTCMonth() };
  if (!raw) return def;
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) return def;
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  if (month0 < 0 || month0 > 11) return def;
  return { year, month0 };
}

function monthParam(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${typedLocale}/login`);

  const sp = await searchParams;
  const cart = await computeCart(user.id);
  const installLines = cart.lines.filter((l) => l.requiresInstall);

  // Nothing that needs installing.
  if (installLines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">{dict.booking.title}</h1>
        <p className="mt-3 text-ink/60">{dict.booking.errNoInstall}</p>
        <Link
          href={`/${typedLocale}/air-kits`}
          className="mt-4 inline-block font-semibold text-accent underline"
        >
          {dict.cart.browse}
        </Link>
      </div>
    );
  }

  // One order = one car.
  const carIds = Array.from(
    new Set(installLines.map((l) => l.carId).filter((x): x is number => !!x))
  );
  const multipleCars = carIds.length > 1;
  const car = carIds[0] ? await getCarById(carIds[0]) : null;

  const hasAir = installLines.some((l) => l.kind === "air_kit_setup");
  const hasCoil = installLines.some((l) => l.kind === "coilover");
  const showGate = hasAir && !hasCoil;

  const { year, month0 } = parseMonth(sp.month);
  const availability = await getMonthAvailability(year, month0);

  const prevHref = `/${typedLocale}/booking?month=${monthParam(
    month0 === 0 ? year - 1 : year,
    month0 === 0 ? 11 : month0 - 1
  )}`;
  const nextHref = `/${typedLocale}/booking?month=${monthParam(
    month0 === 11 ? year + 1 : year,
    month0 === 11 ? 0 : month0 + 1
  )}`;

  const errorKey = sp.error ? ERROR_KEYS[sp.error] : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">{dict.booking.title}</h1>

      {car && (
        <p className="mt-1 text-ink/60">
          {dict.booking.carLabel}: {localizedName(car, typedLocale)}
        </p>
      )}

      {/* Deposit preview (server-computed). */}
      <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm">
        <div className="flex justify-between py-0.5">
          <span className="text-ink/60">{dict.booking.total}</span>
          <span className="font-medium">
            {formatPrice(cart.subtotalPiastres, typedLocale)}
          </span>
        </div>
        <div className="flex justify-between py-0.5">
          <span className="text-ink/60">{dict.booking.depositAmount}</span>
          <span className="font-semibold text-accent">
            {formatPrice(cart.depositPiastres, typedLocale)}
          </span>
        </div>
        <p className="mt-2 text-xs text-ink/50">{dict.booking.twoDayNotice}</p>
      </div>

      {errorKey && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {dict.booking[errorKey]}
        </p>
      )}

      {multipleCars ? (
        <p className="mt-6 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {dict.booking.errMultipleCars}
        </p>
      ) : (
        <form action={startBookingAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="locale" value={typedLocale} />

          {showGate && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  name="coiloversAlreadyInstalled"
                  className="mt-1"
                />
                <span>{dict.booking.coiloverGateLabel}</span>
              </label>
              <p className="mt-2 text-xs text-amber-800">
                {dict.booking.coiloverGateHelp}
              </p>
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/70">{dict.booking.note}</span>
            <textarea
              name="note"
              rows={2}
              placeholder={dict.booking.notePlaceholder}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">
              {dict.booking.selectStartDay}
            </p>
            <BookingCalendar
              year={availability.year}
              month0={availability.month0}
              days={availability.days}
              locale={typedLocale}
              prevHref={prevHref}
              nextHref={nextHref}
              prevLabel={dict.booking.prevMonth}
              nextLabel={dict.booking.nextMonth}
            />
          </div>
        </form>
      )}
    </div>
  );
}
