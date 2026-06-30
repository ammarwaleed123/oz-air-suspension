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

  const [results, options] = await Promise.all([
    getRims(filters, isOwner), // owner sees deactivated rims too (badged)
    getRimFilterOptions(),
  ]);
  // Which rims have order history (→ deactivate instead of delete).
  const orderedSet = isOwner
    ? await rimIdsWithOrders(results.map((r) => r.id))
    : new Set<number>();
  const error = readStr(sp, "error");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.rims.title}</h1>
      <p className="mt-2 text-ink/60">{dict.rims.subtitle}</p>

      {isOwner && (
        <div className="mt-6 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            {dict.manage.ownerTools}
          </p>
          {error && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error === "image" ? dict.manage.errImage : dict.manage.errGeneric}
            </p>
          )}
          <OwnerDisclosure label={dict.manage.addRim}>
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

      <p className="mt-6 text-sm text-ink/50">
        {results.length} {dict.rims.resultsCount}
      </p>

      {results.length === 0 ? (
        <p className="mt-4 text-ink/60">{dict.rims.noResults}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((rim) => (
            <li key={rim.id} className="flex flex-col rounded-xl border border-black/10 bg-white p-5">
              <div className="mb-3">
                <ProductImage src={rim.imageUrl} alt={localizedName(rim, typedLocale)} />
              </div>
              <span className="text-lg font-semibold">
                {localizedName(rim, typedLocale)}
                {isOwner && !rim.isActive && (
                  <span className="ms-2 rounded-full bg-black/10 px-2 py-0.5 align-middle text-xs font-medium text-ink/60">
                    {dict.manage.hidden}
                  </span>
                )}
              </span>
              {rim.brand && <span className="text-sm text-ink/50">{rim.brand}</span>}
              <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm text-ink/70">
                <dt className="text-ink/50">{dict.rims.diameter}</dt>
                <dd>{rim.diameterInches}&quot;</dd>
                <dt className="text-ink/50">{dict.rims.width}</dt>
                <dd>{rim.widthInches}&quot;</dd>
                <dt className="text-ink/50">{dict.rims.boltPattern}</dt>
                <dd>{rim.boltPattern}</dd>
                <dt className="text-ink/50">{dict.rims.offset}</dt>
                <dd>ET{rim.offsetMm}</dd>
                <dt className="text-ink/50">{dict.rims.finish}</dt>
                <dd>{rim.finish}</dd>
              </dl>
              <span className="mt-4 text-xl font-bold text-accent">
                {formatPrice(rim.pricePiastres, typedLocale)}
              </span>
              <div className="mt-3">
                <AddToCartButton locale={typedLocale} kind="rim" productId={rim.id} label={dict.common.addToCart} />
              </div>

              {isOwner && (
                <div className="mt-3 flex items-center gap-2 border-t border-black/10 pt-3">
                  <OwnerDisclosure label={dict.manage.edit} variant="ghost">
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
                      <ConfirmButton className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700">
                        {orderedSet.has(rim.id) ? dict.manage.deactivate : dict.manage.delete}
                      </ConfirmButton>
                    </form>
                  ) : (
                    <form action={reactivateRimAction}>
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="id" value={rim.id} />
                      <button type="submit" className="rounded-md border border-green-400 px-3 py-1.5 text-xs text-green-700">
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
  const input = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
  return (
    <form action={action} encType="multipart/form-data" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        <span className="text-ink/70">
          {m.image} ({m.optional})
        </span>
        <input type="file" name="image" accept="image/*" className={input} />
        {rim && <span className="text-xs text-ink/50">{m.keepImage}</span>}
      </label>
      <div>
        <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface">
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
      <span className="text-ink/70">{label}</span>
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
  const selectClass = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
  return (
    <form method="get" className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 sm:grid-cols-3 lg:grid-cols-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.diameter}</span>
        <select name="diameter" defaultValue={current.diameter?.toString() ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.diameters.map((d) => (
            <option key={d} value={d}>{d}&quot;</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.width}</span>
        <select name="width" defaultValue={current.width ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.widths.map((w) => (
            <option key={w} value={w}>{w}&quot;</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.boltPattern}</span>
        <select name="boltPattern" defaultValue={current.boltPattern ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.boltPatterns.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.offset}</span>
        <select name="offset" defaultValue={current.offset?.toString() ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.offsets.map((o) => (
            <option key={o} value={o}>ET{o}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.finish}</span>
        <select name="finish" defaultValue={current.finish ?? ""} className={selectClass}>
          <option value="">{dict.rims.any}</option>
          {options.finishes.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-1">
        <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface">
          {dict.rims.apply}
        </button>
        <Link href={`/${locale}/rims`} className="rounded-lg border border-black/15 px-4 py-2 text-sm">
          {dict.rims.clearFilters}
        </Link>
      </div>
    </form>
  );
}
