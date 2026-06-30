import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { submitCarRequestAction } from "./actions";

export const dynamic = "force-dynamic";

const input = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

export default async function RequestCarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">{dict.requestCar.title}</h1>
      <p className="mt-2 text-ink/60">{dict.requestCar.subtitle}</p>

      {sp.sent && (
        <p className="mt-4 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {dict.requestCar.thanks}
        </p>
      )}
      {sp.error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {dict.auth.invalidInput}
        </p>
      )}

      <form action={submitCarRequestAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={typedLocale} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/70">{dict.auth.name}</span>
          <input name="name" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/70">{dict.auth.phone}</span>
          <input name="phone" type="tel" dir="ltr" required placeholder="01XXXXXXXXX" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/70">{dict.requestCar.carMakeModel}</span>
          <input name="car" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/70">{dict.requestCar.year}</span>
          <input name="year" type="number" required min={1950} max={2027} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-ink/70">{dict.requestCar.notes}</span>
          <textarea name="notes" rows={3} className={input} />
        </label>
        <button type="submit" className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-surface">
          {dict.requestCar.submit}
        </button>
      </form>
    </div>
  );
}
