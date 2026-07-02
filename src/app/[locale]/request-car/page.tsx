import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { submitCarRequestAction } from "./actions";

export const dynamic = "force-dynamic";

const input =
  "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40";

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
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
        <p className="cat-label">{dict.nav.requestCar}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-5xl">{dict.requestCar.title}</h1>
        <p className="mt-4 text-surface/70">{dict.requestCar.subtitle}</p>

        {sp.sent && (
          <p className="mt-6 rounded-lg border border-green-400/50 bg-green-500/10 px-3 py-2 text-sm text-green-200">
            {dict.requestCar.thanks}
          </p>
        )}
        {sp.error && (
          <p className="mt-6 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {dict.auth.invalidInput}
          </p>
        )}

        <form action={submitCarRequestAction} className="mt-8 flex flex-col gap-4">
          <input type="hidden" name="locale" value={typedLocale} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{dict.auth.name}</span>
            <input name="name" required className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{dict.auth.phone}</span>
            <input name="phone" type="tel" dir="ltr" required placeholder="01XXXXXXXXX" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{dict.requestCar.carMakeModel}</span>
            <input name="car" required className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{dict.requestCar.year}</span>
            <input name="year" type="number" required min={1950} max={2027} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{dict.requestCar.notes}</span>
            <textarea name="notes" rows={3} className={input} />
          </label>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          >
            {dict.requestCar.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
