import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { formatPrice } from "@/lib/money";

type ReceiptItem = {
  titleEn: string;
  titleAr: string;
  unitPricePiastres: number;
  quantity: number;
};

// Itemized receipt: the order's line items + subtotal, deposit, and balance.
// Shared by the booking confirm page (and reusable elsewhere).
export function OrderReceipt({
  items,
  subtotalPiastres,
  depositPiastres,
  locale,
  dict,
}: {
  items: ReceiptItem[];
  subtotalPiastres: number;
  depositPiastres: number;
  locale: Locale;
  dict: Dictionary;
}) {
  const isAr = locale === "ar";
  const balance = Math.max(0, subtotalPiastres - depositPiastres);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <h2 className="text-sm font-semibold text-ink/70">{dict.booking.items}</h2>

      <ul className="mt-3 divide-y divide-black/10">
        {items.map((it, i) => (
          <li key={i} className="flex items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {isAr ? it.titleAr : it.titleEn}
              </p>
              <p className="text-xs text-ink/50">
                {it.quantity} × {formatPrice(it.unitPricePiastres, locale)}
              </p>
            </div>
            <span className="text-sm font-medium">
              {formatPrice(it.unitPricePiastres * it.quantity, locale)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink/60">{dict.booking.total}</dt>
          <dd className="font-medium">
            {formatPrice(subtotalPiastres, locale)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/60">{dict.booking.depositAmount}</dt>
          <dd className="font-semibold text-accent">
            {formatPrice(depositPiastres, locale)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/60">{dict.booking.balanceDue}</dt>
          <dd className="font-medium">{formatPrice(balance, locale)}</dd>
        </div>
      </dl>
    </div>
  );
}
