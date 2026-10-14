CREATE TYPE "public"."item_section" AS ENUM('checklist', 'pos_report');--> statement-breakpoint
CREATE TABLE "template_pos_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"report_type" "evidence_photo_type" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_items" ADD COLUMN "section" "item_section" DEFAULT 'checklist' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_items" ADD COLUMN "report_type" "evidence_photo_type";--> statement-breakpoint
ALTER TABLE "template_pos_reports" ADD CONSTRAINT "template_pos_reports_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_pos_reports" ADD CONSTRAINT "template_pos_reports_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "template_pos_reports_template_type_unique" ON "template_pos_reports" USING btree ("template_id","report_type");