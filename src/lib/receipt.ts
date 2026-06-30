import "server-only";
import QRCode from "qrcode";

// Human-friendly order reference derived from the order id (e.g. OZ-00042).
export function orderReference(orderId: number): string {
  return `OZ-${String(orderId).padStart(5, "0")}`;
}

// Parse a reference back to an order id (for the owner's lookup). Tolerant of
// case and surrounding whitespace.
export function parseOrderRef(ref: string): number | null {
  const m = /^OZ-?0*(\d+)$/i.exec(ref.trim());
  if (!m) return null;
  const id = Number.parseInt(m[1], 10);
  return Number.isInteger(id) ? id : null;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// The QR encodes a deep link to the owner's lookup, pre-filled with the
// reference, so scanning it (while signed in as owner/staff) opens the order.
export function orderLookupUrl(ref: string): string {
  return `${SITE_URL}/ar/admin/lookup?ref=${encodeURIComponent(ref)}`;
}

// PNG data URL for the QR — rendered into an <img> on the receipt (no client JS).
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 220 });
}

// Normalize a shop number to full international digits for wa.me (which wants
// country code, no "+", no leading zero). Handles the common Egyptian inputs:
//   +201097691901 / 201097691901 -> 201097691901
//   01097691901 (local)          -> 201097691901
//   00201097691901               -> 201097691901
export function toWhatsAppDigits(shopNumber: string): string {
  let digits = shopNumber.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2); // 0020… -> 20…
  // Local Egyptian mobile (11 digits starting 0) -> prepend country code 20.
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `20${digits.slice(1)}`;
  }
  return digits;
}

// wa.me tap-to-message link to the shop's number with a pre-filled message.
// Uses the free WhatsApp deep link — NOT the paid Business API.
export function whatsAppLink(shopNumber: string, message: string): string {
  const digits = toWhatsAppDigits(shopNumber);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function shopWhatsAppNumber(): string {
  return process.env.OWNER_WHATSAPP ?? "";
}
