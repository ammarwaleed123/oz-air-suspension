import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { DayAvailability } from "@/lib/booking";

// Renders a month grid. Bookable days are submit buttons (they submit the
// enclosing booking form with name="day"); every other day is greyed out and
// inert. Capacity numbers are NEVER shown to customers.
export function BookingCalendar({
  year,
  month0,
  days,
  locale,
  prevHref,
  nextHref,
  prevLabel,
  nextLabel,
}: {
  year: number;
  month0: number;
  days: DayAvailability[];
  locale: Locale;
  prevHref: string;
  nextHref: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const intlLocale = locale === "ar" ? "ar-EG" : "en-GB";

  const monthTitle = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month0, 1)));

  // Weekday headers, Saturday-first (2023-01-07 is a Saturday).
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(intlLocale, {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2023, 0, 7 + i)))
  );

  // Leading blanks so day 1 lands in the right column (Saturday-first).
  const firstDow = new Date(Date.UTC(year, month0, 1)).getUTCDay(); // Sun=0..Sat=6
  const offset = (firstDow + 1) % 7; // Sat=0, Sun=1, ...

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={prevHref}
          aria-label={prevLabel}
          className="rounded-lg border border-black/15 px-3 py-1 text-sm"
        >
          ‹
        </Link>
        <span className="font-semibold">{monthTitle}</span>
        <Link
          href={nextHref}
          aria-label={nextLabel}
          className="rounded-lg border border-black/15 px-3 py-1 text-sm"
        >
          ›
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink/50">
        {weekdayLabels.map((w, i) => (
          <div key={i} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {days.map((d) =>
          d.bookable ? (
            <button
              key={d.dateISO}
              type="submit"
              name="day"
              value={d.dateISO}
              className="aspect-square rounded-lg border border-black/15 bg-white text-sm font-medium transition-colors hover:border-accent hover:bg-accent/10"
            >
              {d.dayNum}
            </button>
          ) : (
            <div
              key={d.dateISO}
              aria-disabled="true"
              className="flex aspect-square items-center justify-center rounded-lg bg-black/[0.04] text-sm text-ink/25"
            >
              {d.dayNum}
            </div>
          )
        )}
      </div>
    </div>
  );
}
