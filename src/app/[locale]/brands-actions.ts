"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { brands } from "@/db/schema";
import { getBrands, brandHasCars } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth-helpers";
import { revalidateCatalog } from "@/lib/cache";
import { slugify, uniqueSlug } from "@/lib/slug";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function ctx(formData: FormData): { locale: Locale; back: string } {
  const raw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const backRaw = String(formData.get("redirectTo") ?? "");
  const back = backRaw.startsWith(`/${locale}/`)
    ? backRaw
    : `/${locale}/air-kits`;
  return { locale, back };
}

async function ensureOwner(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== "owner") redirect(`/${locale}`);
}

export async function createBrandAction(formData: FormData) {
  const { locale, back } = ctx(formData);
  await ensureOwner(locale);

  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const nameAr = String(formData.get("nameAr") ?? "").trim();
  if (!nameEn || !nameAr) redirect(`${back}?error=generic`);

  const taken = new Set((await getBrands()).map((b) => b.slug));
  const slug = uniqueSlug(slugify(nameEn), taken);
  await db.insert(brands).values({ slug, nameEn, nameAr });
  revalidateCatalog();
  revalidatePath(back);
}

export async function deleteBrandAction(formData: FormData) {
  const { locale, back } = ctx(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isInteger(id)) {
    // Block deletion while cars still reference the brand.
    if (await brandHasCars(id)) {
      redirect(`${back}?brandError=1`);
    }
    await db.delete(brands).where(eq(brands.id, id));
  }
  revalidateCatalog();
  revalidatePath(back);
}
