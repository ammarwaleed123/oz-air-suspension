"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bookings } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

// Owner/staff acknowledge all new (confirmed, unseen) bookings, clearing the
// in-admin notification badge.
export async function markAllBookingsSeenAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const user = await getCurrentUser();
  if (!user || (user.role !== "owner" && user.role !== "staff")) {
    redirect(`/${locale}`);
  }

  await db
    .update(bookings)
    .set({ seenByOwner: true })
    .where(
      and(eq(bookings.status, "confirmed"), eq(bookings.seenByOwner, false))
    );

  revalidatePath(`/${locale}/admin`);
  redirect(`/${locale}/admin`);
}
