CREATE TYPE "public"."evidence_extraction_status" AS ENUM('pending', 'extracted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."evidence_photo_type" AS ENUM('discount_register', 'voids_cancellations', 'non_chargeable', 'bill_modification', 'other');--> statement-breakpoint
ALTER TABLE "audit_item_files" ADD COLUMN "evidence_type" "evidence_photo_type";--> statement-breakpoint
ALTER TABLE "audit_item_files" ADD COLUMN "extraction_status" "evidence_extraction_status";--> statement-breakpoint
ALTER TABLE "audit_item_files" ADD COLUMN "extracted_table" jsonb;--> statement-breakpoint
ALTER TABLE "audit_item_files" ADD COLUMN "extraction_model" text;--> statement-breakpoint
ALTER TABLE "audit_item_files" ADD COLUMN "extracted_at" timestamp with time zone;