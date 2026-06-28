import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n";

export function SiteFooter({
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  return (
    <footer className="border-t border-black/10 bg-ink text-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm">
        <span className="font-semibold">{dict.meta.siteName}</span>
        <span className="text-surface/70">{dict.footer.location}</span>
        <span className="text-surface/50">
          © {new Date().getFullYear()} {dict.footer.rights}
        </span>
      </div>
    </footer>
  );
}
