"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  airKits,
  airKitSetups,
  airKitFitments,
  airKitFitmentPrices,
} from "@/db/schema";
import { getAirKitById, airKitHasOrders } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";
import { revalidateCatalog } from "@/lib/cache";
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

// Read the four setups' SHARED feature lists (no price — prices are per car).
// A setup is "offered" when it has features in both languages.
function readSetupFeatures(formData: FormData) {
  return SETUP_ORDER.flatMap((type) => {
    const featuresEn = parseLines(String(formData.get(`featuresEn_${type}`) ?? ""));
    const featuresAr = parseLines(String(formData.get(`featuresAr_${type}`) ?? ""));
    if (featuresEn.length === 0 && featuresAr.length === 0) return [];
    return [{ setupType: type, featuresEn, featuresAr }];
  });
}

function featuresBilingual(setups: ReturnType<typeof readSetupFeatures>): boolean {
  return setups.every((s) => s.featuresEn.length > 0 && s.featuresAr.length > 0);
}

// Read the per-car prices for each setup (positive values only).
function readSetupPrices(formData: FormData) {
  return SETUP_ORDER.flatMap((type) => {
    const raw = String(formData.get(`price_${type}`) ?? "").trim();
    if (!raw) return [];
    const price = egp(raw);
    if (!Number.isFinite(price) || price <= 0) return [];
    return [{ setupType: type, pricePiastres: price }];
  });
}

function done(locale: Locale, back?: string) {
  revalidateCatalog();
  revalidatePath(`/${locale}/air-kits`);
  if (back) revalidatePath(back);
}

// ── Air kit PRODUCTS (title + image + shared setups/features) ────────

export async function createAirKitAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const titleAr = String(formData.get("titleAr") ?? "").trim();
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim() || null;
  const descriptionAr = String(formData.get("descriptionAr") ?? "").trim() || null;
  if (!titleEn || !titleAr) redirect(`/${locale}/air-kits?error=generic`);

  const setups = readSetupFeatures(formData);
  if (setups.length === 0) redirect(`/${locale}/air-kits?error=generic`);
  if (!featuresBilingual(setups)) redirect(`/${locale}/air-kits?error=features`);

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
    .values({ titleEn, titleAr, descriptionEn, descriptionAr, imageUrl })
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

  const setups = readSetupFeatures(formData);
  if (setups.length === 0) redirect(`/${locale}/air-kits?error=generic`);
  if (!featuresBilingual(setups)) redirect(`/${locale}/air-kits?error=features`);

  let imageUrl = current!.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "air-kits");
      if (current!.imageUrl) await deleteImage(current!.imageUrl);
    } catch (e) {
      redirect(`/${locale}/air-kits?error=${e instanceof UploadError ? "image" : "generic"}`);
    }
  }

  await db
    .update(airKits)
    .set({ titleEn, titleAr, descriptionEn, descriptionAr, imageUrl })
    .where(eq(airKits.id, id));

  // Reconcile the setups' feature templates.
  const offered = new Set(setups.map((s) => s.setupType));
  for (const s of setups) {
    await db
      .insert(airKitSetups)
      .values({ ...s, airKitId: id })
      .onConflictDoUpdate({
        target: [airKitSetups.airKitId, airKitSetups.setupType],
        set: { featuresEn: s.featuresEn, featuresAr: s.featuresAr, isActive: true },
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

export async function deleteAirKitAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || `/${locale}/air-kits`;
  if (Number.isInteger(id)) {
    const current = await getAirKitById(id);
    if (current) {
      if (await airKitHasOrders(id)) {
        await db.update(airKits).set({ isActive: false }).where(eq(airKits.id, id));
        revalidatePath(back);
        redirect(back);
      }
      await db.delete(airKits).where(eq(airKits.id, id)); // cascade setups + fitments
      if (current.imageUrl) await deleteImage(current.imageUrl);
    }
  }
  revalidateCatalog();
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
  revalidateCatalog();
  revalidatePath(back);
  redirect(back);
}

// ── Fitments: assign a kit to a car with that car's prices ───────────

export async function assignAirKitAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const airKitId = Number.parseInt(String(formData.get("airKitId") ?? ""), 10);
  const carId = Number.parseInt(String(formData.get("carId") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || `/${locale}/air-kits`;
  if (!Number.isInteger(airKitId) || !Number.isInteger(carId)) {
    redirect(`${back}?error=generic`);
  }

  const prices = readSetupPrices(formData);
  if (prices.length === 0) redirect(`${back}?error=generic`);

  // One air kit per car (unique car_id). Bail if already fitted.
  const existing = await db.query.airKitFitments.findFirst({
    where: eq(airKitFitments.carId, carId),
  });
  if (existing) redirect(`${back}?error=airkit_exists`);

  const [fit] = await db
    .insert(airKitFitments)
    .values({ airKitId, carId })
    .returning({ id: airKitFitments.id });
  await db
    .insert(airKitFitmentPrices)
    .values(prices.map((p) => ({ ...p, fitmentId: fit.id })));

  revalidateCatalog();
  revalidatePath(back);
  redirect(back);
}

export async function updateFitmentPricesAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const fitmentId = Number.parseInt(String(formData.get("fitmentId") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || `/${locale}/air-kits`;
  if (!Number.isInteger(fitmentId)) redirect(`${back}?error=generic`);

  const prices = readSetupPrices(formData);
  const offered = new Set(prices.map((p) => p.setupType));
  for (const p of prices) {
    await db
      .insert(airKitFitmentPrices)
      .values({ ...p, fitmentId })
      .onConflictDoUpdate({
        target: [airKitFitmentPrices.fitmentId, airKitFitmentPrices.setupType],
        set: { pricePiastres: p.pricePiastres, isActive: true },
      });
  }
  for (const type of SETUP_ORDER) {
    if (!offered.has(type)) {
      await db
        .delete(airKitFitmentPrices)
        .where(
          and(
            eq(airKitFitmentPrices.fitmentId, fitmentId),
            eq(airKitFitmentPrices.setupType, type)
          )
        );
    }
  }
  revalidateCatalog();
  revalidatePath(back);
  redirect(back);
}

// Remove a car's air-kit assignment. Order snapshots are preserved (the order
// item's FK is set null), so history stays intact.
export async function removeFitmentAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const fitmentId = Number.parseInt(String(formData.get("fitmentId") ?? ""), 10);
  const back = String(formData.get("redirectTo") ?? "") || `/${locale}/air-kits`;
  if (Number.isInteger(fitmentId)) {
    await db.delete(airKitFitments).where(eq(airKitFitments.id, fitmentId));
  }
  revalidateCatalog();
  revalidatePath(back);
  redirect(back);
}
