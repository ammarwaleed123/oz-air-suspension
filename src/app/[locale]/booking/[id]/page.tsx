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

  const carName = booking.car
    ? localizedName(booking.car, typedLocale)
    : null;
  const subtotal = booking.order?.subtotalPiastres ?? 0;
  const items = booking.order?.items ?? [];

  // A rim reservation has no installable items and a single collection day
  // (start === end). It's framed as "collect & pay", not an install slot.
  const isRimReservation =
    items.length > 0 && items.every((it) => !it.requiresInstall);
  const slot = isRimReservation
    ? formatSlotDate(booking.startDate, typedLocale)
    : `${formatSlotDate(booking.startDate, typedLocale)} → ${formatSlotDate(
        booking.endDate,
        typedLocale
      )}`;

  // ── Confirmed (on-site receipt) ────────────────────────────────────
  if (booking.status === "confirmed" || booking.status === "completed") {
    const ref = orderReference(booking.orderId);
    const qr = await qrDataUrl(orderLookupUrl(ref));
    const shopNumber = shopWhatsAppNumber();
    const waMessage = `${dict.booking.receipt} ${ref} — ${user.name}`;
    const waHref = shopNumber ? whatsAppLink(shopNumber, waMessage) : null;

    return (
      <div className="grow bg-ink text-surface">
        <div className="mx-auto max-w-xl px-4 py-14 sm:py-20">
          <p className="cat-label text-green-400">
            {isRimReservation ? dict.reserve.reservedTitle : dict.booking.confirmedTitle}
          </p>
          <h1 className="display mt-2 text-3xl uppercase sm:text-4xl">
            {isRimReservation ? dict.reserve.reservedTitle : dict.booking.confirmedTitle}
          </h1>
          <p className="mt-3 text-surface/70">
            {isRimReservation ? dict.reserve.reservedMsg : dict.booking.confirmedMsg}
          </p>

          {/* Receipt header: reference + QR */}
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-coal p-5">
            <div className="text-sm">
              <p className="font-mono text-lg font-bold" dir="ltr">
                {ref}
              </p>
              <p className="mt-1 text-surface/60">{user.name}</p>
              {carName && <p className="text-surface/60">{carName}</p>}
              <p className="text-surface/60">{slot}</p>
              <span className="mt-2 inline-block rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-300">
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
                className="rounded-md border border-white/10 bg-white p-1"
              />
              <p className="mt-1 max-w-[7rem] text-[10px] leading-tight text-surface/50">
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
                className="rounded-md bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
              >
                {dict.booking.whatsappCta}
              </a>
            )}
            <Link
              href={`/${typedLocale}/account`}
              className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:border-accent"
            >
              {dict.nav.account}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Held: expired vs payable ───────────────────────────────────────
  const expired =
    !booking.expiresAt || new Date(booking.expiresAt).getTime() <= Date.now();

  if (booking.status !== "held" || expired) {
    return (
      <div className="grow bg-ink text-surface">
        <div className="mx-auto max-w-xl px-4 py-14 sm:py-20">
          <h1 className="display text-3xl uppercase sm:text-4xl">{dict.booking.depositToLock}</h1>
          <p className="mt-4 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {dict.booking.holdExpired}
          </p>
          <Link
            href={`/${typedLocale}/booking`}
            className="mt-4 inline-block font-semibold text-accent underline"
          >
            {dict.booking.pickAnother}
          </Link>
        </div>
      </div>
    );
  }

  // Held and still valid — show deposit + countdown + pay button.
  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-xl px-4 py-14 sm:py-20">
        <h1 className="display text-3xl uppercase sm:text-4xl">{dict.booking.depositToLock}</h1>

        <div className="mt-6 rounded-xl border border-white/10 bg-coal p-5 text-sm">
          <p className="mb-2 text-surface/50">
            {dict.booking.orderRef}
            {booking.orderId}
          </p>
          {carName && (
            <p className="mb-2">
              <span className="text-surface/50">{dict.booking.carLabel}: </span>
              {carName}
            </p>
          )}
          <p>
            <span className="text-surface/50">{dict.booking.yourSlot}: </span>
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

        <div className="mt-5 flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
          <span className="text-sm text-surface/70">{dict.booking.holdNote}</span>
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
            className="w-full rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          >
            {dict.booking.markPaid}
          </button>
        </form>
      </div>
    </div>
  );
}
