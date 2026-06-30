import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getUnseenBookingCount } from "@/db/queries";
import { markAllBookingsSeenAction } from "./actions";

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
  const base = `/${typedLocale}`;

  // Layout already enforced staff-or-owner; here we only branch the UI by role.
  const user = await getCurrentUser();
  const isOwner = user?.role === "owner";

  // In-admin "new booking" notification (lightest option — no external service).
  const unseen = await getUnseenBookingCount();

  return (
    <div>
      {/* New-booking notification */}
      {unseen > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3">
          <span className="text-sm font-medium">
            🔔 {unseen} {dict.admin.newBookings}
          </span>
          <form action={markAllBookingsSeenAction}>
            <input type="hidden" name="locale" value={typedLocale} />
            <button
              type="submit"
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-surface"
            >
              {dict.admin.markAllSeen}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`${base}/admin/schedule`}
          className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent"
        >
          <h2 className="font-semibold">{dict.schedule.title}</h2>
          <p className="mt-2 text-sm text-ink/60">{dict.schedule.intro}</p>
        </Link>

        <Link
          href={`${base}/admin/lookup`}
          className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent"
        >
          <h2 className="font-semibold">{dict.admin.findOrder}</h2>
          <p className="mt-2 text-sm text-ink/60">{dict.admin.findOrderIntro}</p>
        </Link>

        {/* Car requests inbox — owner + staff. */}
        <Link
          href={`${base}/admin/requests`}
          className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent"
        >
          <h2 className="font-semibold">{dict.requests.title}</h2>
          <p className="mt-2 text-sm text-ink/60">{dict.requests.intro}</p>
        </Link>

        {/* Owner-only entries — staff never see these, AND the routes/queries
            behind them are independently guarded server-side. */}
        {isOwner && (
          <>
            <Link
              href={`${base}/admin/revenue`}
              className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent"
            >
              <h2 className="font-semibold">{dict.admin.revenueTitle}</h2>
              <p className="mt-2 text-sm text-ink/60">{dict.admin.ownerOnly}</p>
            </Link>

            <Link
              href={`${base}/admin/staff`}
              className="rounded-xl border border-black/10 bg-white p-5 transition-colors hover:border-accent"
            >
              <h2 className="font-semibold">{dict.staff.title}</h2>
              <p className="mt-2 text-sm text-ink/60">{dict.admin.ownerOnly}</p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
