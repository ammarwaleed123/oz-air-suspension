import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { airKitSetups, cartItems, coilovers, rims } from "@/db/schema";
import type { SetupType } from "@/lib/catalog";

// ALL cart money is computed here, server-side, from current DB prices. The
// cart_items table stores no amounts, so a tampered request cannot change what
// a customer is charged.

export type ProductKind = "air_kit_setup" | "coilover" | "rim";

export type CartLine = {
  cartItemId: number;
  kind: ProductKind;
  productId: number;
  quantity: number;
  unitPricePiastres: number;
  lineTotalPiastres: number;
  requiresInstall: boolean;
  nameEn: string;
  nameAr: string;
  setupType?: SetupType; // air kit setups
  manufactureDate?: string; // coilovers
  carId?: number | null; // the car an install item belongs to (not rims)
};

export type CartSummary = {
  lines: CartLine[];
  subtotalPiastres: number;
  installSubtotalPiastres: number;
  depositPercent: number;
  depositPiastres: number;
  itemCount: number;
};

function depositPercent(): number {
  const n = Number.parseInt(process.env.DEPOSIT_PERCENT ?? "10", 10);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

// Build the priced cart for a user. Batches one query per product type to
// avoid N+1; items whose product no longer exists/active are skipped.
export async function computeCart(userId: number): Promise<CartSummary> {
  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.userId, userId))
    .orderBy(cartItems.createdAt);

  const setupIds = items
    .filter((i) => i.kind === "air_kit_setup" && i.airKitSetupId)
    .map((i) => i.airKitSetupId!) as number[];
  const coiloverIds = items
    .filter((i) => i.kind === "coilover" && i.coiloverId)
    .map((i) => i.coiloverId!) as number[];
  const rimIds = items
    .filter((i) => i.kind === "rim" && i.rimId)
    .map((i) => i.rimId!) as number[];

  const [setupRows, coiloverRows, rimRows] = await Promise.all([
    setupIds.length
      ? db.query.airKitSetups.findMany({
          where: and(
            inArray(airKitSetups.id, setupIds),
            eq(airKitSetups.isActive, true)
          ),
          with: { airKit: { with: { car: true } } },
        })
      : Promise.resolve([]),
    coiloverIds.length
      ? db
          .select()
          .from(coilovers)
          .where(
            and(inArray(coilovers.id, coiloverIds), eq(coilovers.isActive, true))
          )
      : Promise.resolve([]),
    rimIds.length
      ? db
          .select()
          .from(rims)
          .where(and(inArray(rims.id, rimIds), eq(rims.isActive, true)))
      : Promise.resolve([]),
  ]);

  const setupMap = new Map(setupRows.map((r) => [r.id, r]));
  const coiloverMap = new Map(coiloverRows.map((r) => [r.id, r]));
  const rimMap = new Map(rimRows.map((r) => [r.id, r]));

  const lines: CartLine[] = [];

  for (const item of items) {
    if (item.kind === "air_kit_setup" && item.airKitSetupId) {
      const s = setupMap.get(item.airKitSetupId);
      if (!s || !s.airKit?.car) continue;
      const unit = s.pricePiastres;
      lines.push({
        cartItemId: item.id,
        kind: "air_kit_setup",
        productId: s.id,
        quantity: item.quantity,
        unitPricePiastres: unit,
        lineTotalPiastres: unit * item.quantity,
        requiresInstall: true,
        nameEn: s.airKit.car.nameEn,
        nameAr: s.airKit.car.nameAr,
        setupType: s.setupType as SetupType,
        carId: s.airKit.car.id,
      });
    } else if (item.kind === "coilover" && item.coiloverId) {
      const c = coiloverMap.get(item.coiloverId);
      if (!c) continue;
      const unit = c.pricePiastres;
      lines.push({
        cartItemId: item.id,
        kind: "coilover",
        productId: c.id,
        quantity: item.quantity,
        unitPricePiastres: unit,
        lineTotalPiastres: unit * item.quantity,
        requiresInstall: true,
        nameEn: c.brand,
        nameAr: c.brand,
        manufactureDate: c.manufactureDate,
        carId: c.carId,
      });
    } else if (item.kind === "rim" && item.rimId) {
      const r = rimMap.get(item.rimId);
      if (!r) continue;
      const unit = r.pricePiastres;
      lines.push({
        cartItemId: item.id,
        kind: "rim",
        productId: r.id,
        quantity: item.quantity,
        unitPricePiastres: unit,
        lineTotalPiastres: unit * item.quantity,
        requiresInstall: false, // rims never require install
        nameEn: r.nameEn,
        nameAr: r.nameAr,
      });
    }
  }

  const subtotalPiastres = lines.reduce((s, l) => s + l.lineTotalPiastres, 0);
  const installSubtotalPiastres = lines
    .filter((l) => l.requiresInstall)
    .reduce((s, l) => s + l.lineTotalPiastres, 0);
  const pct = depositPercent();
  const depositPiastres = Math.round((installSubtotalPiastres * pct) / 100);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return {
    lines,
    subtotalPiastres,
    installSubtotalPiastres,
    depositPercent: pct,
    depositPiastres,
    itemCount,
  };
}

// Total quantity of items in a user's cart (for the header badge).
export async function getCartCount(userId: number): Promise<number> {
  const rows = await db
    .select({ q: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));
  return rows.reduce((sum, r) => sum + r.q, 0);
}

// ── Mutations (validated against the DB before touching the cart) ──────

export async function addProductToCart(
  userId: number,
  kind: ProductKind,
  productId: number
): Promise<void> {
  if (kind === "air_kit_setup") {
    const exists = await db.query.airKitSetups.findFirst({
      where: and(
        eq(airKitSetups.id, productId),
        eq(airKitSetups.isActive, true)
      ),
    });
    if (!exists) throw new Error("Product not found");

    const current = await db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.airKitSetupId, productId)
        )
      );
    // Install items are one-per-car; adding again is a no-op.
    if (current.length === 0) {
      await db.insert(cartItems).values({
        userId,
        kind,
        airKitSetupId: productId,
        quantity: 1,
      });
    }
    return;
  }

  if (kind === "coilover") {
    const exists = await db.query.coilovers.findFirst({
      where: and(eq(coilovers.id, productId), eq(coilovers.isActive, true)),
    });
    if (!exists) throw new Error("Product not found");

    const current = await db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(
        and(eq(cartItems.userId, userId), eq(cartItems.coiloverId, productId))
      );
    if (current.length === 0) {
      await db.insert(cartItems).values({
        userId,
        kind,
        coiloverId: productId,
        quantity: 1,
      });
    }
    return;
  }

  // rim — quantity can exceed 1, so adding increments.
  const exists = await db.query.rims.findFirst({
    where: and(eq(rims.id, productId), eq(rims.isActive, true)),
  });
  if (!exists) throw new Error("Product not found");

  const current = await db
    .select({ id: cartItems.id, quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.rimId, productId)));

  if (current.length === 0) {
    await db
      .insert(cartItems)
      .values({ userId, kind, rimId: productId, quantity: 1 });
  } else {
    await db
      .update(cartItems)
      .set({ quantity: current[0].quantity + 1 })
      .where(eq(cartItems.id, current[0].id));
  }
}

// Ownership is enforced in the WHERE clause: a user can only delete their own
// cart rows, never someone else's by guessing an id.
export async function removeCartItem(
  userId: number,
  cartItemId: number
): Promise<void> {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)));
}
