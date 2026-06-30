"use client";

import { useActionState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";
import {
  createStaffAction,
  type StaffState,
} from "@/app/[locale]/admin/staff/actions";

const input = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";
const inputErr = "w-full rounded-lg border border-red-400 bg-white px-3 py-2 text-sm";

type FieldKey = "name" | "email" | "phone" | "password";

// Client form so validation errors keep the form OPEN and point at the exact
// field, with the typed values preserved (password aside).
export function StaffForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const [state, formAction, pending] = useActionState<StaffState, FormData>(
    createStaffAction,
    {}
  );
  const s = dict.staff;
  const auth = dict.auth as Record<string, string>;
  const v = state.values;

  const fieldMsg = (key: FieldKey) => {
    const code = state.fieldErrors?.[key];
    return code ? auth[code] ?? auth.genericError : null;
  };

  const Msg = ({ field }: { field: FieldKey }) => {
    const msg = fieldMsg(field);
    return msg ? (
      <span role="alert" className="text-xs text-red-700">
        {msg}
      </span>
    ) : null;
  };

  return (
    <form action={formAction} noValidate className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />

      {state.ok && (
        <p className="sm:col-span-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          ✓ {s.created}
        </p>
      )}
      {state.error && (
        <p role="alert" className="sm:col-span-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {auth.genericError}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{s.name}</span>
        <input name="name" required defaultValue={v?.name ?? ""}
          aria-invalid={Boolean(fieldMsg("name"))}
          className={fieldMsg("name") ? inputErr : input} />
        <Msg field="name" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{s.email}</span>
        <input name="email" type="email" dir="ltr" required defaultValue={v?.email ?? ""}
          placeholder="name@gmail.com"
          aria-invalid={Boolean(fieldMsg("email"))}
          className={fieldMsg("email") ? inputErr : input} />
        <Msg field="email" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{s.phone}</span>
        <input name="phone" type="tel" dir="ltr" required defaultValue={v?.phone ?? ""}
          placeholder="01XXXXXXXXX"
          aria-invalid={Boolean(fieldMsg("phone"))}
          className={fieldMsg("phone") ? inputErr : input} />
        <Msg field="phone" />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-ink/70">{s.password}</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password"
          aria-invalid={Boolean(fieldMsg("password"))}
          className={fieldMsg("password") ? inputErr : input} />
        <Msg field="password" />
      </label>

      <div className="sm:col-span-2">
        <button type="submit" disabled={pending}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60">
          {s.create}
        </button>
      </div>
    </form>
  );
}
