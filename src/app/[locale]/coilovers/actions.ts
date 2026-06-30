"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { coilovers } from "@/db/schema";
import { getCoiloverById, coiloverHasOrders } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

async function ensureOwner(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== "owner") redirect(`/${locale}/coilovers`);
}

const egp = (raw: string) => Math.round(Number.parseFloat(raw) * 100);

function readFields(formData: FormData) {
  return {
    brand: String(formData.get("brand") ?? "").trim(),
    manufactureDate: String(formData.get("manufactureDate") ?? "").trim(),
    pricePiastres: egp(String(formData.get("price") ?? "")),
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionAr: String(formData.get("descriptionAr") ?? "").trim() || null,
  };
}

function valid(f: ReturnType<typeof readFields>): boolean {
  return (
    !!f.brand &&
    /^\d{4}-\d{2}-\d{2}$/.test(f.manufactureDate) &&
    Number.isFinite(f.pricePiastres) &&
    f.pricePiastres > 0
  );
}

// Revalidate in place (no redirect → no blank flash). `back` is the detail
// page for edit/delete; the landing list is also refreshed.
function done(locale: Locale, back?: string) {
  revalidatePath(`/${locale}/coilovers`);
  if (back) revalidatePath(back);
}

export async function createCoiloverAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const carId = Number.parseInt(String(formData.get("carId") ?? ""), 10);
  if (!Number.isInteger(carId)) redirect(`/${locale}/coilovers?error=car`);

  const f = readFields(formData);
  if (!valid(f)) redirect(`/${locale}/coilovers?error=generic`);

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "coilovers");
    } catch (e) {
      redirect(`/${locale}/coilovers?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db.insert(coilovers).values({ carId, ...f, imageUrl });
  done(locale);
}

export async function updateCoiloverAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || undefined;
  const f = readFields(formData);
  if (!Number.isInteger(id) || !valid(f)) {
    redirect(`/${locale}/coilovers?error=generic`);
  }
  const current = await getCoiloverById(id);
  if (!current) redirect(`/${locale}/coilovers?error=generic`);

  let imageUrl = current.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "coilovers");
      if (current.imageUrl) await deleteImage(current.imageUrl);
    } catch (e) {
      redirect(`/${locale}/coilovers?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db.update(coilovers).set({ ...f, imageUrl }).where(eq(coilovers.id, id));
  done(locale, back);
}

// Deactivate if ordered (keep record); else hard delete.
export async function deleteCoiloverAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || undefined;
  if (Number.isInteger(id)) {
    const current = await getCoiloverById(id);
    if (current) {
      if (await coiloverHasOrders(id)) {
        await db
          .update(coilovers)
          .set({ isActive: false })
          .where(eq(coilovers.id, id));
      } else {
        await db.delete(coilovers).where(eq(coilovers.id, id));
        if (current.imageUrl) await deleteImage(current.imageUrl);
      }
    }
  }
  done(locale, back);
}

export async function reactivateCoiloverAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || undefined;
  if (Number.isInteger(id)) {
    await db
      .update(coilovers)
      .set({ isActive: true })
      .where(eq(coilovers.id, id));
  }
  done(locale, back);
}
