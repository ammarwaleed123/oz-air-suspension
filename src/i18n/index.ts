import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/types";

// Dictionaries are loaded server-side only and cached per request by the
// module system. Keep them as dynamic imports so each locale can be split.
const loaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  ar: () => import("./dictionaries/ar"),
  en: () => import("./dictionaries/en"),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const mod = await loaders[locale]();
  return mod.default;
}

export type { Dictionary };
