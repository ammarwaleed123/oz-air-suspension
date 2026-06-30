import Image from "next/image";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Build } from "@/db/schema";
import { OwnerDisclosure } from "./owner-disclosure";
import { ConfirmButton } from "./confirm-button";
import {
  createBuildAction,
  updateBuildAction,
  deleteBuildAction,
  toggleBuildAction,
  reorderBuildAction,
} from "@/app/[locale]/builds/actions";

const input =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

// Owner-only management panel rendered beneath the public gallery. Uses a
// native <details> for the "Add" form so no client JS is needed.
export function BuildsManager({
  builds,
  locale,
  dict,
  errorCode,
}: {
  builds: Build[];
  locale: Locale;
  dict: Dictionary;
  errorCode?: string;
}) {
  const m = dict.manage;
  const b = dict.buildsAdmin;
  const errText = errorCode
    ? (m as Record<string, string>)[
        errorCode === "image"
          ? "errImage"
          : errorCode === "invalid_type" || errorCode === "too_large"
            ? "errImage"
            : "errGeneric"
      ] ?? m.errGeneric
    : null;

  return (
    <section className="mt-16 rounded-2xl border border-black/10 bg-black/[0.02] p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
        {m.ownerTools}
      </p>

      {errText && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {errText}
        </p>
      )}

      {/* Add build */}
      <OwnerDisclosure label={m.addBuild}>
        <form
          action={createBuildAction}
          encType="multipart/form-data"
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="locale" value={locale} />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-ink/70">{m.image}</span>
            <input type="file" name="image" accept="image/*" required className={input} />
            <span className="text-xs text-ink/50">{m.imageHint}</span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/70">{b.yearLabel}</span>
            <input type="number" name="year" required min={1950} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/70">{m.titleEn}</span>
            <input type="text" name="titleEn" required dir="ltr" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink/70">{m.titleAr}</span>
            <input type="text" name="titleAr" required dir="rtl" className={input} />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface"
            >
              {m.add}
            </button>
          </div>
        </form>
      </OwnerDisclosure>

      {/* Existing builds */}
      {builds.length > 0 && (
        <ul className="mt-4 space-y-4">
          {builds.map((bd, i) => (
            <li
              key={bd.id}
              className="rounded-xl border border-black/10 bg-white p-4"
            >
              <div className="flex gap-4">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-black/5">
                  <Image src={bd.imageUrl} alt={bd.titleEn} fill sizes="80px" className="object-cover" />
                </div>
                <form
                  action={updateBuildAction}
                  encType="multipart/form-data"
                  className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={bd.id} />
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-ink/60">{b.yearLabel}</span>
                    <input type="number" name="year" defaultValue={bd.year} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-ink/60">{m.titleEn}</span>
                    <input type="text" name="titleEn" defaultValue={bd.titleEn} dir="ltr" className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-ink/60">{m.titleAr}</span>
                    <input type="text" name="titleAr" defaultValue={bd.titleAr} dir="rtl" className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-ink/60">{m.image} ({m.optional})</span>
                    <input type="file" name="image" accept="image/*" className={input} />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium">
                      {b.save}
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/10 pt-3">
                <RowButton action={reorderBuildAction} locale={locale} id={bd.id} extra={{ dir: "up" }} label={b.moveUp} disabled={i === 0} />
                <RowButton action={reorderBuildAction} locale={locale} id={bd.id} extra={{ dir: "down" }} label={b.moveDown} disabled={i === builds.length - 1} />
                <RowButton action={toggleBuildAction} locale={locale} id={bd.id} label={bd.isActive ? b.visible : b.hidden} />
                <form action={deleteBuildAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={bd.id} />
                  <ConfirmButton
                    confirmText={m.confirmDelete}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700"
                  >
                    {b.delete}
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RowButton({
  action,
  locale,
  id,
  label,
  extra,
  danger,
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  id: number;
  label: string;
  extra?: Record<string, string>;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <button
        type="submit"
        disabled={disabled}
        className={
          danger
            ? "rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40"
            : "rounded-lg border border-black/15 px-3 py-1.5 text-xs disabled:opacity-40"
        }
      >
        {label}
      </button>
    </form>
  );
}
