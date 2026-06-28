import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "./actions";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;

  if (await getCurrentUser()) redirect(`/${typedLocale}/account`);

  const dict = await getDictionary(typedLocale);
  return (
    <AuthForm
      mode="login"
      action={loginAction}
      locale={typedLocale}
      dict={dict}
    />
  );
}
