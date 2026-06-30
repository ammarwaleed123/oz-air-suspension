"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { airKits, airKitSetups } from "@/db/schema";
import { getAirKitById, airKitHasOrders } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";
import { SETUP_ORDER } from "@/lib/catalog";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

async function ensureOwner(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== "owner") redirect(`/${locale}/air-kits`);
}

const egp = (raw: string) => Math.round(Number.parseFloat(raw) * 100);

function parseLines(raw: string): string[] {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean);
}

// Collect the setups the owner filled in (a positive price marks a setup as
// offered). Returns one entry per offered setup type.
function readSetups(formData: FormData) {
  return SETUP_ORDER.flatMap((type) => {
    const priceRaw = String(formData.get(`price_${type}`) ?? "").trim();
    if (!priceRaw) return [];
    const price = egp(priceRaw);
    if (!Number.isFinite(price) || price <= 0) return [];
    return [
      {
        setupType: type,
        pricePiastres: price,
        featuresEn: parseLines(String(formData.get(`featuresEn_${type}`) ?? "")),
        featuresAr: parseLines(String(formData.get(`featuresAr_${type}`) ?? "")),
      },
    ];
  });
}

// Every offered setup needs features in BOTH languages.
function setupsBilingual(
  setups: ReturnType<typeof readSetups>
): boolean {
  return setups.every(
    (s) => s.featuresEn.length > 0 && s.featuresAr.length > 0
  );
}

// Revalidate in place (no redirect → no blank flash). Used by create/edit.
function done(locale: Locale, back?: string) {
  revalidatePath(`/${locale}/air-kits`);
  if (back) revalidatePath(back);
}

export async function createAirKitAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const carId = Number.parseInt(String(formData.get("carId") ?? ""), 10);
  if (!Number.isInteger(carId)) redirect(`/${locale}/air-kits?error=car`);

  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const titleAr = String(formData.get("titleAr") ?? "").trim();
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim() || null;
  const descriptionAr = String(formData.get("descriptionAr") ?? "").trim() || null;
  if (!titleEn || !titleAr) redirect(`/${locale}/air-kits?error=generic`);

  const setups = readSetups(formData);
  if (setups.length === 0) redirect(`/${locale}/air-kits?error=generic`);
  if (!setupsBilingual(setups)) redirect(`/${locale}/air-kits?error=features`);

  // One air kit per car.
  const exists = await db.query.airKits.findFirst({
    where: eq(airKits.carId, carId),
  });
  if (exists) redirect(`/${locale}/air-kits?error=airkit_exists`);

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "air-kits");
    } catch (e) {
      redirect(`/${locale}/air-kits?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  const [kit] = await db
    .insert(airKits)
    .values({ carId, titleEn, titleAr, descriptionEn, descriptionAr, imageUrl })
    .returning({ id: airKits.id });
  await db.insert(airKitSetups).values(setups.map((s) => ({ ...s, airKitId: kit.id })));

  done(locale);
}

export async function updateAirKitAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || undefined;
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const titleAr = String(formData.get("titleAr") ?? "").trim();
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim() || null;
  const descriptionAr = String(formData.get("descriptionAr") ?? "").trim() || null;
  if (!Number.isInteger(id) || !titleEn || !titleAr) {
    redirect(`/${locale}/air-kits?error=generic`);
  }

  const current = await getAirKitById(id);
  if (!current) redirect(`/${locale}/air-kits?error=generic`);

  const setups = readSetups(formData);
  if (setups.length === 0) redirect(`/${locale}/air-kits?error=generic`);
  if (!setupsBilingual(setups)) redirect(`/${locale}/air-kits?error=features`);

  let imageUrl = current.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "air-kits");
      if (current.imageUrl) await deleteImage(current.imageUrl);
    } catch (e) {
      redirect(`/${locale}/air-kits?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db
    .update(airKits)
    .set({ titleEn, titleAr, descriptionEn, descriptionAr, imageUrl })
    .where(eq(airKits.id, id));

  // Reconcile the four setups: upsert the offered ones, remove the rest.
  const offered = new Set(setups.map((s) => s.setupType));
  for (const s of setups) {
    await db
      .insert(airKitSetups)
      .values({ ...s, airKitId: id })
      .onConflictDoUpdate({
        target: [airKitSetups.airKitId, airKitSetups.setupType],
        set: {
          pricePiastres: s.pricePiastres,
          featuresEn: s.featuresEn,
          featuresAr: s.featuresAr,
          isActive: true,
        },
      });
  }
  for (const type of SETUP_ORDER) {
    if (!offered.has(type)) {
      await db
        .delete(airKitSetups)
        .where(and(eq(airKitSetups.airKitId, id), eq(airKitSetups.setupType, type)));
    }
  }

  done(locale, back);
}

// Deactivate if the kit has order history (keep the record + setups so past
// orders/receipts stay intact); else hard delete.
export async function deleteAirKitAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isInteger(id)) {
    const current = await getAirKitById(id);
    if (current) {
      if (await airKitHasOrders(id)) {
        await db
          .update(airKits)
          .set({ isActive: false })
          .where(eq(airKits.id, id));
        // Keep it visible to the owner but hidden from the public — navigate
        // back to the (still-existing) detail page.
        const back = String(formData.get("redirectTo") ?? "") || `/${locale}/air-kits`;
        revalidatePath(back);
        redirect(back);
      }
      await db.delete(airKits).where(eq(airKits.id, id)); // cascade setups
      if (current.imageUrl) await deleteImage(current.imageUrl);
    }
  }
  // Hard-deleted — the detail page is gone; go back to the list.
  revalidatePath(`/${locale}/air-kits`);
  redirect(`/${locale}/air-kits`);
}

export async function reactivateAirKitAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || `/${locale}/air-kits`;
  if (Number.isInteger(id)) {
    await db.update(airKits).set({ isActive: true }).where(eq(airKits.id, id));
  }
  revalidatePath(back);
  redirect(back);
}
