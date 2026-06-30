import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Car } from "@/db/schema";
import { localizedName } from "@/lib/catalog";
import { OwnerDisclosure } from "./owner-disclosure";
import { ConfirmButton } from "./confirm-button";
import {
  createCarAction,
  updateCarAction,
  deleteCarAction,
} from "@/app/[locale]/cars-actions";

const input =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

// Owner panel to create / edit / delete cars. Shown on the air-kits and
// coilovers landing pages (both are car-based). `redirectTo` returns the owner
// to the page they were on after a save.
export function CarsManager({
  cars,
  locale,
  dict,
  redirectTo,
}: {
  cars: Car[];
  locale: Locale;
  dict: Dictionary;
  redirectTo: string;
}) {
  const m = dict.manage;
  return (
    <OwnerDisclosure label={m.manageCars} variant="ghost">
      {/* Add car */}
      <OwnerDisclosure label={m.addCar}>
        <CarForm
          action={createCarAction}
          locale={locale}
          redirectTo={redirectTo}
          dict={dict}
          submitLabel={m.addCar}
        />
      </OwnerDisclosure>

      {cars.length === 0 ? (
        <p className="mt-4 text-sm text-ink/60">{m.noCars}</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/10">
          {cars.map((car) => (
            <li key={car.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {localizedName(car, locale)}
                </span>
                <div className="flex items-center gap-2">
                  <OwnerDisclosure label={m.edit} variant="ghost">
                    <CarForm
                      action={updateCarAction}
                      locale={locale}
                      redirectTo={redirectTo}
                      dict={dict}
                      submitLabel={m.update}
                      car={car}
                    />
                  </OwnerDisclosure>
                  <form action={deleteCarAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <input type="hidden" name="id" value={car.id} />
                    <ConfirmButton
                      confirmText={m.deleteCarWarn}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700"
                    >
                      {m.delete}
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OwnerDisclosure>
  );
}

function CarForm({
  action,
  locale,
  redirectTo,
  dict,
  submitLabel,
  car,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  redirectTo: string;
  dict: Dictionary;
  submitLabel: string;
  car?: Car;
}) {
  const m = dict.manage;
  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {car && <input type="hidden" name="id" value={car.id} />}
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{m.make}</span>
        <input name="make" dir="ltr" required defaultValue={car?.make ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{m.model}</span>
        <input name="model" dir="ltr" required defaultValue={car?.model ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{m.carNameEn}</span>
        <input name="nameEn" dir="ltr" required defaultValue={car?.nameEn ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{m.carNameAr}</span>
        <input name="nameAr" dir="rtl" required defaultValue={car?.nameAr ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{m.yearFrom}</span>
        <input type="number" name="yearStart" min={1950} defaultValue={car?.yearStart ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{m.yearTo}</span>
        <input type="number" name="yearEnd" min={1950} defaultValue={car?.yearEnd ?? ""} className={input} />
      </label>
      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-3">
        <span className="text-ink/70">
          {m.image} ({m.optional})
        </span>
        <input type="file" name="image" accept="image/*" className={input} />
        {car && <span className="text-xs text-ink/50">{m.keepImage}</span>}
      </label>
      <div>
        <button
          type="submit"
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
