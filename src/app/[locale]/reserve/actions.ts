"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createRimReservation, BookingError } from "@/lib/booking";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

// Creates a rim reservation for the chosen collection day (no install slot),
// then sends the customer to the shared receipt page. Errors map to a redirect
// back with a code.
export async function reserveRimsAction(formData: FormData) {
  const locale = readLocale(formData);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const dayISO = String(formData.get("day") ?? "");
  const note = String(formData.get("note") ?? "");

  let bookingId: number;
  try {
    const res = await createRimReservation(user.id, { dayISO, note });
    bookingId = res.bookingId;
  } catch (err) {
    const code = err instanceof BookingError ? err.code : "generic";
    redirect(`/${locale}/reserve?error=${code}`);
  }

  redirect(`/${locale}/booking/${bookingId}`);
}
