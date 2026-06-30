import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireOwner } from "@/lib/auth-helpers";
import { getStaffList } from "@/db/queries";
import { OwnerDisclosure } from "@/components/owner-disclosure";
import { ConfirmButton } from "@/components/confirm-button";
import { StaffForm } from "@/components/staff-form";
import { setStaffActiveAction, removeStaffAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  // OWNER ONLY — staff hitting this get a 404 (admin layout lets staff in, this
  // page does not).
  await requireOwner(typedLocale);

  const staff = await getStaffList();
  const s = dict.staff;

  return (
    <div>
      <h2 className="text-xl font-semibold">{s.title}</h2>
      <p className="mt-1 text-sm text-ink/60">{s.intro}</p>
      <p className="mt-1 text-xs text-ink/40">{s.selfNote}</p>

      <div className="mt-5">
        <OwnerDisclosure label={s.addStaff}>
          <StaffForm locale={typedLocale} dict={dict} />
        </OwnerDisclosure>
      </div>

      {staff.length === 0 ? (
        <p className="mt-6 text-ink/60">{s.none}</p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
          {staff.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm text-ink/60" dir="ltr">{m.email} · {m.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.isActive ? "bg-green-100 text-green-800" : "bg-black/10 text-ink/60"
                  }`}
                >
                  {m.isActive ? s.active : s.inactive}
                </span>
                <form action={setStaffActiveAction}>
                  <input type="hidden" name="locale" value={typedLocale} />
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="active" value={m.isActive ? "false" : "true"} />
                  <button type="submit" className="rounded-md border border-black/15 px-3 py-1.5 text-xs">
                    {m.isActive ? s.deactivate : s.activate}
                  </button>
                </form>
                <form action={removeStaffAction}>
                  <input type="hidden" name="locale" value={typedLocale} />
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmButton className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700">
                    {s.remove}
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
