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

const inputLight =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
const inputDark =
  "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";

// Owner-only management panel rendered beneath the public gallery. Uses a
// native <details> for the "Add" form so no client JS is needed. `dark` matches
// the near-black site theme used on the restyled builds gallery.
export function BuildsManager({
  builds,
  locale,
  dict,
  errorCode,
  dark = false,
}: {
  builds: Build[];
  locale: Locale;
  dict: Dictionary;
  errorCode?: string;
  dark?: boolean;
}) {
  const m = dict.manage;
  const b = dict.buildsAdmin;
  const input = dark ? inputDark : inputLight;
  const labelC = dark ? "text-surface/70" : "text-ink/70";
  const subLabelC = dark ? "text-surface/60" : "text-ink/60";
  const hintC = dark ? "text-surface/50" : "text-ink/50";
  const saveBtn = dark
    ? "rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-surface"
    : "rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium";
  const addBtn = dark
    ? "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
    : "rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface";
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
    <section
      className={
        dark
          ? "mt-16 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          : "mt-16 rounded-2xl border border-black/10 bg-black/[0.02] p-5"
      }
    >
      <p className={dark ? "cat-label mb-4" : "mb-3 text-xs font-semibold uppercase tracking-wide text-ink/40"}>
        {m.ownerTools}
      </p>

      {errText && (
        <p
          role="alert"
          className={
            dark
              ? "mt-3 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              : "mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          }
        >
          {errText}
        </p>
      )}

      {/* Add build */}
      <OwnerDisclosure label={m.addBuild} dark={dark}>
        <form
          action={createBuildAction}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="locale" value={locale} />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className={labelC}>{m.image}</span>
            <input type="file" name="image" accept="image/*" required className={input} />
            <span className={`text-xs ${hintC}`}>{m.imageHint}</span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelC}>{b.yearLabel}</span>
            <input type="number" name="year" required min={1950} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelC}>{m.titleEn}</span>
            <input type="text" name="titleEn" required dir="ltr" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={labelC}>{m.titleAr}</span>
            <input type="text" name="titleAr" required dir="rtl" className={input} />
          </label>
          <div className="flex items-end">
            <button type="submit" className={addBtn}>
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
              className={
                dark
                  ? "rounded-xl border border-white/10 bg-coal p-4"
                  : "rounded-xl border border-black/10 bg-white p-4"
              }
            >
              <div className="flex gap-4">
                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-black/20">
                  <Image src={bd.imageUrl} alt={bd.titleEn} fill sizes="80px" className="object-cover" />
                </div>
                <form
                  action={updateBuildAction}
                  className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={bd.id} />
                  <label className="flex flex-col gap-1 text-xs">
                    <span className={subLabelC}>{b.yearLabel}</span>
                    <input type="number" name="year" defaultValue={bd.year} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className={subLabelC}>{m.titleEn}</span>
                    <input type="text" name="titleEn" defaultValue={bd.titleEn} dir="ltr" className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className={subLabelC}>{m.titleAr}</span>
                    <input type="text" name="titleAr" defaultValue={bd.titleAr} dir="rtl" className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className={subLabelC}>{m.image} ({m.optional})</span>
                    <input type="file" name="image" accept="image/*" className={input} />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" className={saveBtn}>
                      {b.save}
                    </button>
                  </div>
                </form>
              </div>

              <div className={`mt-3 flex flex-wrap items-center gap-2 border-t pt-3 ${dark ? "border-white/10" : "border-black/10"}`}>
                <RowButton action={reorderBuildAction} locale={locale} id={bd.id} extra={{ dir: "up" }} label={b.moveUp} disabled={i === 0} dark={dark} />
                <RowButton action={reorderBuildAction} locale={locale} id={bd.id} extra={{ dir: "down" }} label={b.moveDown} disabled={i === builds.length - 1} dark={dark} />
                <RowButton action={toggleBuildAction} locale={locale} id={bd.id} label={bd.isActive ? b.visible : b.hidden} dark={dark} />
                <form action={deleteBuildAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={bd.id} />
                  <ConfirmButton
                    confirmText={m.confirmDelete}
                    className={
                      dark
                        ? "rounded-lg border border-red-400/60 px-3 py-1.5 text-xs text-red-300"
                        : "rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700"
                    }
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
  dark = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  id: number;
  label: string;
  extra?: Record<string, string>;
  danger?: boolean;
  disabled?: boolean;
  dark?: boolean;
}) {
  const cls = danger
    ? dark
      ? "rounded-lg border border-red-400/60 px-3 py-1.5 text-xs text-red-300 disabled:opacity-40"
      : "rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40"
    : dark
      ? "rounded-lg border border-white/20 px-3 py-1.5 text-xs text-surface disabled:opacity-40"
      : "rounded-lg border border-black/15 px-3 py-1.5 text-xs disabled:opacity-40";
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      {extra &&
        Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <button type="submit" disabled={disabled} className={cls}>
        {label}
      </button>
    </form>
  );
}
