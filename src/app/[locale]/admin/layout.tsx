import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireStaffOrOwner } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// Guards EVERY admin route: only staff or owner may enter. A signed-in
// customer hitting any /admin path gets a 404 (also hides admin existence);
// an anonymous visitor is redirected to login. The role is read fresh from the
// DB on each request, so revoked access takes effect immediately.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  const user = await requireStaffOrOwner(typedLocale);
  const roleLabel =
    user.role === "owner" ? dict.account.roleOwner : dict.account.roleStaff;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{dict.admin.title}</h1>
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-surface">
          {dict.admin.yourRole}: {roleLabel}
        </span>
      </div>
      <p className="mt-1 text-ink/60">{dict.admin.intro}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
