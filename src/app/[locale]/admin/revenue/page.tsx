import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireOwner } from "@/lib/auth-helpers";
import { getRevenueSummary } from "@/db/queries";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  // OWNER ONLY — independent guard. Even though the layout allows staff, this
  // money page additionally requires owner, so staff hitting the URL get 404.
  await requireOwner(typedLocale);

  const revenue = await getRevenueSummary();

  return (
    <div>
      <h2 className="text-xl font-semibold">{dict.admin.revenueTitle}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-coal p-5">
          <p className="text-sm text-surface/50">{dict.admin.revenueTotal}</p>
          <p className="mt-1 text-2xl font-bold text-accent">
            {formatPrice(revenue.totalPiastres, typedLocale)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-coal p-5">
          <p className="text-sm text-surface/50">{dict.admin.paidOrders}</p>
          <p className="mt-1 text-2xl font-bold">{revenue.paidOrders}</p>
        </div>
      </div>
    </div>
  );
}
