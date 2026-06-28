import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function AdminHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  // Layout already enforced staff-or-owner; here we only branch the UI by role.
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <h2 className="font-semibold">{dict.nav.admin}</h2>
        <p className="mt-2 text-sm text-ink/60">
          {dict.admin.scheduleComingSoon}
        </p>
      </div>

      {/* Owner-only entries — staff never see these, AND the routes/queries
          behind them are independently guarded server-side. */}
      {isOwner && (
        <>
          <Link
            href={`/${typedLocale}/admin/revenue`}
            className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent"
          >
            <h2 className="font-semibold">{dict.admin.revenueTitle}</h2>
            <p className="mt-2 text-sm text-ink/60">{dict.admin.ownerOnly}</p>
          </Link>

          <div className="rounded-xl border border-black/10 bg-white p-5">
            <h2 className="font-semibold">{dict.nav.account}</h2>
            <p className="mt-2 text-sm text-ink/60">
              {dict.admin.staffMgmtComingSoon}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
