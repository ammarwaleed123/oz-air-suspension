"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeLabel, type Locale } from "@/i18n/config";

// Swaps the leading /<locale> segment of the current path and remembers the
// choice in a cookie (read by middleware on future visits).
export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(target: Locale) {
    if (target === current) return;
    document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000`;
    const rest = pathname.replace(/^\/(ar|en)/, "");
    router.push(`/${target}${rest || ""}`);
    router.refresh();
  }

  // Exactly two locales — render a single pill button that toggles to the
  // other one and is labelled with that target language.
  const target: Locale = current === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => switchTo(target)}
      aria-label={localeLabel[target]}
      className="rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium text-surface transition-colors hover:border-white/60 hover:bg-white/5"
    >
      {localeLabel[target]}
    </button>
  );
}
