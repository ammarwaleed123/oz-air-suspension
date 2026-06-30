import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n";
import { getActiveBuilds, getAllBuilds } from "@/db/queries";
import { getSession } from "@/lib/auth-helpers";
import { localizedName } from "@/lib/catalog";
import { BuildsManager } from "@/components/builds-manager";

export const dynamic = "force-dynamic";

export default async function BuildsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const builds = await getActiveBuilds();

  // Owner gets an inline management panel (add/edit/reorder/delete).
  const session = await getSession();
  const isOwner = session?.user?.role === "owner";
  const allBuilds = isOwner ? await getAllBuilds() : [];
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Editorial quote header */}
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
          {dict.builds.quoteHeader}
        </h1>
        <p className="mt-3 text-ink/60">{dict.builds.quoteSub}</p>
      </header>

      {builds.length === 0 ? (
        <p className="mt-12 text-center text-ink/60">{dict.builds.empty}</p>
      ) : (
        <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => (
            <li key={b.id}>
              <figure>
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-black/5">
                  <Image
                    src={b.imageUrl}
                    alt={localizedName(
                      { nameEn: b.titleEn, nameAr: b.titleAr },
                      typedLocale
                    )}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                  <span className="absolute start-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-bold text-surface">
                    {b.year}
                  </span>
                </div>
                <figcaption className="mt-3 text-lg font-semibold">
                  {localizedName(
                    { nameEn: b.titleEn, nameAr: b.titleAr },
                    typedLocale
                  )}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <BuildsManager
          builds={allBuilds}
          locale={typedLocale}
          dict={dict}
          errorCode={sp.error}
        />
      )}
    </div>
  );
}
