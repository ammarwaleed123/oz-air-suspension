"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createHold, BookingError } from "@/lib/booking";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

// Creates the 15-minute hold for the chosen day, then sends the customer to
// the confirm page. Validation (gate, capacity, day) lives in createHold; here
// we just translate failures into a redirect back with an error code.
export async function startBookingAction(formData: FormData) {
  const locale = readLocale(formData);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const dayISO = String(formData.get("day") ?? "");
  const note = String(formData.get("note") ?? "");
  const coiloversAlreadyInstalled =
    formData.get("coiloversAlreadyInstalled") === "on";

  let bookingId: number;
  try {
    const res = await createHold(user.id, {
      dayISO,
      note,
      coiloversAlreadyInstalled,
    });
    bookingId = res.bookingId;
  } catch (err) {
    const code = err instanceof BookingError ? err.code : "generic";
    redirect(`/${locale}/booking?error=${code}`);
  }

  redirect(`/${locale}/booking/${bookingId}`);
}
