import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireUser } from "@/lib/auth-helpers";
import { getUserBookings } from "@/lib/booking";
import { localizedName } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { signOutAction } from "./actions";

function formatSlot(startISO: string, endISO: string, locale: Locale): string {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${d}T00:00:00.000Z`));
  return `${fmt(startISO)} → ${fmt(endISO)}`;
}

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  // Guard: must be signed in (redirects to login otherwise).
  const user = await requireUser(typedLocale);

  const roleLabel =
    user.role === "owner"
      ? dict.account.roleOwner
      : user.role === "staff"
        ? dict.account.roleStaff
        : dict.account.roleCustomer;

  const isAdmin = user.role === "owner" || user.role === "staff";

  // Owner/staff don't book — only customers have a bookings list.
  const bookings = isAdmin ? [] : await getUserBookings(user.id);
  const statusLabel = (s: string) =>
    s === "confirmed"
      ? dict.booking.statusConfirmed
      : s === "completed"
        ? dict.booking.statusCompleted
        : s === "no_show"
          ? dict.booking.statusNoShow
          : s === "held"
            ? dict.booking.statusHeld
            : dict.booking.statusCancelled;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.account.title}</h1>

      <dl className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink/50">{dict.auth.name}</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-ink/50">{dict.auth.email}</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
        <div>
          <dt className="text-ink/50">{dict.auth.phone}</dt>
          <dd className="font-medium">{user.phone}</dd>
        </div>
        <div>
          <dt className="text-ink/50">{dict.account.role}</dt>
          <dd className="font-medium">{roleLabel}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {!isAdmin && (
          <Link
            href={`/${typedLocale}/cart`}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium"
          >
            {dict.account.myCart}
          </Link>
        )}
        {isAdmin && (
          <Link
            href={`/${typedLocale}/admin`}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium"
          >
            {dict.account.adminArea}
          </Link>
        )}
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={typedLocale} />
          <button
            type="submit"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface"
          >
            {dict.nav.signOut}
          </button>
        </form>
      </div>

      {/* Bookings / receipts — customers only (owner/staff manage via schedule) */}
      {!isAdmin && (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{dict.account.myBookings}</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-ink/60">{dict.account.noBookings}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-4"
              >
                <div>
                  <p className="font-medium">
                    {b.car ? localizedName(b.car, typedLocale) : "—"}
                  </p>
                  <p className="text-sm text-ink/60">
                    {formatSlot(b.startDate, b.endDate, typedLocale)} ·{" "}
                    {statusLabel(b.status)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-accent">
                    {formatPrice(b.depositPiastres, typedLocale)}
                  </span>
                  <Link
                    href={`/${typedLocale}/booking/${b.id}`}
                    className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium"
                  >
                    {dict.account.viewDetails}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </div>
  );
}
