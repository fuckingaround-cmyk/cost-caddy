CREATE TABLE "audit_evidence_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"evidence_type" "evidence_photo_type" NOT NULL,
	"findings" text DEFAULT '' NOT NULL,
	"corrective_measures" text DEFAULT '' NOT NULL,
	"ai_polished_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_evidence_findings" ADD CONSTRAINT "audit_evidence_findings_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_evidence_findings" ADD CONSTRAINT "audit_evidence_findings_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audit_evidence_findings_audit_type_unique" ON "audit_evidence_findings" USING btree ("audit_id","evidence_type");