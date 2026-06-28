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

  return (
    <div className="flex items-center gap-1 text-sm">
      {locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-ink/30">/</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            aria-current={l === current ? "true" : undefined}
            className={
              l === current
                ? "font-semibold text-ink"
                : "text-ink/60 hover:text-ink"
            }
          >
            {localeLabel[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
