import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";
import { AuthForm } from "@/components/auth-form";
import { signupAction } from "./actions";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;

  // Already signed in? Skip to the account page.
  if (await getCurrentUser()) redirect(`/${typedLocale}/account`);

  const dict = await getDictionary(typedLocale);
  return (
    <AuthForm
      mode="signup"
      action={signupAction}
      locale={typedLocale}
      dict={dict}
    />
  );
}
