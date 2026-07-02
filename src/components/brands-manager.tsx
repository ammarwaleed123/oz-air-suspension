import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Brand } from "@/db/schema";
import { OwnerDisclosure } from "./owner-disclosure";
import { ConfirmButton } from "./confirm-button";
import { createBrandAction, deleteBrandAction } from "@/app/[locale]/brands-actions";

const inputDark =
  "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";

// Owner panel to add / remove brands (the normalized make list).
export function BrandsManager({
  brands,
  locale,
  dict,
  redirectTo,
}: {
  brands: Brand[];
  locale: Locale;
  dict: Dictionary;
  redirectTo: string;
}) {
  const m = dict.manage;
  return (
    <OwnerDisclosure label={m.brandsTitle} variant="ghost" dark>
      <OwnerDisclosure label={m.addBrand} dark>
        <form action={createBrandAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{m.brand} (EN)</span>
            <input name="nameEn" dir="ltr" required placeholder="Volkswagen" className={inputDark} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{m.brand} (AR)</span>
            <input name="nameAr" dir="rtl" required placeholder="فولكس فاجن" className={inputDark} />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              {m.addBrand}
            </button>
          </div>
        </form>
      </OwnerDisclosure>

      {brands.length === 0 ? (
        <p className="mt-4 text-sm text-surface/60">{m.noProducts}</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10">
          {brands.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 py-3">
              <span className="text-sm font-medium text-surface" dir="ltr">
                {b.nameEn} · {b.nameAr}
              </span>
              <form action={deleteBrandAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="redirectTo" value={redirectTo} />
                <input type="hidden" name="id" value={b.id} />
                <ConfirmButton className="rounded-md border border-red-400/60 px-3 py-1.5 text-xs text-red-300">
                  {m.delete}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </OwnerDisclosure>
  );
}
