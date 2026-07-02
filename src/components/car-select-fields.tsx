import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import { localizedName } from "@/lib/catalog";

type CarOption = { id: number; nameEn: string; nameAr: string };

// A required dropdown of EXISTING cars. Car creation is a separate flow
// (CarsManager), so product forms just pick a car here.
export function CarSelect({
  cars,
  locale,
  dict,
  inputClass,
  dark = false,
}: {
  cars: CarOption[];
  locale: Locale;
  dict: Dictionary;
  inputClass: string;
  dark?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className={dark ? "text-surface/70" : "text-ink/70"}>
        {dict.manage.car}
      </span>
      <select name="carId" required defaultValue="" className={inputClass}>
        <option value="" disabled>
          {dict.manage.chooseCar}
        </option>
        {cars.map((c) => (
          <option key={c.id} value={c.id}>
            {localizedName(c, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
