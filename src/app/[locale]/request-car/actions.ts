"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { carRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-helpers";
import { normalizeEgyptPhone } from "@/lib/validation";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

// Public submission — anyone can request a car. Lands in the owner/staff inbox.
export async function submitCarRequestAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const contactName = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const carMakeModel = String(formData.get("car") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const phone = normalizeEgyptPhone(phoneRaw) ?? phoneRaw;
  const year = Number.parseInt(yearRaw, 10);
  const validYear = Number.isFinite(year) && year >= 1950 && year <= 2027;

  if (!contactName || !phoneRaw || !carMakeModel || !validYear) {
    redirect(`/${locale}/request-car?error=1`);
  }

  const user = await getCurrentUser();
  await db.insert(carRequests).values({
    userId: user?.id ?? null,
    contactName,
    contactPhone: phone,
    carMakeModel,
    year, // validated above (1950–2027)
    notes,
  });

  revalidatePath(`/${locale}/admin/requests`);
  redirect(`/${locale}/request-car?sent=1`);
}
