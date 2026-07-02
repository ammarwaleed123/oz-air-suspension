"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { coilovers, coiloverFitments } from "@/db/schema";
import { getCoiloverById, coiloverHasOrders } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";
import { revalidateCatalog } from "@/lib/cache";
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
    descriptionEn: String(formData.get("descriptionEn") ?? "").trim() || null,
    descriptionAr: String(formData.get("descriptionAr") ?? "").trim() || null,
  };
}

function valid(f: ReturnType<typeof readFields>): boolean {
  return !!f.brand && /^\d{4}-\d{2}-\d{2}$/.test(f.manufactureDate);
}

function done(locale: Locale, back?: string) {
  revalidateCatalog();
  revalidatePath(`/${locale}/coilovers`);
  if (back) revalidatePath(back);
}

// ── Coilover PRODUCTS (brand + mfg date + image) ─────────────────────

export async function createCoiloverAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

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

  await db.insert(coilovers).values({ ...f, imageUrl });
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

  let imageUrl = current!.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "coilovers");
      if (current!.imageUrl) await deleteImage(current!.imageUrl);
    } catch (e) {
      redirect(`/${locale}/coilovers?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db.update(coilovers).set({ ...f, imageUrl }).where(eq(coilovers.id, id));
  done(locale, back);
}

export async function deleteCoiloverAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || undefined;
  if (Number.isInteger(id)) {
    const current = await getCoiloverById(id);
    if (current) {
      if (await coiloverHasOrders(id)) {
        await db.update(coilovers).set({ isActive: false }).where(eq(coilovers.id, id));
      } else {
        await db.delete(coilovers).where(eq(coilovers.id, id)); // cascade fitments
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
    await db.update(coilovers).set({ isActive: true }).where(eq(coilovers.id, id));
  }
  done(locale, back);
}

// ── Fitments: assign a coilover to a car at a price ──────────────────

export async function assignCoiloverAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const coiloverId = Number.parseInt(String(formData.get("coiloverId") ?? ""), 10);
  const carId = Number.parseInt(String(formData.get("carId") ?? ""), 10);
  const price = egp(String(formData.get("price") ?? ""));
  const back = String(formData.get("redirectTo") ?? "") || `/${locale}/coilovers`;
  if (!Number.isInteger(coiloverId) || !Number.isInteger(carId) || !(price > 0)) {
    redirect(`${back}?error=generic`);
  }

  // A coilover fits a car once (unique). Re-assigning updates the price.
  await db
    .insert(coiloverFitments)
    .values({ coiloverId, carId, pricePiastres: price })
    .onConflictDoUpdate({
      target: [coiloverFitments.coiloverId, coiloverFitments.carId],
      set: { pricePiastres: price, isActive: true },
    });

  revalidateCatalog();
  revalidatePath(back);
  redirect(back);
}

// Remove a car's coilover assignment (order snapshots are preserved).
export async function removeCoiloverFitmentAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const fitmentId = Number.parseInt(String(formData.get("fitmentId") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || `/${locale}/coilovers`;
  if (Number.isInteger(fitmentId)) {
    await db.delete(coiloverFitments).where(eq(coiloverFitments.id, fitmentId));
  }
  revalidateCatalog();
  revalidatePath(back);
  redirect(back);
}
