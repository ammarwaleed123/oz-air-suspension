import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getUserBooking } from "@/lib/booking";
import { localizedName } from "@/lib/catalog";
import { HoldCountdown } from "@/components/hold-countdown";
import { OrderReceipt } from "@/components/order-receipt";
import {
  orderReference,
  orderLookupUrl,
  qrDataUrl,
  whatsAppLink,
  shopWhatsAppNumber,
} from "@/lib/receipt";
import { markDepositPaidAction } from "./actions";

export const dynamic = "force-dynamic";

function formatSlotDate(dateISO: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateISO}T00:00:00.000Z`));
}

export default async function BookingConfirmPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  const user = await getCurrentUser();
  if (!user) redirect(`/${typedLocale}/login`);

  const bookingId = Number.parseInt(id, 10);
  if (!Number.isInteger(bookingId)) notFound();

  const booking = await getUserBooking(user.id, bookingId);
  if (!booking) notFound();

  const slot = `${formatSlotDate(booking.startDate, typedLocale)} → ${formatSlotDate(
    booking.endDate,
    typedLocale
  )}`;
  const carName = booking.car
    ? localizedName(booking.car, typedLocale)
    : null;
  const subtotal = booking.order?.subtotalPiastres ?? 0;
  const items = booking.order?.items ?? [];

  // ── Confirmed (on-site receipt) ────────────────────────────────────
  if (booking.status === "confirmed" || booking.status === "completed") {
    const ref = orderReference(booking.orderId);
    const qr = await qrDataUrl(orderLookupUrl(ref));
    const shopNumber = shopWhatsAppNumber();
    const waMessage = `${dict.booking.receipt} ${ref} — ${user.name}`;
    const waHref = shopNumber ? whatsAppLink(shopNumber, waMessage) : null;

    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold text-green-700">
          {dict.booking.confirmedTitle}
        </h1>
        <p className="mt-2 text-ink/70">{dict.booking.confirmedMsg}</p>

        {/* Receipt header: reference + QR */}
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-5">
          <div className="text-sm">
            <p className="font-mono text-lg font-bold" dir="ltr">
              {ref}
            </p>
            <p className="mt-1 text-ink/60">{user.name}</p>
            {carName && <p className="text-ink/60">{carName}</p>}
            <p className="text-ink/60">{slot}</p>
            <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              {dict.booking.statusConfirmed}
            </span>
          </div>
          <div className="shrink-0 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={ref}
              width={110}
              height={110}
              className="rounded-md border border-black/10"
            />
            <p className="mt-1 max-w-[7rem] text-[10px] leading-tight text-ink/50">
              {dict.booking.scanHint}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <OrderReceipt
            items={items}
            subtotalPiastres={subtotal}
            depositPiastres={booking.depositPiastres}
            locale={typedLocale}
            dict={dict}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
            >
              {dict.booking.whatsappCta}
            </a>
          )}
          <Link
            href={`/${typedLocale}/account`}
            className="rounded-lg border border-black/15 px-4 py-2.5 text-sm font-semibold"
          >
            {dict.nav.account}
          </Link>
        </div>
      </div>
    );
  }

  // ── Held: expired vs payable ───────────────────────────────────────
  const expired =
    !booking.expiresAt || new Date(booking.expiresAt).getTime() <= Date.now();

  if (booking.status !== "held" || expired) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-2xl font-bold">{dict.booking.depositToLock}</h1>
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {dict.booking.holdExpired}
        </p>
        <Link
          href={`/${typedLocale}/booking`}
          className="mt-4 inline-block font-semibold text-accent underline"
        >
          {dict.booking.pickAnother}
        </Link>
      </div>
    );
  }

  // Held and still valid — show deposit + countdown + pay button.
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">{dict.booking.depositToLock}</h1>

      <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 text-sm">
        <p className="mb-2 text-ink/50">
          {dict.booking.orderRef}
          {booking.orderId}
        </p>
        {carName && (
          <p className="mb-2">
            <span className="text-ink/50">{dict.booking.carLabel}: </span>
            {carName}
          </p>
        )}
        <p>
          <span className="text-ink/50">{dict.booking.yourSlot}: </span>
          {slot}
        </p>
      </div>

      <div className="mt-4">
        <OrderReceipt
          items={items}
          subtotalPiastres={subtotal}
          depositPiastres={booking.depositPiastres}
          locale={typedLocale}
          dict={dict}
        />
      </div>

      <div className="mt-5 flex items-center justify-between rounded-lg bg-black/[0.03] px-4 py-3">
        <span className="text-sm text-ink/70">{dict.booking.holdNote}</span>
        <HoldCountdown
          expiresAtISO={new Date(booking.expiresAt!).toISOString()}
          expiredLabel={dict.booking.holdExpired}
        />
      </div>

      <form action={markDepositPaidAction} className="mt-5">
        <input type="hidden" name="locale" value={typedLocale} />
        <input type="hidden" name="bookingId" value={booking.id} />
        <button
          type="submit"
          className="w-full rounded-lg bg-ink px-4 py-3 text-sm font-semibold text-surface"
        >
          {dict.booking.markPaid}
        </button>
      </form>
    </div>
  );
}
