-- Fitment redesign: normalized brands + cars (brand+model+years), air kits and
-- coilovers as products fitted to one-or-more cars with per-car pricing.
-- This WIPES the test catalog + test orders/cart/bookings (approved), then
-- rebuilds the affected tables. Brands/fitments are new.

DROP TABLE IF EXISTS "booking_days","bookings","cart_items","order_items","orders","air_kit_setups","air_kits","coilovers","cars" CASCADE;--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"brand_id" integer NOT NULL,
	"model" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"year_start" integer,
	"year_end" integer,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "air_kits" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"description_en" text,
	"description_ar" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "air_kit_setups" (
	"id" serial PRIMARY KEY NOT NULL,
	"air_kit_id" integer NOT NULL,
	"setup_type" "setup_type" NOT NULL,
	"features_en" text[] DEFAULT '{}' NOT NULL,
	"features_ar" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "air_kit_fitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"air_kit_id" integer NOT NULL,
	"car_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "air_kit_fitment_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"fitment_id" integer NOT NULL,
	"setup_type" "setup_type" NOT NULL,
	"price_piastres" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coilovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand" text NOT NULL,
	"manufacture_date" date NOT NULL,
	"description_en" text,
	"description_ar" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coilover_fitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"coilover_id" integer NOT NULL,
	"car_id" integer NOT NULL,
	"price_piastres" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"status" "order_status" DEFAULT 'cart' NOT NULL,
	"subtotal_piastres" integer DEFAULT 0 NOT NULL,
	"deposit_piastres" integer DEFAULT 0 NOT NULL,
	"balance_method" "payment_method",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"kind" "product_kind" NOT NULL,
	"air_kit_fitment_price_id" integer,
	"coilover_fitment_id" integer,
	"rim_id" integer,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"unit_price_piastres" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"requires_install" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "product_kind" NOT NULL,
	"air_kit_fitment_price_id" integer,
	"coilover_fitment_id" integer,
	"rim_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"car_id" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "booking_status" DEFAULT 'held' NOT NULL,
	"expires_at" timestamp with time zone,
	"coilovers_already_installed" boolean DEFAULT false NOT NULL,
	"deposit_piastres" integer NOT NULL,
	"deposit_method" "payment_method",
	"deposit_paid_at" timestamp with time zone,
	"balance_method" "payment_method",
	"balance_paid_at" timestamp with time zone,
	"seen_by_owner" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"day" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cars" ADD CONSTRAINT "cars_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "air_kit_setups" ADD CONSTRAINT "air_kit_setups_air_kit_id_air_kits_id_fk" FOREIGN KEY ("air_kit_id") REFERENCES "public"."air_kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "air_kit_fitments" ADD CONSTRAINT "air_kit_fitments_air_kit_id_air_kits_id_fk" FOREIGN KEY ("air_kit_id") REFERENCES "public"."air_kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "air_kit_fitments" ADD CONSTRAINT "air_kit_fitments_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "air_kit_fitment_prices" ADD CONSTRAINT "air_kit_fitment_prices_fitment_id_air_kit_fitments_id_fk" FOREIGN KEY ("fitment_id") REFERENCES "public"."air_kit_fitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coilover_fitments" ADD CONSTRAINT "coilover_fitments_coilover_id_coilovers_id_fk" FOREIGN KEY ("coilover_id") REFERENCES "public"."coilovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coilover_fitments" ADD CONSTRAINT "coilover_fitments_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_air_kit_fitment_price_id_air_kit_fitment_prices_id_fk" FOREIGN KEY ("air_kit_fitment_price_id") REFERENCES "public"."air_kit_fitment_prices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_coilover_fitment_id_coilover_fitments_id_fk" FOREIGN KEY ("coilover_fitment_id") REFERENCES "public"."coilover_fitments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_rim_id_rims_id_fk" FOREIGN KEY ("rim_id") REFERENCES "public"."rims"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_air_kit_fitment_price_id_air_kit_fitment_prices_id_fk" FOREIGN KEY ("air_kit_fitment_price_id") REFERENCES "public"."air_kit_fitment_prices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_coilover_fitment_id_coilover_fitments_id_fk" FOREIGN KEY ("coilover_fitment_id") REFERENCES "public"."coilover_fitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_rim_id_rims_id_fk" FOREIGN KEY ("rim_id") REFERENCES "public"."rims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_days" ADD CONSTRAINT "booking_days_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brands_slug_uq" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "cars_slug_uq" ON "cars" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "air_kit_setups_kit_type_uq" ON "air_kit_setups" USING btree ("air_kit_id","setup_type");--> statement-breakpoint
CREATE UNIQUE INDEX "air_kit_fitments_car_uq" ON "air_kit_fitments" USING btree ("car_id");--> statement-breakpoint
CREATE UNIQUE INDEX "air_kit_fitment_prices_uq" ON "air_kit_fitment_prices" USING btree ("fitment_id","setup_type");--> statement-breakpoint
CREATE INDEX "coilover_fitments_car_idx" ON "coilover_fitments" USING btree ("car_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coilover_fitments_uq" ON "coilover_fitments" USING btree ("coilover_id","car_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "cart_items_user_idx" ON "cart_items" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_akprice_uq" ON "cart_items" USING btree ("user_id","air_kit_fitment_price_id") WHERE "cart_items"."air_kit_fitment_price_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_cofit_uq" ON "cart_items" USING btree ("user_id","coilover_fitment_id") WHERE "cart_items"."coilover_fitment_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_rim_uq" ON "cart_items" USING btree ("user_id","rim_id") WHERE "cart_items"."rim_id" is not null;--> statement-breakpoint
CREATE INDEX "bookings_start_idx" ON "bookings" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "booking_days_day_idx" ON "booking_days" USING btree ("day","active");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_days_booking_day_uq" ON "booking_days" USING btree ("booking_id","day");
