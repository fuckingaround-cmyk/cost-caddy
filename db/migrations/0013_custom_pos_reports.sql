DROP INDEX "template_pos_reports_template_type_unique";--> statement-breakpoint
DROP INDEX "audit_evidence_findings_audit_type_unique";--> statement-breakpoint
ALTER TABLE "template_pos_reports" ADD COLUMN "label" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_evidence_findings" ADD COLUMN "report_label" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "template_pos_reports_template_type_unique" ON "template_pos_reports" USING btree ("template_id","report_type","label");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_evidence_findings_audit_type_unique" ON "audit_evidence_findings" USING btree ("audit_id","evidence_type","report_label");