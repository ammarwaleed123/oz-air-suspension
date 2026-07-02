import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import type { Brand, Car } from "@/db/schema";
import { localizedName } from "@/lib/catalog";
import { OwnerDisclosure } from "./owner-disclosure";
import { ConfirmButton } from "./confirm-button";
import {
  createCarAction,
  updateCarAction,
  deleteCarAction,
} from "@/app/[locale]/cars-actions";

const inputLight =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
const inputDark =
  "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";

// Owner panel to create / edit / delete cars. Shown on the air-kits and
// coilovers landing pages (both are car-based). `redirectTo` returns the owner
// to the page they were on after a save. `dark` matches the near-black theme.
export function CarsManager({
  cars,
  brands,
  locale,
  dict,
  redirectTo,
  dark = false,
}: {
  cars: Car[];
  brands: Brand[];
  locale: Locale;
  dict: Dictionary;
  redirectTo: string;
  dark?: boolean;
}) {
  const m = dict.manage;
  return (
    <OwnerDisclosure label={m.manageCars} variant="ghost" dark={dark}>
      {/* Add car */}
      <OwnerDisclosure label={m.addCar} dark={dark}>
        <CarForm
          action={createCarAction}
          locale={locale}
          redirectTo={redirectTo}
          dict={dict}
          submitLabel={m.addCar}
          brands={brands}
          dark={dark}
        />
      </OwnerDisclosure>

      {cars.length === 0 ? (
        <p className={`mt-4 text-sm ${dark ? "text-surface/60" : "text-ink/60"}`}>
          {m.noCars}
        </p>
      ) : (
        <ul className={`mt-4 divide-y ${dark ? "divide-white/10" : "divide-black/10"}`}>
          {cars.map((car) => (
            <li key={car.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-sm font-medium ${dark ? "text-surface" : ""}`}>
                  {localizedName(car, locale)}
                </span>
                <div className="flex items-center gap-2">
                  <OwnerDisclosure label={m.edit} variant="ghost" dark={dark}>
                    <CarForm
                      action={updateCarAction}
                      locale={locale}
                      redirectTo={redirectTo}
                      dict={dict}
                      submitLabel={m.update}
                      car={car}
                      brands={brands}
                      dark={dark}
                    />
                  </OwnerDisclosure>
                  <form action={deleteCarAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <input type="hidden" name="id" value={car.id} />
                    <ConfirmButton
                      confirmText={m.deleteCarWarn}
                      className={
                        dark
                          ? "rounded-md border border-red-400/60 px-3 py-1.5 text-xs text-red-300"
                          : "rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700"
                      }
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
  brands,
  dark = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: Locale;
  redirectTo: string;
  dict: Dictionary;
  submitLabel: string;
  car?: Car;
  brands: Brand[];
  dark?: boolean;
}) {
  const m = dict.manage;
  const input = dark ? inputDark : inputLight;
  const labelC = dark ? "text-surface/70" : "text-ink/70";
  const hintC = dark ? "text-surface/50" : "text-ink/50";
  const submitC = dark
    ? "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
    : "rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface";
  return (
    <form
      action={action}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {car && <input type="hidden" name="id" value={car.id} />}
      <label className="flex flex-col gap-1 text-sm">
        <span className={labelC}>{m.brand}</span>
        <select name="brandId" required defaultValue={car?.brandId ?? ""} className={input}>
          <option value="" disabled>
            {m.chooseBrand}
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {localizedName(b, locale)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={labelC}>{m.model}</span>
        <input name="model" dir="ltr" required placeholder="Golf 5" defaultValue={car?.model ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={labelC}>{m.yearFrom}</span>
        <input type="number" name="yearStart" min={1950} defaultValue={car?.yearStart ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={labelC}>{m.yearTo}</span>
        <input type="number" name="yearEnd" min={1950} defaultValue={car?.yearEnd ?? ""} className={input} />
      </label>
      <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-3">
        <span className={labelC}>
          {m.image} ({m.optional})
        </span>
        <input type="file" name="image" accept="image/*" className={input} />
        {car && <span className={`text-xs ${hintC}`}>{m.keepImage}</span>}
      </label>
      <div>
        <button type="submit" className={submitC}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
