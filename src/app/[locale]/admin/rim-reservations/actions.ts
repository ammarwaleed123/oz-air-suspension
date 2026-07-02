"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { setRimReservationStatus } from "@/lib/booking";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

// Owner/staff mark a rim reservation picked up (sold) or cancel it (return
// stock). Role enforced here, independent of the admin layout guard.
export async function setRimReservationStatusAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const user = await getCurrentUser();
  if (!user || (user.role !== "owner" && user.role !== "staff")) {
    redirect(`/${locale}`);
  }

  const bookingId = Number.parseInt(String(formData.get("bookingId") ?? ""), 10);
  const status = String(formData.get("status") ?? "");

  if (Number.isInteger(bookingId) && (status === "completed" || status === "cancelled")) {
    await setRimReservationStatus(bookingId, status);
  }

  revalidatePath(`/${locale}/admin/rim-reservations`);
  redirect(`/${locale}/admin/rim-reservations`);
}
