import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { requireUser } from "@/lib/auth-helpers";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);

  // Guard: must be signed in (redirects to login otherwise).
  const user = await requireUser(typedLocale);

  const roleLabel =
    user.role === "owner"
      ? dict.account.roleOwner
      : user.role === "staff"
        ? dict.account.roleStaff
        : dict.account.roleCustomer;

  const isAdmin = user.role === "owner" || user.role === "staff";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">{dict.account.title}</h1>

      <dl className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-black/10 bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink/50">{dict.auth.name}</dt>
          <dd className="font-medium">{user.name}</dd>
        </div>
        <div>
          <dt className="text-ink/50">{dict.auth.email}</dt>
          <dd className="font-medium">{user.email}</dd>
        </div>
        <div>
          <dt className="text-ink/50">{dict.auth.phone}</dt>
          <dd className="font-medium">{user.phone}</dd>
        </div>
        <div>
          <dt className="text-ink/50">{dict.account.role}</dt>
          <dd className="font-medium">{roleLabel}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/${typedLocale}/cart`}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium"
        >
          {dict.account.myCart}
        </Link>
        {isAdmin && (
          <Link
            href={`/${typedLocale}/admin`}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium"
          >
            {dict.account.adminArea}
          </Link>
        )}
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={typedLocale} />
          <button
            type="submit"
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-surface"
          >
            {dict.nav.signOut}
          </button>
        </form>
      </div>
    </div>
  );
}
