"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

type FieldKey = "name" | "email" | "phone" | "password";
type State = {
  error?: string;
  fieldErrors?: Partial<Record<FieldKey, string>>;
  values?: { name: string; email: string; phone: string };
};
type Action = (prev: State, formData: FormData) => Promise<State>;

const inputClass =
  "w-full rounded-lg border border-white/15 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40 focus:border-accent focus:outline-none";
const inputErrorClass =
  "w-full rounded-lg border border-red-400 bg-coal px-3 py-2 text-sm text-surface placeholder:text-surface/40 focus:outline-none";

// Shared client form for both signup and login. `mode` switches the fields and
// links; the server action handles validation + auth and redirects on success.
export function AuthForm({
  mode,
  action,
  locale,
  dict,
}: {
  mode: "signup" | "login";
  action: Action;
  locale: Locale;
  dict: Dictionary;
}) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    action,
    {}
  );

  const auth = dict.auth as Record<string, string>;
  // Top-level (non-field) error.
  const errorText = state.error ? auth[state.error] ?? auth.genericError : null;

  // Localized message for a given field's error code, if any.
  const fieldError = (key: FieldKey) => {
    const code = state.fieldErrors?.[key];
    return code ? auth[code] ?? auth.genericError : null;
  };

  const isSignup = mode === "signup";
  // After a failed submit React resets the form; re-seed from echoed values so
  // the user doesn't lose what they typed.
  const v = state.values;

  const FieldMsg = ({ field }: { field: FieldKey }) => {
    const msg = fieldError(field);
    return msg ? (
      <span role="alert" className="text-xs text-red-300">
        {msg}
      </span>
    ) : null;
  };

  return (
    <div className="grow bg-ink text-surface">
      <div className="mx-auto max-w-md px-4 py-14 sm:py-20">
        <p className="cat-label">{dict.nav.account}</p>
        <h1 className="display mt-2 text-4xl uppercase sm:text-5xl">
          {isSignup ? dict.auth.signupTitle : dict.auth.loginTitle}
        </h1>

      {errorText && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {errorText}
        </p>
      )}

      {/* noValidate: let the server be the source of truth so users get the
          same, localized messages regardless of browser quirks. */}
      <form action={formAction} noValidate className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />

        {isSignup && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{dict.auth.name}</span>
            <input
              name="name"
              type="text"
              required
              defaultValue={v?.name ?? ""}
              autoComplete="name"
              aria-invalid={Boolean(fieldError("name"))}
              className={fieldError("name") ? inputErrorClass : inputClass}
            />
            <FieldMsg field="name" />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-surface/70">{dict.auth.email}</span>
          <input
            name="email"
            type="email"
            required
            inputMode="email"
            defaultValue={v?.email ?? ""}
            placeholder={isSignup ? dict.auth.emailPlaceholder : undefined}
            autoComplete="email"
            aria-invalid={Boolean(fieldError("email"))}
            className={fieldError("email") ? inputErrorClass : inputClass}
          />
          <FieldMsg field="email" />
        </label>

        {isSignup && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-surface/70">{dict.auth.phone}</span>
            <input
              name="phone"
              type="tel"
              required
              inputMode="tel"
              dir="ltr"
              defaultValue={v?.phone ?? ""}
              placeholder={dict.auth.phonePlaceholder}
              autoComplete="tel"
              aria-invalid={Boolean(fieldError("phone"))}
              className={fieldError("phone") ? inputErrorClass : inputClass}
            />
            {fieldError("phone") ? (
              <FieldMsg field="phone" />
            ) : (
              <span className="text-xs text-surface/50">{dict.auth.phoneHint}</span>
            )}
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-surface/70">{dict.auth.password}</span>
          <input
            name="password"
            type="password"
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            aria-invalid={Boolean(fieldError("password"))}
            className={fieldError("password") ? inputErrorClass : inputClass}
          />
          {fieldError("password") ? (
            <FieldMsg field="password" />
          ) : (
            isSignup && (
              <span className="text-xs text-surface/50">
                {dict.auth.passwordHint}
              </span>
            )
          )}
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSignup ? dict.auth.signupCta : dict.auth.loginCta}
        </button>
      </form>

      <p className="mt-6 text-sm text-surface/60">
        {isSignup ? dict.auth.haveAccount : dict.auth.noAccount}{" "}
        <Link
          href={`/${locale}/${isSignup ? "login" : "signup"}`}
          className="font-semibold text-accent underline"
        >
          {isSignup ? dict.auth.toLogin : dict.auth.toSignup}
        </Link>
      </p>
      </div>
    </div>
  );
}
