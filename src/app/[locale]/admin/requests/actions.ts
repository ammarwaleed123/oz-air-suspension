"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { carRequests } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

// Owner or staff toggle a request between "new" and "handled" (stored as the
// "contacted" status). Role enforced server-side.
export async function setRequestHandledAction(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;

  const user = await getCurrentUser();
  if (!user || (user.role !== "owner" && user.role !== "staff")) {
    redirect(`/${locale}`);
  }

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const handled = String(formData.get("handled") ?? "") === "true";
  if (Number.isInteger(id)) {
    await db
      .update(carRequests)
      .set({ status: handled ? "contacted" : "new" })
      .where(eq(carRequests.id, id));
  }

  revalidatePath(`/${locale}/admin/requests`);
}
