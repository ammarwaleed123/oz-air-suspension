import type { Locale } from "@/i18n/config";

// Money is stored as integer piastres everywhere. These helpers convert and
// format for display. 1 EGP = 100 piastres.

export function piastresToEgp(piastres: number): number {
  return piastres / 100;
}

export function formatPrice(piastres: number, locale: Locale): string {
  const egp = piastresToEgp(piastres);
  const formatter = new Intl.NumberFormat(
    locale === "ar" ? "ar-EG" : "en-EG",
    {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }
  );
  return formatter.format(egp);
}
