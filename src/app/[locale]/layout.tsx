import type { Metadata } from "next";
import "../globals.css";
import {
  isLocale,
  defaultLocale,
  localeDirection,
  type Locale,
} from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export async function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: {
      default: dict.meta.siteName,
      template: `%s · ${dict.meta.siteName}`,
    },
    description: dict.meta.tagline,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Middleware guarantees a valid locale prefix; fall back defensively rather
  // than throwing, since this layout owns the <html> shell.
  const typedLocale: Locale = isLocale(locale) ? locale : defaultLocale;
  const dict = await getDictionary(typedLocale);
  const dir = localeDirection[typedLocale];

  return (
    <html lang={typedLocale} dir={dir}>
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader locale={typedLocale} dict={dict} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={typedLocale} dict={dict} />
      </body>
    </html>
  );
}
