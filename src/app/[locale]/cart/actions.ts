"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  addProductToCart,
  removeCartItem,
  type ProductKind,
} from "@/lib/cart";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function readLocale(formData: FormData): Locale {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

const KINDS: ProductKind[] = ["air_kit_setup", "coilover", "rim"];

export async function addToCartAction(formData: FormData) {
  const locale = readLocale(formData);

  // SECURITY: adding to a cart requires an account. Enforced here, server-side,
  // regardless of any UI state.
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const kind = String(formData.get("kind") ?? "") as ProductKind;
  const productId = Number.parseInt(String(formData.get("productId") ?? ""), 10);
  if (!KINDS.includes(kind) || !Number.isInteger(productId)) {
    redirect(`/${locale}/cart`);
  }

  // addProductToCart re-validates the product against the DB before inserting.
  await addProductToCart(user.id, kind, productId);

  revalidatePath(`/${locale}/cart`);
  redirect(`/${locale}/cart`);
}

export async function removeFromCartAction(formData: FormData) {
  const locale = readLocale(formData);

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const cartItemId = Number.parseInt(
    String(formData.get("cartItemId") ?? ""),
    10
  );
  if (Number.isInteger(cartItemId)) {
    // Ownership enforced inside removeCartItem (WHERE user_id = me).
    await removeCartItem(user.id, cartItemId);
  }

  revalidatePath(`/${locale}/cart`);
}
