"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rims } from "@/db/schema";
import { getRimById, rimHasOrders } from "@/db/queries";
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
  if (user.role !== "owner") redirect(`/${locale}/rims`);
}

const egp = (raw: string) => Math.round(Number.parseFloat(raw) * 100);

function readFields(formData: FormData) {
  return {
    nameEn: String(formData.get("nameEn") ?? "").trim(),
    nameAr: String(formData.get("nameAr") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim(),
    diameterInches: Number.parseInt(String(formData.get("diameter") ?? ""), 10),
    widthInches: String(formData.get("width") ?? "").trim(),
    boltPattern: String(formData.get("boltPattern") ?? "").trim(),
    offsetMm: Number.parseInt(String(formData.get("offset") ?? ""), 10),
    finish: String(formData.get("finish") ?? "").trim(),
    pricePiastres: egp(String(formData.get("price") ?? "")),
    stock: Number.parseInt(String(formData.get("stock") ?? "0"), 10) || 0,
  };
}

function valid(f: ReturnType<typeof readFields>): boolean {
  return (
    !!f.nameEn &&
    !!f.nameAr &&
    !!f.brand &&
    Number.isInteger(f.diameterInches) &&
    !!f.widthInches &&
    !!f.boltPattern &&
    Number.isInteger(f.offsetMm) &&
    !!f.finish &&
    Number.isFinite(f.pricePiastres) &&
    f.pricePiastres > 0
  );
}

// Revalidate in place (no redirect) so the page updates without a full
// navigation / blank flash.
function done(locale: Locale) {
  revalidatePath(`/${locale}/rims`);
}

export async function createRimAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const f = readFields(formData);
  if (!valid(f)) redirect(`/${locale}/rims?error=generic`);

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "rims");
    } catch (e) {
      redirect(`/${locale}/rims?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db.insert(rims).values({ ...f, imageUrl });
  done(locale);
}

export async function updateRimAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const f = readFields(formData);
  if (!Number.isInteger(id) || !valid(f)) redirect(`/${locale}/rims?error=generic`);

  const current = await getRimById(id);
  if (!current) redirect(`/${locale}/rims?error=generic`);

  let imageUrl = current.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "rims");
      if (current.imageUrl) await deleteImage(current.imageUrl);
    } catch (e) {
      redirect(`/${locale}/rims?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db.update(rims).set({ ...f, imageUrl }).where(eq(rims.id, id));
  done(locale);
}

// Deactivate if the rim has order history (keep the record); otherwise hard
// delete. The form decides the label; the action enforces the rule.
export async function deleteRimAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isInteger(id)) {
    const current = await getRimById(id);
    if (current) {
      if (await rimHasOrders(id)) {
        await db.update(rims).set({ isActive: false }).where(eq(rims.id, id));
      } else {
        await db.delete(rims).where(eq(rims.id, id));
        if (current.imageUrl) await deleteImage(current.imageUrl);
      }
    }
  }
  done(locale);
}

export async function reactivateRimAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isInteger(id)) {
    await db.update(rims).set({ isActive: true }).where(eq(rims.id, id));
  }
  done(locale);
}
