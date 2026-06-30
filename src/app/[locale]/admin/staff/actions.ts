"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getUserById } from "@/db/queries";
import { hashPassword } from "@/lib/password";
import { isValidEmail, normalizeEgyptPhone } from "@/lib/validation";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

// OWNER ONLY — staff management is never available to staff. Returns the owner.
async function ensureOwner(locale: Locale) {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  if (user.role !== "owner") redirect(`/${locale}/admin`);
  return user;
}

function back(locale: Locale) {
  revalidatePath(`/${locale}/admin/staff`);
  redirect(`/${locale}/admin/staff`);
}

export type StaffFieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};
export type StaffState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: StaffFieldErrors;
  // Echoed back so the form repopulates on error (never the password).
  values?: { name: string; email: string; phone: string };
};

// useActionState signature — returns field-level errors (and keeps the form
// open) instead of redirecting, so the owner sees exactly what's wrong.
export async function createStaffAction(
  _prev: StaffState,
  formData: FormData
): Promise<StaffState> {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { name, email, phone: phoneRaw };

  const fieldErrors: StaffFieldErrors = {};
  if (name.length < 2) fieldErrors.name = "nameTooShort";
  if (!isValidEmail(email)) fieldErrors.email = "invalidEmail";
  const phone = normalizeEgyptPhone(phoneRaw);
  if (!phone) fieldErrors.phone = "invalidPhone";
  if (password.length < 8) fieldErrors.password = "passwordTooShort";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, email), eq(users.phone, phone!)),
  });
  if (existing) {
    return existing.email === email
      ? { fieldErrors: { email: "emailTaken" }, values }
      : { fieldErrors: { phone: "phoneTaken" }, values };
  }

  const passwordHash = await hashPassword(password);
  try {
    // SECURITY: role is hard-coded to "staff" — never owner.
    await db.insert(users).values({
      name,
      email,
      phone: phone!,
      passwordHash,
      role: "staff",
    });
  } catch {
    return { error: "genericError", values };
  }

  // Success — refresh the route so the new member shows in the list.
  revalidatePath(`/${locale}/admin/staff`);
  return { ok: true };
}

// Activate/deactivate a STAFF account. Refuses to touch anyone who isn't staff
// (so the owner's own account can never be affected).
export async function setStaffActiveAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  const active = String(formData.get("active") ?? "") === "true";
  if (Number.isInteger(id)) {
    const target = await getUserById(id);
    if (target && target.role === "staff") {
      await db.update(users).set({ isActive: active }).where(eq(users.id, id));
    }
  }
  back(locale);
}

// Remove a STAFF account (hard delete). Refuses non-staff targets.
export async function removeStaffAction(formData: FormData) {
  const locale = readLocale(formData);
  await ensureOwner(locale);

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (Number.isInteger(id)) {
    // Belt-and-suspenders: only delete a row that is BOTH this id AND role staff.
    await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.role, "staff")));
  }
  back(locale);
}
