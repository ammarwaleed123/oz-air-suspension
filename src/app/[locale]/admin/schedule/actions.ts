"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { setBookingStatus, type ManageStatus } from "@/lib/booking";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

const ALLOWED: ManageStatus[] = ["completed", "no_show", "cancelled"];

// Owner/staff change a booking's status (done / no-show / cancel). Role is
// enforced here, server-side, independent of the admin layout guard.
export async function setBookingStatusAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const user = await getCurrentUser();
  if (!user || (user.role !== "owner" && user.role !== "staff")) {
    redirect(`/${locale}`);
  }

  const bookingId = Number.parseInt(String(formData.get("bookingId") ?? ""), 10);
  const status = String(formData.get("status") ?? "") as ManageStatus;
  const day = String(formData.get("day") ?? "");

  if (Number.isInteger(bookingId) && ALLOWED.includes(status)) {
    await setBookingStatus(bookingId, status);
  }

  const suffix = day ? `?day=${day}` : "";
  revalidatePath(`/${locale}/admin/schedule`);
  redirect(`/${locale}/admin/schedule${suffix}`);
}
