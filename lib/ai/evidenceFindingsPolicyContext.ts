// ADR-0013 — plain text embedded in code for now, shared across every evidence-register
// type for this restaurant, until a real per-org policy settings screen exists (the user
// explicitly chose this over building that screen now). Edit this string directly to
// reflect the client's actual SOPs; it's read by every polish prompt regardless of type.
//
// No numeric thresholds (discount %, amounts, etc.) are hardcoded here — this restaurant's
// actual policy figures aren't known. Any threshold, limit or standard the findings cite
// must come from the auditor's own remark for that item; never state one that isn't there.
export const EVIDENCE_FINDINGS_POLICY_CONTEXT = `
General policy context for this restaurant (placeholder — edit to match the client's actual SOP):
- Discounts: management approval is expected for any discount the auditor's remark flags as
  unapproved, undocumented, or unusually large. If the auditor's remark states a specific
  threshold or policy figure, use exactly that; otherwise do not invent or assume one.
- Bill modifications / item deletions after a bill has printed are expected to be rare
  and require a documented, specific reason and sign-off — a vague reason ("wp", "tf") or
  no sign-off is worth flagging.
- Item cancellations should carry a clear reason, the cancelling staff member, and
  authorisation for higher-value items.
- Non-chargeable / complimentary items should be authorised by name and have a stated
  business reason.
`.trim();
