"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

export async function signOutAction(formData: FormData) {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : defaultLocale;
  await signOut({ redirect: false });
  redirect(`/${locale}`);
}
