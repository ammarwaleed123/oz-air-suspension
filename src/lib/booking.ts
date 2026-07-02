import "server-only";
import { and, asc, count, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  bookingDays,
  bookings,
  cartItems,
  cars,
  orderItems,
  orders,
  rims,
  users,
} from "@/db/schema";
import { computeCart } from "@/lib/cart";
import {
  earliestStart,
  isWorkingDay,
  jobWorkingDays,
  todayInCairo,
  toISODate,
  parseISODate,
  addDays,
} from "@/lib/schedule";

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

export const CAPACITY = (() => {
  const n = Number.parseInt(process.env.DAILY_CAPACITY ?? "4", 10);
  return Number.isFinite(n) && n > 0 ? n : 4;
})();

export const HOLD_MINUTES = 15;

// A single advisory-lock key serializes the slot critical sections (create
// hold + confirm). Booking volume is tiny (a few cars/day), so fully
// serializing these is the simplest way to guarantee no oversell, and it
// sidesteps any multi-day deadlock concerns.
const BOOKING_LOCK_KEY = 728_100;

// ────────────────────────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────────────────────────

export type BookingErrorCode =
  | "no_install"
  | "multiple_cars"
  | "coilovers_required"
  | "invalid_day"
  | "slot_unavailable"
  | "not_found"
  | "not_holdable"
  | "slot_taken"
  | "no_rims" // rim reservation with an empty (non-rim) cart
  | "has_install" // rim reservation attempted while install items are in cart
  | "out_of_stock"; // not enough rim stock at confirmation time

export class BookingError extends Error {
  constructor(public code: BookingErrorCode) {
    super(code);
    this.name = "BookingError";
  }
}

// ────────────────────────────────────────────────────────────────────
// Occupancy
// ────────────────────────────────────────────────────────────────────

// A booking occupies its days if it's confirmed/completed, OR it's a hold that
// hasn't expired. Cancelled, no-show, and expired holds free the slot.
const OCCUPIES = sql`(
  ${bookings.status} in ('confirmed','completed')
  or (${bookings.status} = 'held' and ${bookings.expiresAt} > now())
)`;

// Anything with a `.select()` (the db handle or a transaction).
type Queryer = Pick<typeof db, "select">;

async function occupancyForDays(
  exec: Queryer,
  days: string[],
  excludeBookingId?: number
): Promise<Map<string, number>> {
  if (days.length === 0) return new Map();
  const where = excludeBookingId
    ? and(
        inArray(bookingDays.day, days),
        ne(bookings.id, excludeBookingId),
        OCCUPIES
      )
    : and(inArray(bookingDays.day, days), OCCUPIES);

  const rows = await exec
    .select({ day: bookingDays.day, c: count() })
    .from(bookingDays)
    .innerJoin(bookings, eq(bookings.id, bookingDays.bookingId))
    .where(where)
    .groupBy(bookingDays.day);

  return new Map(rows.map((r) => [r.day, Number(r.c)]));
}

// Current occupancy (cars) for a single day — counts confirmed/completed and
// non-expired holds. Exposed for availability internals and verification.
export async function dayOccupancy(dayISO: string): Promise<number> {
  const m = await occupancyForDays(db, [dayISO]);
  return m.get(dayISO) ?? 0;
}

// ────────────────────────────────────────────────────────────────────
// Availability (read-only) — for the customer calendar
// ────────────────────────────────────────────────────────────────────

export type DayAvailability = {
  dateISO: string;
  dayNum: number;
  bookable: boolean;
};

// Bookable means: a working day, no earlier than tomorrow, AND both this day
// and its next working day are currently under capacity (so adding this job
// won't oversell either day).
export async function getMonthAvailability(
  year: number,
  month0: number // 0-based month
): Promise<{ year: number; month0: number; days: DayAvailability[] }> {
  const first = new Date(Date.UTC(year, month0, 1));
  const firstISO = toISODate(first);
  // Last day of the month.
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  const lastISO = toISODate(last);
  // Buffer a few days past month end so next-working-day lookups resolve.
  const windowEnd = addDays(lastISO, 4);

  const occ = await occupancyForDays(
    db,
    enumerateDays(firstISO, windowEnd)
  );

  const earliest = earliestStart(todayInCairo());

  const days: DayAvailability[] = [];
  for (
    let cur = firstISO;
    cur <= lastISO;
    cur = addDays(cur, 1)
  ) {
    const dayNum = parseISODate(cur).getUTCDate();
    let bookable = false;
    if (isWorkingDay(cur) && cur >= earliest) {
      const [d1, d2] = jobWorkingDays(cur);
      bookable = (occ.get(d1) ?? 0) < CAPACITY && (occ.get(d2) ?? 0) < CAPACITY;
    }
    days.push({ dateISO: cur, dayNum, bookable });
  }

  return { year, month0, days };
}

function enumerateDays(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  for (let cur = fromISO; cur <= toISO; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Create hold (transactional, race-safe)
// ────────────────────────────────────────────────────────────────────

export type CreateHoldInput = {
  dayISO: string;
  note?: string;
  coiloversAlreadyInstalled: boolean;
};

// Derives the order from the user's cart (server-side prices), validates the
// air-kit coilover gate and the chosen day, then reserves the 2-day slot under
// an advisory lock so concurrent bookings cannot oversell capacity. Returns
// the new booking id (status "held", expiring in HOLD_MINUTES).
export async function createHold(
  userId: number,
  input: CreateHoldInput
): Promise<{ bookingId: number }> {
  const cart = await computeCart(userId);
  const installLines = cart.lines.filter((l) => l.requiresInstall);
  if (installLines.length === 0) throw new BookingError("no_install");

  // One order = one car.
  const carIds = Array.from(
    new Set(installLines.map((l) => l.carId).filter((x): x is number => !!x))
  );
  if (carIds.length > 1) throw new BookingError("multiple_cars");
  const carId = carIds[0] ?? null;

  const hasAir = installLines.some((l) => l.kind === "air_kit_setup");
  const hasCoil = installLines.some((l) => l.kind === "coilover");

  // Air-kit gate: air kit requires coilovers in the order OR the customer
  // stating coilovers are already installed. Does not apply to coilover-only
  // or rim orders.
  if (hasAir && !hasCoil && !input.coiloversAlreadyInstalled) {
    throw new BookingError("coilovers_required");
  }

  // Validate the chosen start day.
  const earliest = earliestStart(todayInCairo());
  if (!isWorkingDay(input.dayISO) || input.dayISO < earliest) {
    throw new BookingError("invalid_day");
  }
  const [d1, d2] = jobWorkingDays(input.dayISO);

  // Snapshot the gate flag only when it's actually the reason install is
  // allowed (i.e. an air kit with no coilovers in the order).
  const flag = hasAir && !hasCoil ? input.coiloversAlreadyInstalled : false;

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`);

    // A user holds at most one slot: drop any prior active hold first.
    await tx
      .update(bookings)
      .set({ status: "cancelled", expiresAt: null })
      .where(and(eq(bookings.userId, userId), eq(bookings.status, "held")));

    // Capacity check (counts confirmed + valid holds of OTHER bookings).
    const occ = await occupancyForDays(tx, [d1, d2]);
    if ((occ.get(d1) ?? 0) >= CAPACITY || (occ.get(d2) ?? 0) >= CAPACITY) {
      throw new BookingError("slot_unavailable");
    }

    // Snapshot the order from the cart (server-side prices).
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        status: "awaiting_deposit",
        subtotalPiastres: cart.subtotalPiastres,
        depositPiastres: cart.depositPiastres,
      })
      .returning();

    if (cart.lines.length > 0) {
      await tx.insert(orderItems).values(
        cart.lines.map((l) => ({
          orderId: order.id,
          kind: l.kind,
          airKitFitmentPriceId:
            l.kind === "air_kit_setup" ? l.productId : null,
          coiloverFitmentId: l.kind === "coilover" ? l.productId : null,
          rimId: l.kind === "rim" ? l.productId : null,
          titleEn: l.nameEn,
          titleAr: l.nameAr,
          unitPricePiastres: l.unitPricePiastres,
          quantity: l.quantity,
          requiresInstall: l.requiresInstall,
        }))
      );
    }

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
    const [booking] = await tx
      .insert(bookings)
      .values({
        orderId: order.id,
        userId,
        carId,
        startDate: d1,
        endDate: d2,
        status: "held",
        expiresAt,
        coiloversAlreadyInstalled: flag,
        depositPiastres: cart.depositPiastres,
        notes: input.note?.trim() || null,
      })
      .returning();

    await tx.insert(bookingDays).values([
      { bookingId: booking.id, day: d1, active: true },
      { bookingId: booking.id, day: d2, active: true },
    ]);

    return { bookingId: booking.id };
  });
}

// ────────────────────────────────────────────────────────────────────
// Rim reservation — OUTSIDE the install scheduler
// ────────────────────────────────────────────────────────────────────

// Rims need no install work, so a rim-only order does NOT consume an install
// slot: it books no `booking_days` rows and is therefore never counted against
// the daily capacity (the 4-cars/day limit) that governs air kits & coilovers.
// The customer may pick ANY future day for collection; the booking is created
// already "confirmed" (there is no deposit hold — the full amount is due on
// collection). Returns the new booking id, reusing the receipt/account views.
export type RimReservationInput = {
  dayISO: string;
  note?: string;
};

export async function createRimReservation(
  userId: number,
  input: RimReservationInput
): Promise<{ bookingId: number }> {
  // Free up any stock held by reservations whose collection day already lapsed
  // without pickup, so it's available to this customer.
  await reconcileLapsedRimReservations();

  const cart = await computeCart(userId);
  if (cart.lines.length === 0) throw new BookingError("no_rims");
  // This path is rims-only. Anything installable must go through createHold.
  if (cart.lines.some((l) => l.requiresInstall)) {
    throw new BookingError("has_install");
  }

  // Any day from today (Cairo) onward — no working-day or capacity constraint.
  const today = todayInCairo();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dayISO) || input.dayISO < today) {
    throw new BookingError("invalid_day");
  }

  return db.transaction(async (tx) => {
    // Decrement stock for each rim, atomically. The `stock >= qty` guard makes
    // this race-safe: if two customers race for the last set, only one UPDATE
    // matches — the other gets 0 rows and we roll back with out_of_stock.
    for (const line of cart.lines) {
      if (line.kind !== "rim") continue;
      const dec = await tx
        .update(rims)
        .set({ stock: sql`${rims.stock} - ${line.quantity}` })
        .where(and(eq(rims.id, line.productId), gte(rims.stock, line.quantity)))
        .returning({ id: rims.id });
      if (dec.length === 0) throw new BookingError("out_of_stock");
    }

    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        status: "awaiting_deposit",
        subtotalPiastres: cart.subtotalPiastres,
        depositPiastres: 0,
      })
      .returning();

    await tx.insert(orderItems).values(
      cart.lines.map((l) => ({
        orderId: order.id,
        kind: l.kind,
        airKitFitmentPriceId: null,
        coiloverFitmentId: null,
        rimId: l.kind === "rim" ? l.productId : null,
        titleEn: l.nameEn,
        titleAr: l.nameAr,
        unitPricePiastres: l.unitPricePiastres,
        quantity: l.quantity,
        requiresInstall: false,
      }))
    );

    // A rim reservation reuses the bookings row (single collection day, no car,
    // no deposit) but creates NO booking_days — so it never occupies a slot.
    const [booking] = await tx
      .insert(bookings)
      .values({
        orderId: order.id,
        userId,
        carId: null,
        startDate: input.dayISO,
        endDate: input.dayISO,
        status: "confirmed",
        expiresAt: null,
        depositPiastres: 0,
        notes: input.note?.trim() || null,
      })
      .returning();

    // Reservation placed — clear the cart.
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));

    return { bookingId: booking.id };
  });
}

// A booking is a rim reservation iff it has line items and NONE of them require
// install (rims only). Install bookings always carry an installable item.
type BookingWithItems = {
  order: { items: { kind: string; rimId: number | null; quantity: number; requiresInstall: boolean }[] } | null;
};
function isRimReservation(b: BookingWithItems): boolean {
  const items = b.order?.items ?? [];
  return items.length > 0 && items.every((it) => !it.requiresInstall);
}

// Restore stock for every rim line of a booking (used when a reservation is
// returned to inventory — lapsed no-show or owner cancellation).
async function restoreRimStock(
  tx: Queryer & Pick<typeof db, "update">,
  items: { kind: string; rimId: number | null; quantity: number }[]
): Promise<void> {
  for (const it of items) {
    if (it.kind === "rim" && it.rimId) {
      await tx
        .update(rims)
        .set({ stock: sql`${rims.stock} + ${it.quantity}` })
        .where(eq(rims.id, it.rimId));
    }
  }
}

// Return stock for rim reservations whose collection day has passed without
// pickup. Idempotent: the confirmed→no_show flip is the guard, so stock is
// restored exactly once even if this runs concurrently or repeatedly. Cheap on
// the common path (a single SELECT that usually finds nothing).
export async function reconcileLapsedRimReservations(): Promise<void> {
  const today = todayInCairo();
  const candidates = await db.query.bookings.findMany({
    where: and(eq(bookings.status, "confirmed"), lt(bookings.endDate, today)),
    with: { order: { with: { items: true } } },
  });
  const lapsed = candidates.filter(isRimReservation);
  if (lapsed.length === 0) return;

  await db.transaction(async (tx) => {
    for (const b of lapsed) {
      // Only restore if THIS call wins the confirmed→no_show transition.
      const flipped = await tx
        .update(bookings)
        .set({ status: "no_show" })
        .where(and(eq(bookings.id, b.id), eq(bookings.status, "confirmed")))
        .returning({ id: bookings.id });
      if (flipped.length === 0) continue;
      await restoreRimStock(tx, b.order!.items);
    }
  });
}

// Owner/staff list of rim reservations (newest first) with items + customer.
export async function getRimReservations() {
  const rows = await db.query.bookings.findMany({
    where: isNull(bookings.carId), // rim reservations carry no car
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    with: { order: { with: { items: true } }, user: true },
  });
  return rows.filter(isRimReservation);
}

// Owner/staff action on a rim reservation:
//   • "completed" = picked up & paid → stock stays deducted (sold).
//   • "cancelled" = returned → restore stock (only if still holding it).
export async function setRimReservationStatus(
  bookingId: number,
  status: "completed" | "cancelled"
): Promise<void> {
  await db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
      with: { order: { with: { items: true } } },
    });
    if (!booking || !isRimReservation(booking)) {
      throw new BookingError("not_found");
    }

    if (status === "cancelled") {
      // Restore stock only when moving out of the confirmed (holding) state.
      const flipped = await tx
        .update(bookings)
        .set({ status: "cancelled" })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "confirmed")))
        .returning({ id: bookings.id });
      if (flipped.length > 0) await restoreRimStock(tx, booking.order!.items);
      return;
    }

    // Picked up — stock remains deducted.
    await tx
      .update(bookings)
      .set({ status: "completed" })
      .where(eq(bookings.id, bookingId));
  });
}

// ────────────────────────────────────────────────────────────────────
// Confirm deposit (transactional) — payment plugs in here later
// ────────────────────────────────────────────────────────────────────

// Turns a held booking into a confirmed one. Designed so a real payment
// webhook can call this with the same guarantees; the "mark paid" button is
// just one caller. Re-checks capacity (excluding self) to cover the case where
// the hold expired and the slot was filled by someone else.
export async function confirmDeposit(
  userId: number,
  bookingId: number
): Promise<{ status: "confirmed" | "already" }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`);

    const booking = await tx.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
    if (!booking || booking.userId !== userId) {
      throw new BookingError("not_found");
    }
    if (booking.status === "confirmed") return { status: "already" };
    if (booking.status !== "held") throw new BookingError("not_holdable");

    const occ = await occupancyForDays(
      tx,
      [booking.startDate, booking.endDate],
      bookingId
    );
    if (
      (occ.get(booking.startDate) ?? 0) >= CAPACITY ||
      (occ.get(booking.endDate) ?? 0) >= CAPACITY
    ) {
      // Hold expired and the slot was taken — release this one.
      await tx
        .update(bookings)
        .set({ status: "cancelled", expiresAt: null })
        .where(eq(bookings.id, bookingId));
      throw new BookingError("slot_taken");
    }

    await tx
      .update(bookings)
      .set({
        status: "confirmed",
        expiresAt: null,
        depositPaidAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    await tx
      .update(orders)
      .set({ status: "deposit_paid" })
      .where(eq(orders.id, booking.orderId));

    // Slot secured — clear the cart.
    await tx.delete(cartItems).where(eq(cartItems.userId, userId));

    return { status: "confirmed" };
  });
}

// Load a booking owned by the user, with its order line items (the receipt)
// and car — for the confirm/status/receipt page.
export async function getUserBooking(userId: number, bookingId: number) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, bookingId), eq(bookings.userId, userId)),
    with: { order: { with: { items: true } }, car: true },
  });
  return booking ?? null;
}

// All of a user's bookings (newest first) for the account page. Abandoned
// holds (cancelled, or expired before payment) are hidden.
export async function getUserBookings(userId: number) {
  const rows = await db.query.bookings.findMany({
    where: eq(bookings.userId, userId),
    orderBy: (b, { desc }) => [desc(b.createdAt)],
    with: { car: true },
  });
  const now = Date.now();
  return rows.filter((b) => {
    if (b.status === "cancelled") return false;
    if (
      b.status === "held" &&
      (!b.expiresAt || new Date(b.expiresAt).getTime() <= now)
    ) {
      return false; // expired/abandoned hold
    }
    return true;
  });
}

// ────────────────────────────────────────────────────────────────────
// Owner/staff schedule
// ────────────────────────────────────────────────────────────────────

export type ScheduleEntry = {
  bookingId: number;
  status: string;
  customerName: string;
  customerPhone: string;
  carNameEn: string | null;
  carNameAr: string | null;
  startDate: string;
  endDate: string;
  depositPiastres: number;
  subtotalPiastres: number;
  balancePiastres: number;
  coiloversAlreadyInstalled: boolean;
  hasAir: boolean;
  hasCoil: boolean;
  note: string | null;
};

// Every car present on a given day (real bookings only — holds and cancelled
// are excluded). Two batched queries: the bookings, then their item kinds.
export async function getDaySchedule(dayISO: string): Promise<ScheduleEntry[]> {
  const base = await db
    .select({
      bookingId: bookings.id,
      status: bookings.status,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      deposit: bookings.depositPiastres,
      coiloverFlag: bookings.coiloversAlreadyInstalled,
      note: bookings.notes,
      orderId: orders.id,
      subtotal: orders.subtotalPiastres,
      customerName: users.name,
      customerPhone: users.phone,
      carNameEn: cars.nameEn,
      carNameAr: cars.nameAr,
    })
    .from(bookingDays)
    .innerJoin(bookings, eq(bookings.id, bookingDays.bookingId))
    .innerJoin(orders, eq(orders.id, bookings.orderId))
    .innerJoin(users, eq(users.id, bookings.userId))
    .leftJoin(cars, eq(cars.id, bookings.carId))
    .where(
      and(
        eq(bookingDays.day, dayISO),
        inArray(bookings.status, ["confirmed", "completed", "no_show"])
      )
    )
    .orderBy(asc(bookings.id));

  if (base.length === 0) return [];

  const orderIds = base.map((b) => b.orderId);
  const items = await db
    .select({ orderId: orderItems.orderId, kind: orderItems.kind })
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));

  const kinds = new Map<number, { air: boolean; coil: boolean }>();
  for (const it of items) {
    const e = kinds.get(it.orderId) ?? { air: false, coil: false };
    if (it.kind === "air_kit_setup") e.air = true;
    if (it.kind === "coilover") e.coil = true;
    kinds.set(it.orderId, e);
  }

  return base.map((b) => {
    const k = kinds.get(b.orderId) ?? { air: false, coil: false };
    return {
      bookingId: b.bookingId,
      status: b.status,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      carNameEn: b.carNameEn,
      carNameAr: b.carNameAr,
      startDate: b.startDate,
      endDate: b.endDate,
      depositPiastres: b.deposit,
      subtotalPiastres: b.subtotal,
      balancePiastres: Math.max(0, b.subtotal - b.deposit),
      coiloversAlreadyInstalled: b.coiloverFlag,
      hasAir: k.air,
      hasCoil: k.coil,
      note: b.note,
    };
  });
}

// ────────────────────────────────────────────────────────────────────
// Owner/staff status mutations
// ────────────────────────────────────────────────────────────────────

export type ManageStatus = "completed" | "no_show" | "cancelled";

// Owner/staff change a booking's status. Cancelling reopens the slot (the
// occupancy predicate already excludes cancelled; we also flip booking_days
// inactive for tidiness). No-show keeps the deposit recorded as-is.
export async function setBookingStatus(
  bookingId: number,
  status: ManageStatus
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`);

    const booking = await tx.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });
    if (!booking) throw new BookingError("not_found");

    await tx
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, bookingId));

    if (status === "cancelled") {
      await tx
        .update(bookingDays)
        .set({ active: false })
        .where(eq(bookingDays.bookingId, bookingId));
    }
  });
}
