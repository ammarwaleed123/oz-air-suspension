CREATE TABLE "builds" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_url" text NOT NULL,
	"year" integer NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "seen_by_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "builds_sort_idx" ON "builds" USING btree ("sort_order");