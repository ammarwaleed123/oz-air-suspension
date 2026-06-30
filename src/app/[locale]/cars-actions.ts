"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cars } from "@/db/schema";
import { getAllCarSlugs, getCarById, getCarAttachments } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";
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

function readCarFields(formData: FormData) {
  return {
    make: String(formData.get("make") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    nameEn: String(formData.get("nameEn") ?? "").trim(),
    nameAr: String(formData.get("nameAr") ?? "").trim(),
    yearStart:
      Number.parseInt(String(formData.get("yearStart") ?? ""), 10) || null,
    yearEnd: Number.parseInt(String(formData.get("yearEnd") ?? ""), 10) || null,
  };
}

// Revalidate in place (no redirect → no blank flash). `back` is the landing
// page the owner is managing cars from.
function finish(back: string) {
  revalidatePath(back);
}

export async function createCarAction(formData: FormData) {
  const { locale, back } = ctx(formData);
  await ensureOwner(locale);

  const f = readCarFields(formData);
  if (!f.make || !f.model || !f.nameEn || !f.nameAr) {
    redirect(`${back}?error=generic`);
  }

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "cars");
    } catch (e) {
      redirect(`${back}?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  const taken = new Set(await getAllCarSlugs());
  const slug = uniqueSlug(slugify(`${f.make} ${f.model}`), taken);
  await db.insert(cars).values({ slug, ...f, imageUrl });
  finish(back);
}

export async function updateCarAction(formData: FormData) {
  const { locale, back } = ctx(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const f = readCarFields(formData);
  if (!Number.isInteger(id) || !f.make || !f.model || !f.nameEn || !f.nameAr) {
    redirect(`${back}?error=generic`);
  }
  const current = await getCarById(id);
  if (!current) redirect(`${back}?error=generic`);

  // Keep the existing slug so detail URLs don't break.
  let imageUrl = current.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "cars");
      if (current.imageUrl) await deleteImage(current.imageUrl);
    } catch (e) {
      redirect(`${back}?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db.update(cars).set({ ...f, imageUrl }).where(eq(cars.id, id));
  finish(back);
}

export async function deleteCarAction(formData: FormData) {
  const { locale, back } = ctx(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isInteger(id)) {
    // PREVENT deletion if any air kits / coilovers are still attached — never
    // cascade-delete products. The owner must remove those first.
    const att = await getCarAttachments(id);
    if (att.airKits + att.coilovers > 0) {
      redirect(`${back}?carError=1&ak=${att.airKits}&co=${att.coilovers}`);
    }
    const current = await getCarById(id);
    await db.delete(cars).where(eq(cars.id, id));
    if (current?.imageUrl) await deleteImage(current.imageUrl);
  }
  finish(back);
}
