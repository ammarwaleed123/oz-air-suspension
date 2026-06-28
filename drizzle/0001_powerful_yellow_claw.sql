ALTER TYPE "public"."user_role" ADD VALUE 'staff' BEFORE 'owner';--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" "product_kind" NOT NULL,
	"air_kit_setup_id" integer,
	"coilover_id" integer,
	"rim_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_air_kit_setup_id_air_kit_setups_id_fk" FOREIGN KEY ("air_kit_setup_id") REFERENCES "public"."air_kit_setups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_coilover_id_coilovers_id_fk" FOREIGN KEY ("coilover_id") REFERENCES "public"."coilovers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_rim_id_rims_id_fk" FOREIGN KEY ("rim_id") REFERENCES "public"."rims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cart_items_user_idx" ON "cart_items" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_setup_uq" ON "cart_items" USING btree ("user_id","air_kit_setup_id") WHERE "cart_items"."air_kit_setup_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_coilover_uq" ON "cart_items" USING btree ("user_id","coilover_id") WHERE "cart_items"."coilover_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_rim_uq" ON "cart_items" USING btree ("user_id","rim_id") WHERE "cart_items"."rim_id" is not null;