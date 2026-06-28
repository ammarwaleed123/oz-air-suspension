"use server";

import { redirect } from "next/navigation";
import { eq, or } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { isValidEmail, normalizeEgyptPhone } from "@/lib/validation";
import { signIn } from "@/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

export type SignupFieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

export type SignupState = {
  error?: string;
  fieldErrors?: SignupFieldErrors;
  // Echoed back so the form can repopulate after an error (React 19 resets
  // uncontrolled forms once the action returns). Password is never echoed.
  values?: { name: string; email: string; phone: string };
};

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // Keep what the user typed so we can echo it back on any error.
  const values = { name, email, phone: phoneRaw };

  // Per-field validation so the form can point at the exact problem.
  const fieldErrors: SignupFieldErrors = {};
  if (name.length < 2) fieldErrors.name = "nameTooShort";
  if (!isValidEmail(email)) fieldErrors.email = "invalidEmail";
  const phone = normalizeEgyptPhone(phoneRaw);
  if (!phone) fieldErrors.phone = "invalidPhone";
  if (password.length < 8) fieldErrors.password = "passwordTooShort";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  // Uniqueness — surfaced on the relevant field. (The DB unique indexes remain
  // the real guarantee; see the catch below for the race.)
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
    // SECURITY: role is hard-coded to "customer". There is no role input on
    // this form, so public signup can never create staff or owner.
    await db.insert(users).values({
      name,
      email,
      phone: phone!,
      passwordHash,
      role: "customer",
    });
  } catch {
    // Unique violation from a concurrent signup, or any insert failure.
    return { error: "genericError", values };
  }

  // Establish the session, then send them to their account.
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    redirect(`/${locale}/login`);
  }
  redirect(`/${locale}/account`);
}
