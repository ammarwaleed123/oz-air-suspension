import type { Locale } from "@/i18n/config";
import type { ProductKind } from "@/lib/cart";
import { addToCartAction } from "@/app/[locale]/cart/actions";

// Server-rendered form button. The action enforces auth + re-validates the
// product server-side, so this stays a dumb, progressively-enhanced form.
export function AddToCartButton({
  locale,
  kind,
  productId,
  label,
  className,
}: {
  locale: Locale;
  kind: ProductKind;
  productId: number;
  label: string;
  className?: string;
}) {
  return (
    <form action={addToCartAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        className={
          className ??
          "w-full rounded-lg bg-ink px-3 py-2 text-sm font-medium text-surface"
        }
      >
        {label}
      </button>
    </form>
  );
}
