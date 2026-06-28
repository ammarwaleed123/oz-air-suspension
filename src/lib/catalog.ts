import type { Locale } from "@/i18n/config";
import type { AirKitSetup } from "@/db/schema";

// The four parallel setups in their fixed display order (matches the price
// sheet: Low Normal Slow → Low Fast → Down Dual → Down Single).
export const SETUP_ORDER = [
  "low_normal_slow",
  "low_fast",
  "down_dual",
  "down_single",
] as const;

export type SetupType = (typeof SETUP_ORDER)[number];

// Sort a kit's setups into the canonical display order regardless of the
// order rows come back from the database.
export function orderSetups<T extends Pick<AirKitSetup, "setupType">>(
  setups: T[]
): T[] {
  const rank = (s: SetupType) => SETUP_ORDER.indexOf(s);
  return [...setups].sort(
    (a, b) => rank(a.setupType as SetupType) - rank(b.setupType as SetupType)
  );
}

// Localized helpers for picking the right bilingual field.
export function localizedName(
  row: { nameEn: string; nameAr: string },
  locale: Locale
): string {
  return locale === "ar" ? row.nameAr : row.nameEn;
}

// Format a manufacture date ("YYYY-MM-DD") as a localized month + year.
export function formatMonthYear(dateStr: string, locale: Locale): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
