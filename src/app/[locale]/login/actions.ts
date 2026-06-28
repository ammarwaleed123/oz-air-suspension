"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

export type LoginState = { error?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const localeRaw = String(formData.get("locale") ?? "");
  const locale: Locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    // Any auth failure is reported generically (no user enumeration).
    return { error: "invalidCredentials" };
  }

  redirect(`/${locale}/account`);
}
