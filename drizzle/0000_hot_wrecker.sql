CREATE TYPE "public"."booking_status" AS ENUM('held', 'confirmed', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."car_request_status" AS ENUM('new', 'contacted', 'fulfilled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('cart', 'awaiting_deposit', 'deposit_paid', 'balance_paid', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('paymob', 'kashier', 'cash');--> statement-breakpoint
CREATE TYPE "public"."product_kind" AS ENUM('air_kit_setup', 'coilover', 'rim');--> statement-breakpoint
CREATE TYPE "public"."setup_type" AS ENUM('low_normal_slow', 'low_fast', 'down_dual', 'down_single');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'owner');--> statement-breakpoint
CREATE TABLE "air_kit_setups" (
	"id" serial PRIMARY KEY NOT NULL,
	"air_kit_id" integer NOT NULL,
	"setup_type" "setup_type" NOT NULL,
	"price_piastres" integer NOT NULL,
	"features_en" text[] DEFAULT '{}' NOT NULL,
	"features_ar" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "air_kits" (
	"id" serial PRIMARY KEY NOT NULL,
	"car_id" integer NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"description_en" text,
	"description_ar" text,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "booking_status" DEFAULT 'held' NOT NULL,
	"deposit_piastres" integer NOT NULL,
	"deposit_method" "payment_method",
	"deposit_paid_at" timestamp with time zone,
	"balance_method" "payment_method",
	"balance_paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"car_make_model" text NOT NULL,
	"year" integer,
	"notes" text,
	"status" "car_request_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cars" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"make" text NOT NULL,
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
CREATE TABLE "coilovers" (
	"id" serial PRIMARY KEY NOT NULL,
	"car_id" integer NOT NULL,
	"brand" text NOT NULL,
	"manufacture_date" date NOT NULL,
	"price_piastres" integer NOT NULL,
	"description_en" text,
	"description_ar" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"kind" "product_kind" NOT NULL,
	"air_kit_setup_id" integer,
	"coilover_id" integer,
	"rim_id" integer,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"unit_price_piastres" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"requires_install" boolean DEFAULT false NOT NULL
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
CREATE TABLE "rims" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"diameter_inches" integer NOT NULL,
	"width_inches" text NOT NULL,
	"bolt_pattern" text NOT NULL,
	"offset_mm" integer NOT NULL,
	"finish" text NOT NULL,
	"price_piastres" integer NOT NULL,
	"image_url" text,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "air_kit_setups" ADD CONSTRAINT "air_kit_setups_air_kit_id_air_kits_id_fk" FOREIGN KEY ("air_kit_id") REFERENCES "public"."air_kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "air_kits" ADD CONSTRAINT "air_kits_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_days" ADD CONSTRAINT "booking_days_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_requests" ADD CONSTRAINT "car_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coilovers" ADD CONSTRAINT "coilovers_car_id_cars_id_fk" FOREIGN KEY ("car_id") REFERENCES "public"."cars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_air_kit_setup_id_air_kit_setups_id_fk" FOREIGN KEY ("air_kit_setup_id") REFERENCES "public"."air_kit_setups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_coilover_id_coilovers_id_fk" FOREIGN KEY ("coilover_id") REFERENCES "public"."coilovers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_rim_id_rims_id_fk" FOREIGN KEY ("rim_id") REFERENCES "public"."rims"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "air_kit_setups_kit_type_uq" ON "air_kit_setups" USING btree ("air_kit_id","setup_type");--> statement-breakpoint
CREATE UNIQUE INDEX "air_kits_car_uq" ON "air_kits" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "booking_days_day_idx" ON "booking_days" USING btree ("day","active");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_days_booking_day_uq" ON "booking_days" USING btree ("booking_id","day");--> statement-breakpoint
CREATE INDEX "bookings_start_idx" ON "bookings" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cars_slug_uq" ON "cars" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "coilovers_car_idx" ON "coilovers" USING btree ("car_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rims_diameter_idx" ON "rims" USING btree ("diameter_inches");--> statement-breakpoint
CREATE INDEX "rims_bolt_idx" ON "rims" USING btree ("bolt_pattern");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");