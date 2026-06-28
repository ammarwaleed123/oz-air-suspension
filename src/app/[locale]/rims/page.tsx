import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n";
import { getRims, getRimFilterOptions, type RimFilters } from "@/db/queries";
import { localizedName } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImage } from "@/components/product-image";

// Filtered by query params against live inventory.
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

  const [results, options] = await Promise.all([
    getRims(filters),
    getRimFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.rims.title}</h1>
      <p className="mt-2 text-ink/60">{dict.rims.subtitle}</p>

      <RimFilterForm
        dict={dict}
        locale={typedLocale}
        options={options}
        current={filters}
      />

      <p className="mt-6 text-sm text-ink/50">
        {results.length} {dict.rims.resultsCount}
      </p>

      {results.length === 0 ? (
        <p className="mt-4 text-ink/60">{dict.rims.noResults}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((rim) => (
            <li
              key={rim.id}
              className="flex flex-col rounded-xl border border-black/10 bg-white p-5"
            >
              <div className="mb-3">
                <ProductImage
                  src={rim.imageUrl}
                  alt={localizedName(rim, typedLocale)}
                />
              </div>
              <span className="text-lg font-semibold">
                {localizedName(rim, typedLocale)}
              </span>
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
                <AddToCartButton
                  locale={typedLocale}
                  kind="rim"
                  productId={rim.id}
                  label={dict.common.addToCart}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Server-rendered GET form — submitting reloads the page with query params,
// so filtering needs no client JavaScript.
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
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

  return (
    <form
      method="get"
      className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.diameter}</span>
        <select
          name="diameter"
          defaultValue={current.diameter?.toString() ?? ""}
          className={selectClass}
        >
          <option value="">{dict.rims.any}</option>
          {options.diameters.map((d) => (
            <option key={d} value={d}>
              {d}&quot;
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.width}</span>
        <select
          name="width"
          defaultValue={current.width ?? ""}
          className={selectClass}
        >
          <option value="">{dict.rims.any}</option>
          {options.widths.map((w) => (
            <option key={w} value={w}>
              {w}&quot;
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.boltPattern}</span>
        <select
          name="boltPattern"
          defaultValue={current.boltPattern ?? ""}
          className={selectClass}
        >
          <option value="">{dict.rims.any}</option>
          {options.boltPatterns.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.offset}</span>
        <select
          name="offset"
          defaultValue={current.offset?.toString() ?? ""}
          className={selectClass}
        >
          <option value="">{dict.rims.any}</option>
          {options.offsets.map((o) => (
            <option key={o} value={o}>
              ET{o}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/60">{dict.rims.finish}</span>
        <select
          name="finish"
          defaultValue={current.finish ?? ""}
          className={selectClass}
        >
          <option value="">{dict.rims.any}</option>
          {options.finishes.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>

      <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-1">
        <button
          type="submit"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface"
        >
          {dict.rims.apply}
        </button>
        <Link
          href={`/${locale}/rims`}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm"
        >
          {dict.rims.clearFilters}
        </Link>
      </div>
    </form>
  );
}
