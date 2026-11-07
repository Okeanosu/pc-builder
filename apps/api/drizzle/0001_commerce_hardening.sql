DROP INDEX "cart_items_cart_product_build_uq";--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_id" text;--> statement-breakpoint
CREATE INDEX "payments_status_created_idx" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
-- Hand-added: the old index let duplicate retail lines (build_id NULL) exist; keep one per key before the constraint.
DELETE FROM "cart_items" a USING "cart_items" b WHERE a."cart_id" = b."cart_id" AND a."product_id" = b."product_id" AND a."build_id" IS NOT DISTINCT FROM b."build_id" AND a."id" > b."id";--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_product_build_uq" UNIQUE NULLS NOT DISTINCT("cart_id","product_id","build_id");