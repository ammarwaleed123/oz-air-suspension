// Shared input validation for accounts. Used by the signup action and the
// create-user CLI so the rules live in one place.

// Requires a real-looking address: local@domain.tld with a TLD of 2+ chars.
// Rejects values like "ammar@gma" (no dot/TLD) that the HTML email input and
// zod's lenient .email() would otherwise allow.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.([^\s@.]{2,})$/;

// Allowlist of common top-level domains, so typos like ".cok"/".con" are caught
// while real addresses pass. Covers generic + GCC/MENA + major country codes.
// (Add more here if a legitimate address is ever rejected.)
const COMMON_TLDS = new Set([
  // generic
  "com", "net", "org", "edu", "gov", "mil", "int", "info", "biz", "name",
  "pro", "io", "co", "me", "app", "dev", "xyz", "online", "site", "store",
  "shop", "tech", "cloud", "ai", "live", "email",
  // MENA / GCC
  "eg", "sa", "ae", "kw", "qa", "bh", "om", "jo", "lb", "ly", "sd", "ma",
  "tn", "dz", "iq", "ye", "ps",
  // other common country codes
  "uk", "us", "ca", "de", "fr", "it", "es", "nl", "se", "no", "dk", "fi",
  "ch", "be", "at", "ie", "pt", "gr", "pl", "ro", "cz", "au", "nz", "in",
  "pk", "bd", "tr", "ru", "ua", "cn", "jp", "kr", "hk", "sg", "my", "id",
  "ph", "th", "vn", "br", "mx", "ar", "cl", "za", "ng", "ke",
]);

export function isValidEmail(email: string): boolean {
  if (email.length > 200) return false;
  const m = EMAIL_RE.exec(email);
  if (!m) return false;
  return COMMON_TLDS.has(m[1].toLowerCase());
}

// Convert Arabic-Indic (٠-٩) and Extended Arabic-Indic / Persian (۰-۹) digits
// to ASCII. On the Arabic form these are what a phone keyboard usually emits,
// and JS \d only matches ASCII 0-9 — without this, a perfectly valid number
// typed in Arabic numerals would be stripped to nothing.
export function toAsciiDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

// Egyptian mobile numbers: 11 digits starting 010/011/012/015, optionally
// written with a +20 / 20 / 0020 country prefix. Returns a canonical
// "+20XXXXXXXXXX" string, or null if the number isn't a valid EG mobile.
export function normalizeEgyptPhone(raw: string): string | null {
  // Normalize digit script first, then keep digits only (drops +, spaces, etc).
  let digits = toAsciiDigits(raw).replace(/\D/g, "");

  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);

  // After stripping the prefix we expect a 10-digit subscriber number whose
  // first two digits are 1 followed by a valid operator code (0/1/2/5).
  if (!/^1[0125]\d{8}$/.test(digits)) return null;

  return `+20${digits}`;
}
