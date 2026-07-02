import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import {
  getRims,
  getRimFilterOptions,
  rimIdsWithOrders,
  type RimFilters,
} from "@/db/queries";
import { localizedName } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { getSession } from "@/lib/auth-helpers";
import { reconcileLapsedRimReservations } from "@/lib/booking";
import type { Rim } from "@/db/schema";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { ConfirmButton } from "@/components/confirm-button";
import {
  createRimAction,
  updateRimAction,
  deleteRimAction,
  reactivateRimAction,
} from "./actions";

export const dynamic = "force-dynamic";

type RawParams = Record<string, string | string[] | undefined>;

function readStr(params: RawParams, key: string): string | undefined {
  const v = params[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length > 0 ? s : undefined;
}
function readInt(params: RawParams, key: string): number | undefined {
  const s = readStr(params, key);
  if (s === undefined) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}

export default async function RimsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  const sp = await searchParams;
  const filters: RimFilters = {
    diameter: readInt(sp, "diameter"),
    width: readStr(sp, "width"),
    boltPattern: readStr(sp, "boltPattern"),
    offset: readInt(sp, "offset"),
    finish: readStr(sp, "finish"),
  };

  const session = await getSession();
  const isOwner = session?.user?.role === "owner";

  // Filter options don't depend on stock, so fetch them WHILE reconciling
  // lapsed rim reservations (which frees stock so listed stock is accurate).
  // getRims must read AFTER reconcile so restored stock is reflected.
  const optionsPromise = getRimFilterOptions();
  await reconcileLapsedRimReservations();
  const [results, options] = await Promise.all([
    getRims(filters, isOwner), // owner sees deactivated rims too (badged)
    optionsPromise,
  ]);
  // Which rims have order history (→ deactivate instead of delete).
  const orderedSet = isOwner
    ? await rimIdsWithOrders(results.map((r) => r.id))
    : new Set<number>();
  const error = readStr(sp, "error");

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <p className="cat-label">{dict.airKits.step1Label}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-6xl">{dict.rims.title}</h1>
        <p className="mt-4 max-w-xl text-surface/70">{dict.rims.subtitle}</p>

        {isOwner && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="cat-label mb-4">{dict.manage.ownerTools}</p>
            {error && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              >
                {error === "image" ? dict.manage.errImage : dict.manage.errGeneric}
              </p>
            )}
            <OwnerDisclosure label={dict.manage.addRim} dark>
              <RimForm
                action={createRimAction}
                locale={typedLocale}
                dict={dict}
                submitLabel={dict.manage.add}
              />
            </OwnerDisclosure>
          </div>
        )}

        <RimFilterForm dict={dict} locale={typedLocale} options={options} current={filters} />

        <p className="mt-6 text-sm text-surface/50">
          {results.length} {dict.rims.resultsCount}
        </p>

        {results.length === 0 ? (
          <p className="mt-4 text-surface/60">{dict.rims.noResults}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((rim) => (
              <li key={rim.id} className="flex flex-col rounded-xl border border-white/10 bg-coal p-5">
                <div className="mb-3 overflow-hidden rounded-lg">
                  <ProductImage src={rim.imageUrl} alt={localizedName(rim, typedLocale)} />
                </div>
                <span className="text-lg font-semibold">
                  {localizedName(rim, typedLocale)}
                  {isOwner && !rim.isActive && (
                    <span className="ms-2 rounded-full bg-white/10 px-2 py-0.5 align-middle text-xs font-medium text-surface/60">
                      {dict.manage.hidden}
                    </span>
                  )}
                </span>
                {rim.brand && <span className="text-sm text-surface/50">{rim.brand}</span>}
                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm text-surface/80">
                  <dt className="text-surface/50">{dict.rims.diameter}</dt>
                  <dd>{rim.diameterInches}&quot;</dd>
                  <dt className="text-surface/50">{dict.rims.width}</dt>
                  <dd>{rim.widthInches}&quot;</dd>
                  <dt className="text-surface/50">{dict.rims.boltPattern}</dt>
                  <dd>{rim.boltPattern}</dd>
                  <dt className="text-surface/50">{dict.rims.offset}</dt>
                  <dd>ET{rim.offsetMm}</dd>
                  <dt className="text-surface/50">{dict.rims.finish}</dt>
                  <dd>{rim.finish}</dd>
                </dl>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <span className="text-xl font-bold text-accent">
                    {formatPrice(rim.pricePiastres, typedLocale)}
                  </span>
                  {rim.stock > 0 ? (
                    <span className="text-xs text-surface/50">
                      {rim.stock} {dict.rims.inStock}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-surface/60">
                      {dict.rims.outOfStock}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  {rim.stock > 0 ? (
                    <AddToCartButton
                      locale={typedLocale}
                      kind="rim"
                      productId={rim.id}
                      label={dict.common.addToCart}
                      className="w-full rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                    />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-md border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-wide text-surface/40"
                    >
                      {dict.rims.outOfStock}
                    </button>
                  )}
                </div>

                {isOwner && (
                  <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
                    <OwnerDisclosure label={dict.manage.edit} variant="ghost" dark>
                      <RimForm
                        action={updateRimAction}
                        locale={typedLocale}
                        dict={dict}
                        submitLabel={dict.manage.update}
                        rim={rim}
                      />
                    </OwnerDisclosure>
                    {rim.isActive ? (
                      <form action={deleteRimAction}>
                        <input type="hidden" name="locale" value={typedLocale} />
                        <input type="hidden" name="id" value={rim.id} />
                        <ConfirmButton className="rounded-md border border-red-400/60 px-3 py-1.5 text-xs text-red-300">
                          {orderedSet.has(rim.id) ? dict.manage.deactivate : dict.manage.delete}
                        </ConfirmButton>
                      </form>
                    ) : (
                      <form action={reactivateRimAction}>
                        <input type="hidden" name="locale" value={typedLocale} />
                        <input type="hidden" name="id" value={rim.id} />
                        <button type="submit" className="rounded-md border border-green-400/60 px-3 py-1.5 text-xs text-green-300">
                          {dict.manage.reactivate}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RimForm({
  action,
  locale,
  dict,
  submitLabel,
  rim,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  dict: Dictionary;
  submitLabel: string;
  rim?: Rim;
}) {
  const m = dict.manage;
  const input =
    "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";
  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <input type="hidden" name="locale" value={locale} />
      {rim && <input type="hidden" name="id" value={rim.id} />}
      <Field label={m.nameEn} name="nameEn" dir="ltr" input={input} required defaultValue={rim?.nameEn} />
      <Field label={m.nameAr} name="nameAr" dir="rtl" input={input} required defaultValue={rim?.nameAr} />
      <Field label={m.brand} name="brand" dir="ltr" input={input} required defaultValue={rim?.brand ?? undefined} />
      <Field label={m.priceEgp} name="price" type="number" input={input} required defaultValue={rim ? String(rim.pricePiastres / 100) : undefined} />
      <Field label={dict.rims.diameter} name="diameter" type="number" input={input} required defaultValue={rim?.diameterInches} />
      <Field label={dict.rims.width} name="width" dir="ltr" input={input} required defaultValue={rim?.widthInches} />
      <Field label={dict.rims.boltPattern} name="boltPattern" dir="ltr" input={input} required defaultValue={rim?.boltPattern} />
      <Field label={dict.rims.offset} name="offset" type="number" input={input} required defaultValue={rim?.offsetMm} />
      <Field label={dict.rims.finish} name="finish" input={input} required defaultValue={rim?.finish} />
      <Field label={m.stock} name="stock" type="number" input={input} defaultValue={rim?.stock} />
      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-3">
        <span className="text-surface/70">
          {m.image} ({m.optional})
        </span>
        <input type="file" name="image" accept="image/*" className={input} />
        {rim && <span className="text-xs text-surface/50">{m.keepImage}</span>}
      </label>
      <div>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  input,
  type = "text",
  dir,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  input: string;
  type?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
  defaultValue?: string | number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-surface/70">{label}</span>
      <input
        type={type}
        name={name}
        dir={dir}
        required={required}
        defaultValue={defaultValue}
        step={type === "number" ? "any" : undefined}
        className={input}
      />
    </label>
  );
}

function RimFilterForm({
  dict,
  locale,
  options,
  current,
}: {
  dict: Dictionary;
  locale: Locale;
  options: {
    diameters: number[];
    widths: string[];
    boltPatterns: string[];
    offsets: number[];
    finishes: string[];
  };
  current: RimFilters;
}) {
  const selectClass =
    "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface";
  return (
    <form method="get" className="mt-8 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3 lg:grid-cols-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/60">{dict.rims.diameter}</span>
        <select name="diameter" defaultValue={current.diameter?.toString() ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.diameters.map((d) => (
            <option key={d} value={d}>{d}&quot;</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/60">{dict.rims.width}</span>
        <select name="width" defaultValue={current.width ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.widths.map((w) => (
            <option key={w} value={w}>{w}&quot;</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/60">{dict.rims.boltPattern}</span>
        <select name="boltPattern" defaultValue={current.boltPattern ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.boltPatterns.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/60">{dict.rims.offset}</span>
        <select name="offset" defaultValue={current.offset?.toString() ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.offsets.map((o) => (
            <option key={o} value={o}>ET{o}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-surface/60">{dict.rims.finish}</span>
        <select name="finish" defaultValue={current.finish ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.finishes.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-1">
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
          {dict.rims.apply}
        </button>
        <Link href={`/${locale}/rims`} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-surface">
          {dict.rims.clearFilters}
        </Link>
      </div>
    </form>
  );
}
