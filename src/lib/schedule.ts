// Pure date logic for the install scheduler. No DB access here — capacity
// counting against booking_days lands in step 4 and builds on these helpers.
//
// Business rules encoded:
//   • A working day is any day except SUNDAY (Sunday is skipped).
//   • Each install job spans 2 working days (start day + next working day).
//   • Earliest bookable start is TOMORROW (advanced to a working day).
//
// Dates are handled as "YYYY-MM-DD" strings in UTC to avoid timezone drift
// between the server, Neon, and the browser.

const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "Today" as seen in the shop's timezone (Cairo). Using the server's UTC date
// directly could roll over a day early/late in the evening, so anchor the
// "earliest is tomorrow" rule to local Egyptian time. en-CA formats as
// YYYY-MM-DD.
export function todayInCairo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function parseISODate(iso: string): Date {
  // Force midnight UTC so day-of-week math is stable.
  return new Date(`${iso}T00:00:00.000Z`);
}

export function addDays(iso: string, n: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + n * DAY_MS));
}

// Sunday === 0 in getUTCDay(). Extend this set if Friday should also be off.
const NON_WORKING_DAYS = new Set<number>([0]);

export function isWorkingDay(iso: string): boolean {
  return !NON_WORKING_DAYS.has(parseISODate(iso).getUTCDay());
}

// The next working day strictly after `iso`.
export function nextWorkingDay(iso: string): string {
  let cursor = addDays(iso, 1);
  while (!isWorkingDay(cursor)) cursor = addDays(cursor, 1);
  return cursor;
}

// Advance `iso` forward (including itself) to the first working day.
export function snapToWorkingDay(iso: string): string {
  let cursor = iso;
  while (!isWorkingDay(cursor)) cursor = addDays(cursor, 1);
  return cursor;
}

// The two working days a job occupies if it starts on `startIso`.
// `startIso` must itself be a working day.
export function jobWorkingDays(startIso: string): [string, string] {
  if (!isWorkingDay(startIso)) {
    throw new Error(`Job start ${startIso} is not a working day.`);
  }
  return [startIso, nextWorkingDay(startIso)];
}

// Earliest bookable start date relative to "today": tomorrow, snapped to a
// working day.
export function earliestStart(todayIso: string): string {
  return snapToWorkingDay(addDays(todayIso, 1));
}

// A day is bookable only if BOTH working days of the job (this day and its
// next working day) are under capacity. `countForDay` returns how many cars
// are already booked on a given ISO day.
export function isStartBookable(
  startIso: string,
  capacity: number,
  countForDay: (iso: string) => number
): boolean {
  if (!isWorkingDay(startIso)) return false;
  const [d1, d2] = jobWorkingDays(startIso);
  return countForDay(d1) < capacity && countForDay(d2) < capacity;
}
