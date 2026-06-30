import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ────────────────────────────────────────────────────────────────────
// Enums
// ────────────────────────────────────────────────────────────────────

// The four PARALLEL air-kit setups (not tiers). Each car's single air kit
// exposes all four; each setup carries its own price + feature list.
export const setupTypeEnum = pgEnum("setup_type", [
  "low_normal_slow", // 55k
  "low_fast", // 75k
  "down_dual", // 70k
  "down_single", // 85k
]);

// customer = public shopper; staff = schedule/bookings only; owner = full access.
export const userRoleEnum = pgEnum("user_role", ["customer", "staff", "owner"]);

export const productKindEnum = pgEnum("product_kind", [
  "air_kit_setup",
  "coilover",
  "rim",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "cart", // open cart, not yet checked out
  "awaiting_deposit", // checked out, deposit not yet paid
  "deposit_paid", // slot locked
  "balance_paid", // fully paid
  "completed",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "paymob",
  "kashier",
  "cash",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "held", // deposit pending, slot tentatively reserved
  "confirmed", // deposit paid, slot locked
  "completed",
  "no_show", // forfeits deposit, slot reopened
  "cancelled",
]);

export const carRequestStatusEnum = pgEnum("car_request_status", [
  "new",
  "contacted",
  "fulfilled",
  "closed",
]);

// ────────────────────────────────────────────────────────────────────
// Catalog: cars (air kits + coilovers attach to a car; rims do not)
// ────────────────────────────────────────────────────────────────────

export const cars = pgTable(
  "cars",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    // Bilingual display label (e.g. "مرسيدس C-Class" / "Mercedes C-Class").
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    yearStart: integer("year_start"),
    yearEnd: integer("year_end"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("cars_slug_uq").on(t.slug)]
);

// ────────────────────────────────────────────────────────────────────
// Air kits: exactly ONE per car, with four parallel setups
// ────────────────────────────────────────────────────────────────────

export const airKits = pgTable(
  "air_kits",
  {
    id: serial("id").primaryKey(),
    // One air kit per car — enforced by the unique index below.
    carId: integer("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    titleEn: text("title_en").notNull(),
    titleAr: text("title_ar").notNull(),
    descriptionEn: text("description_en"),
    descriptionAr: text("description_ar"),
    // Optional product image (coilovers and rims already have their own).
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("air_kits_car_uq").on(t.carId)]
);

export const airKitSetups = pgTable(
  "air_kit_setups",
  {
    id: serial("id").primaryKey(),
    airKitId: integer("air_kit_id")
      .notNull()
      .references(() => airKits.id, { onDelete: "cascade" }),
    setupType: setupTypeEnum("setup_type").notNull(),
    // Price in piastres (integer) to avoid floating-point money errors.
    pricePiastres: integer("price_piastres").notNull(),
    // Each setup has its OWN feature list (bilingual, ordered arrays).
    featuresEn: text("features_en").array().notNull().default([]),
    featuresAr: text("features_ar").array().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    // A given air kit has at most one row per setup type (4 setups max).
    uniqueIndex("air_kit_setups_kit_type_uq").on(t.airKitId, t.setupType),
  ]
);

// ────────────────────────────────────────────────────────────────────
// Coilovers: a car can have SEVERAL, each a single price,
// distinguished by brand + manufacture date
// ────────────────────────────────────────────────────────────────────

export const coilovers = pgTable(
  "coilovers",
  {
    id: serial("id").primaryKey(),
    carId: integer("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    brand: text("brand").notNull(),
    // Manufacture date — distinguishes coilovers of the same brand for a car.
    manufactureDate: date("manufacture_date").notNull(),
    pricePiastres: integer("price_piastres").notNull(),
    descriptionEn: text("description_en"),
    descriptionAr: text("description_ar"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("coilovers_car_idx").on(t.carId)]
);

// ────────────────────────────────────────────────────────────────────
// Rims: standalone, browsed by raw specs. No car link, no install.
// ────────────────────────────────────────────────────────────────────

export const rims = pgTable(
  "rims",
  {
    id: serial("id").primaryKey(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    // Raw specs the customer filters on.
    diameterInches: integer("diameter_inches").notNull(), // e.g. 18, 19, 20
    widthInches: text("width_inches").notNull(), // e.g. "8.5" (allow halves)
    boltPattern: text("bolt_pattern").notNull(), // e.g. "5x112"
    offsetMm: integer("offset_mm").notNull(), // ET, can be negative
    finish: text("finish").notNull(), // e.g. "Gloss Black"
    brand: text("brand"), // e.g. "Vossen" (nullable for legacy rows)
    pricePiastres: integer("price_piastres").notNull(),
    imageUrl: text("image_url"),
    stock: integer("stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rims_diameter_idx").on(t.diameterInches),
    index("rims_bolt_idx").on(t.boltPattern),
  ]
);

// ────────────────────────────────────────────────────────────────────
// Accounts
// ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // primary contact for WhatsApp
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("customer"),
    // Deactivated accounts cannot sign in and lose access (used to disable
    // staff without deleting the record).
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_phone_uq").on(t.phone),
    uniqueIndex("users_email_uq").on(t.email),
  ]
);

// ────────────────────────────────────────────────────────────────────
// Orders & cart
// ────────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: orderStatusEnum("status").notNull().default("cart"),
    // Snapshot totals in piastres.
    subtotalPiastres: integer("subtotal_piastres").notNull().default(0),
    depositPiastres: integer("deposit_piastres").notNull().default(0),
    balanceMethod: paymentMethodEnum("balance_method"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("orders_user_idx").on(t.userId)]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: productKindEnum("kind").notNull(),
    // Exactly one of these is set, matching `kind`.
    airKitSetupId: integer("air_kit_setup_id").references(
      () => airKitSetups.id,
      { onDelete: "set null" }
    ),
    coiloverId: integer("coilover_id").references(() => coilovers.id, {
      onDelete: "set null",
    }),
    rimId: integer("rim_id").references(() => rims.id, { onDelete: "set null" }),
    // Snapshot of price + title at time of adding, so later edits don't
    // mutate historical orders.
    titleEn: text("title_en").notNull(),
    titleAr: text("title_ar").notNull(),
    unitPricePiastres: integer("unit_price_piastres").notNull(),
    quantity: integer("quantity").notNull().default(1),
    // Rims don't require install; air kits & coilovers do.
    requiresInstall: boolean("requires_install").notNull().default(false),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

// ────────────────────────────────────────────────────────────────────
// Bookings (install scheduling) — one car job = 2 working days
// ────────────────────────────────────────────────────────────────────

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The car being worked on (for the owner's schedule). Derived from the
    // order's installable items at booking time.
    carId: integer("car_id").references(() => cars.id, { onDelete: "set null" }),
    // The two working days the car occupies (endDate = next working day
    // after startDate; Sundays are skipped by the scheduling engine).
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: bookingStatusEnum("status").notNull().default("held"),
    // A "held" booking reserves the slot until this time; after it passes, the
    // hold no longer counts toward capacity (the slot reopens). NULL once
    // confirmed. This is what makes the 15-minute checkout hold race-safe.
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // Air-kit gate: set when the customer states their car already has
    // coilovers installed (so the air-kit install is allowed without coilovers
    // in the order). Shown on the owner's schedule.
    coiloversAlreadyInstalled: boolean("coilovers_already_installed")
      .notNull()
      .default(false),
    depositPiastres: integer("deposit_piastres").notNull(),
    depositMethod: paymentMethodEnum("deposit_method"),
    depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
    balanceMethod: paymentMethodEnum("balance_method"),
    balancePaidAt: timestamp("balance_paid_at", { withTimezone: true }),
    // Owner's "new booking" alert: a confirmed booking starts unseen; the owner
    // marks it seen from the admin. Drives the in-admin notification badge.
    seenByOwner: boolean("seen_by_owner").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("bookings_start_idx").on(t.startDate),
    index("bookings_status_idx").on(t.status),
  ]
);

// One row per occupied working day per booking. Capacity is enforced by
// counting rows per `day` (< DAILY_CAPACITY). This makes the "this day AND
// its next working day both under capacity" check a simple count query.
export const bookingDays = pgTable(
  "booking_days",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    // Denormalized status so capacity counts can ignore cancelled/no_show
    // rows without joining back to bookings.
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    index("booking_days_day_idx").on(t.day, t.active),
    uniqueIndex("booking_days_booking_day_uq").on(t.bookingId, t.day),
  ]
);

// ────────────────────────────────────────────────────────────────────
// Cart — references catalog products only, NEVER prices. All money is
// computed server-side from the catalog at view/checkout time, so the
// browser can never dictate an amount.
// ────────────────────────────────────────────────────────────────────

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: productKindEnum("kind").notNull(),
    // Exactly one of these is set, matching `kind`.
    airKitSetupId: integer("air_kit_setup_id").references(
      () => airKitSetups.id,
      { onDelete: "cascade" }
    ),
    coiloverId: integer("coilover_id").references(() => coilovers.id, {
      onDelete: "cascade",
    }),
    rimId: integer("rim_id").references(() => rims.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cart_items_user_idx").on(t.userId),
    // Partial unique indexes guarantee at most one row per (user, product),
    // so "add" merges into a quantity bump instead of duplicating.
    uniqueIndex("cart_items_user_setup_uq")
      .on(t.userId, t.airKitSetupId)
      .where(sql`${t.airKitSetupId} is not null`),
    uniqueIndex("cart_items_user_coilover_uq")
      .on(t.userId, t.coiloverId)
      .where(sql`${t.coiloverId} is not null`),
    uniqueIndex("cart_items_user_rim_uq")
      .on(t.userId, t.rimId)
      .where(sql`${t.rimId} is not null`),
  ]
);

// ────────────────────────────────────────────────────────────────────
// Builds gallery (owner-managed showcase). One hero photo per build.
// ────────────────────────────────────────────────────────────────────

export const builds = pgTable(
  "builds",
  {
    id: serial("id").primaryKey(),
    imageUrl: text("image_url").notNull(),
    year: integer("year").notNull(),
    titleEn: text("title_en").notNull(), // car make/model
    titleAr: text("title_ar").notNull(),
    // Manual ordering on the public gallery (lower = earlier).
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("builds_sort_idx").on(t.sortOrder)]
);

// ────────────────────────────────────────────────────────────────────
// "Request your car" inbox (owner-only admin)
// ────────────────────────────────────────────────────────────────────

export const carRequests = pgTable("car_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  carMakeModel: text("car_make_model").notNull(),
  year: integer("year"),
  notes: text("notes"),
  status: carRequestStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ────────────────────────────────────────────────────────────────────
// Relations
// ────────────────────────────────────────────────────────────────────

export const carsRelations = relations(cars, ({ one, many }) => ({
  airKit: one(airKits),
  coilovers: many(coilovers),
}));

export const airKitsRelations = relations(airKits, ({ one, many }) => ({
  car: one(cars, { fields: [airKits.carId], references: [cars.id] }),
  setups: many(airKitSetups),
}));

export const airKitSetupsRelations = relations(airKitSetups, ({ one }) => ({
  airKit: one(airKits, {
    fields: [airKitSetups.airKitId],
    references: [airKits.id],
  }),
}));

export const coiloversRelations = relations(coilovers, ({ one }) => ({
  car: one(cars, { fields: [coilovers.carId], references: [cars.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  bookings: many(bookings),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  order: one(orders, { fields: [bookings.orderId], references: [orders.id] }),
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  car: one(cars, { fields: [bookings.carId], references: [cars.id] }),
  days: many(bookingDays),
}));

export const bookingDaysRelations = relations(bookingDays, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingDays.bookingId],
    references: [bookings.id],
  }),
}));

// ────────────────────────────────────────────────────────────────────
// Inferred types for use across the app
// ────────────────────────────────────────────────────────────────────

export type Car = typeof cars.$inferSelect;
export type AirKit = typeof airKits.$inferSelect;
export type AirKitSetup = typeof airKitSetups.$inferSelect;
export type Coilover = typeof coilovers.$inferSelect;
export type Rim = typeof rims.$inferSelect;
export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type BookingDay = typeof bookingDays.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type CarRequest = typeof carRequests.$inferSelect;
export type Build = typeof builds.$inferSelect;
