"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { builds } from "@/db/schema";
import { getAllBuilds, getBuildById } from "@/db/queries";
import { getCurrentUser } from "@/lib/auth-helpers";
import { saveImage, deleteImage, UploadError } from "@/lib/storage";
import { revalidateCatalog } from "@/lib/cache";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

// Builds management is OWNER ONLY — enforced in every action, server-side.
async function ensureOwner(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== "owner") redirect(`/${locale}/builds`);
}

function parseYear(raw: string): number | null {
  const y = Number.parseInt(raw, 10);
  const max = new Date().getFullYear() + 1;
  return Number.isInteger(y) && y >= 1950 && y <= max ? y : null;
}

function backWithError(locale: Locale, code: string): never {
  redirect(`/${locale}/builds?error=${code}`);
}

// Revalidate in place (no redirect → no blank flash).
function done(locale: Locale) {
  revalidateCatalog();
  revalidatePath(`/${locale}/builds`);
}

export async function createBuildAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const year = parseYear(String(formData.get("year") ?? ""));
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const titleAr = String(formData.get("titleAr") ?? "").trim();
  const file = formData.get("image");

  if (!year || !titleEn || !titleAr) backWithError(locale, "generic");
  if (!(file instanceof File) || file.size === 0) backWithError(locale, "image");

  let imageUrl: string;
  try {
    imageUrl = await saveImage(file as File, "builds");
  } catch (e) {
    if (e instanceof UploadError) backWithError(locale, e.code);
    backWithError(locale, "generic");
  }

  const existing = await getAllBuilds();
  await db
    .insert(builds)
    .values({ imageUrl, year, titleEn, titleAr, sortOrder: existing.length });

  done(locale);
}

export async function updateBuildAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const year = parseYear(String(formData.get("year") ?? ""));
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const titleAr = String(formData.get("titleAr") ?? "").trim();
  const file = formData.get("image");

  if (!Number.isInteger(id) || !year || !titleEn || !titleAr) {
    backWithError(locale, "generic");
  }
  const current = await getBuildById(id);
  if (!current) backWithError(locale, "generic");

  let imageUrl = current.imageUrl;
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveImage(file, "builds");
      await deleteImage(current.imageUrl);
    } catch (e) {
      if (e instanceof UploadError) backWithError(locale, e.code);
      backWithError(locale, "generic");
    }
  }

  await db
    .update(builds)
    .set({ year, titleEn, titleAr, imageUrl })
    .where(eq(builds.id, id));
  done(locale);
}

export async function deleteBuildAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isInteger(id)) {
    const current = await getBuildById(id);
    await db.delete(builds).where(eq(builds.id, id));
    if (current) await deleteImage(current.imageUrl);
  }
  done(locale);
}

export async function toggleBuildAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const current = Number.isInteger(id) ? await getBuildById(id) : null;
  if (current) {
    await db
      .update(builds)
      .set({ isActive: !current.isActive })
      .where(eq(builds.id, id));
  }
  done(locale);
}

export async function reorderBuildAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const dir = String(formData.get("dir") ?? "");

  const ordered = await getAllBuilds();
  const idx = ordered.findIndex((b) => b.id === id);
  if (idx !== -1) {
    const swapWith = dir === "up" ? idx - 1 : idx + 1;
    if (swapWith >= 0 && swapWith < ordered.length) {
      [ordered[idx], ordered[swapWith]] = [ordered[swapWith], ordered[idx]];
      await Promise.all(
        ordered.map((b, i) =>
          db.update(builds).set({ sortOrder: i }).where(eq(builds.id, b.id))
        )
      );
    }
  }
  done(locale);
}
