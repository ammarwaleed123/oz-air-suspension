import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireStaffOrOwner } from "@/lib/auth-helpers";
import { getCarRequests } from "@/db/queries";
import { setRequestHandledAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function RequestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  // Owner + staff (admin layout already guards; this is the same rule).
  await requireStaffOrOwner(typedLocale);

  const requests = await getCarRequests();
  const r = dict.requests;

  return (
    <div>
      <h2 className="text-xl font-semibold">{r.title}</h2>
      <p className="mt-1 text-sm text-ink/60">{r.intro}</p>

      {requests.length === 0 ? (
        <p className="mt-6 text-ink/60">{r.none}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((req) => {
            const handled = req.status !== "new";
            return (
              <li
                key={req.id}
                className="rounded-xl border border-black/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{req.carMakeModel}</p>
                    <p className="text-sm text-ink/70">
                      {req.contactName} ·{" "}
                      <span dir="ltr">{req.contactPhone}</span>
                      {req.year ? ` · ${req.year}` : ""}
                    </p>
                    {req.notes && (
                      <p className="mt-1 text-sm text-ink/60">
                        {r.notes}: {req.notes}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink/40">
                      {r.date}: {formatDate(req.createdAt, typedLocale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        handled
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {handled ? r.handled : r.isNew}
                    </span>
                    <form action={setRequestHandledAction}>
                      <input type="hidden" name="locale" value={typedLocale} />
                      <input type="hidden" name="id" value={req.id} />
                      <input
                        type="hidden"
                        name="handled"
                        value={handled ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-md border border-black/15 px-3 py-1.5 text-xs"
                      >
                        {handled ? r.markNew : r.markHandled}
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
