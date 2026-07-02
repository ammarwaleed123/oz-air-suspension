import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  airKitFitmentPrices,
  airKitFitments,
  airKits,
  cartItems,
  coiloverFitments,
  coilovers,
  rims,
} from "@/db/schema";
import type { SetupType } from "@/lib/catalog";

// ALL cart money is computed here, server-side, from current DB prices. The
// cart_items table stores no amounts, so a tampered request cannot change what
// a customer is charged. Purchasable units are: an air-kit fitment price
// (kit+car+setup), a coilover fitment (coilover+car), or a rim.

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

export async function computeCart(userId: number): Promise<CartSummary> {
  const items = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.userId, userId))
    .orderBy(cartItems.createdAt);

  const akPriceIds = items
    .filter((i) => i.kind === "air_kit_setup" && i.airKitFitmentPriceId)
    .map((i) => i.airKitFitmentPriceId!) as number[];
  const coFitmentIds = items
    .filter((i) => i.kind === "coilover" && i.coiloverFitmentId)
    .map((i) => i.coiloverFitmentId!) as number[];
  const rimIds = items
    .filter((i) => i.kind === "rim" && i.rimId)
    .map((i) => i.rimId!) as number[];

  const [akPriceRows, coFitmentRows, rimRows] = await Promise.all([
    akPriceIds.length
      ? db.query.airKitFitmentPrices.findMany({
          where: (p, { and, inArray, eq }) =>
            and(inArray(p.id, akPriceIds), eq(p.isActive, true)),
          with: { fitment: { with: { car: true, airKit: true } } },
        })
      : Promise.resolve([]),
    coFitmentIds.length
      ? db.query.coiloverFitments.findMany({
          where: (f, { and, inArray, eq }) =>
            and(inArray(f.id, coFitmentIds), eq(f.isActive, true)),
          with: { coilover: true, car: true },
        })
      : Promise.resolve([]),
    rimIds.length
      ? db
          .select()
          .from(rims)
          .where(and(inArray(rims.id, rimIds), eq(rims.isActive, true)))
      : Promise.resolve([]),
  ]);

  const akPriceMap = new Map(akPriceRows.map((r) => [r.id, r]));
  const coFitmentMap = new Map(coFitmentRows.map((r) => [r.id, r]));
  const rimMap = new Map(rimRows.map((r) => [r.id, r]));

  const lines: CartLine[] = [];

  for (const item of items) {
    if (item.kind === "air_kit_setup" && item.airKitFitmentPriceId) {
      const p = akPriceMap.get(item.airKitFitmentPriceId);
      // Skip if the kit/fitment was deactivated or the car removed.
      if (!p || !p.fitment?.isActive || !p.fitment.airKit?.isActive) continue;
      if (!p.fitment.car) continue;
      const unit = p.pricePiastres;
      lines.push({
        cartItemId: item.id,
        kind: "air_kit_setup",
        productId: p.id,
        quantity: item.quantity,
        unitPricePiastres: unit,
        lineTotalPiastres: unit * item.quantity,
        requiresInstall: true,
        nameEn: p.fitment.car.nameEn,
        nameAr: p.fitment.car.nameAr,
        setupType: p.setupType as SetupType,
        carId: p.fitment.car.id,
      });
    } else if (item.kind === "coilover" && item.coiloverFitmentId) {
      const f = coFitmentMap.get(item.coiloverFitmentId);
      if (!f || !f.coilover?.isActive) continue;
      const unit = f.pricePiastres;
      lines.push({
        cartItemId: item.id,
        kind: "coilover",
        productId: f.id,
        quantity: item.quantity,
        unitPricePiastres: unit,
        lineTotalPiastres: unit * item.quantity,
        requiresInstall: true,
        nameEn: f.coilover.brand,
        nameAr: f.coilover.brand,
        manufactureDate: f.coilover.manufactureDate,
        carId: f.carId,
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
        requiresInstall: false,
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
    // productId = an air-kit fitment price id. Validate it's live (price active,
    // fitment active, kit active).
    const exists = await db
      .select({ id: airKitFitmentPrices.id })
      .from(airKitFitmentPrices)
      .innerJoin(
        airKitFitments,
        eq(airKitFitments.id, airKitFitmentPrices.fitmentId)
      )
      .innerJoin(airKits, eq(airKits.id, airKitFitments.airKitId))
      .where(
        and(
          eq(airKitFitmentPrices.id, productId),
          eq(airKitFitmentPrices.isActive, true),
          eq(airKitFitments.isActive, true),
          eq(airKits.isActive, true)
        )
      );
    if (exists.length === 0) throw new Error("Product not found");

    const current = await db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.airKitFitmentPriceId, productId)
        )
      );
    if (current.length === 0) {
      await db.insert(cartItems).values({
        userId,
        kind,
        airKitFitmentPriceId: productId,
        quantity: 1,
      });
    }
    return;
  }

  if (kind === "coilover") {
    // productId = a coilover fitment id. Validate it's live.
    const exists = await db
      .select({ id: coiloverFitments.id })
      .from(coiloverFitments)
      .innerJoin(coilovers, eq(coilovers.id, coiloverFitments.coiloverId))
      .where(
        and(
          eq(coiloverFitments.id, productId),
          eq(coiloverFitments.isActive, true),
          eq(coilovers.isActive, true)
        )
      );
    if (exists.length === 0) throw new Error("Product not found");

    const current = await db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.coiloverFitmentId, productId)
        )
      );
    if (current.length === 0) {
      await db.insert(cartItems).values({
        userId,
        kind,
        coiloverFitmentId: productId,
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

export async function removeCartItem(
  userId: number,
  cartItemId: number
): Promise<void> {
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)));
}
