"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import { confirmDeposit, BookingError } from "@/lib/booking";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

// Simulated "mark deposit paid". Real Paymob/Kashier (step 5) will call
// confirmDeposit() the same way after a successful payment, so the slot
// guarantees are identical whether triggered here or by a webhook.
export async function markDepositPaidAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const bookingId = Number.parseInt(String(formData.get("bookingId") ?? ""), 10);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (!Number.isInteger(bookingId)) redirect(`/${locale}/booking`);

  try {
    await confirmDeposit(user.id, bookingId);
  } catch (err) {
    if (err instanceof BookingError && err.code === "slot_taken") {
      redirect(`/${locale}/booking?error=slot_taken`);
    }
    redirect(`/${locale}/booking?error=generic`);
  }

  revalidatePath(`/${locale}/booking/${bookingId}`);
}
