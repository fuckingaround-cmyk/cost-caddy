CREATE TABLE "mtd_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"month" text NOT NULL,
	"version" integer NOT NULL,
	"token" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pdf_path" text,
	"note" text,
	"contributing_audit_ids" jsonb NOT NULL,
	CONSTRAINT "mtd_reports_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "mtd_reports" ADD CONSTRAINT "mtd_reports_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mtd_reports" ADD CONSTRAINT "mtd_reports_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mtd_reports_outlet_month_version_unique" ON "mtd_reports" USING btree ("outlet_id","month","version");