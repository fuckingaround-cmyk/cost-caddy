// ADR-0011 — the scoring matrix DeepSeek is given at submit time to ground its severity
// judgment. Adapted from lib/report/classify.ts's CATEGORY_RULES (the deterministic
// floor this call now supersedes as primary, keeping classify.ts as the fallback for
// whatever this call doesn't reach). Severity is High/Medium/Low only (R7, UX-006).
export const SEVERITY_RUBRIC = `
Score every failed or N/A checkpoint against this rubric. Pick the single best-fit
category and severity for what the remark actually describes — the categories below are
illustrative anchors, not a keyword checklist; use judgment when a remark doesn't match
one cleanly, and fall back to "Operational Control" / Medium for a general SOP deviation
that isn't a food-safety, statutory, or revenue-control matter.

- Temperature & Expiry (High) — cold-chain failures: fridge/freezer/chiller running warm,
  uncalibrated units, no temperature log. Risk: accelerated spoilage, pathogen growth,
  compromised ingredients reaching patrons.
- Food Safety Risk (High) — raw/cooked cross-contamination, improper storage segregation.
  Risk: foodborne illness, regulatory closure.
- Inventory Control — High when expired or unlabelled stock could reach production (no
  FIFO, missing expiry dates/labels); Medium when it's a purchasing/receiving control gap
  (unverified vendor weight, missing invoice/GST checks) with no direct safety exposure.
- Hygiene Standards (High) — cleanliness/grooming lapses: grease buildup, missing
  gloves/hairnets, soiled wipes. Risk: bacterial contamination of food or surfaces.
- Statutory Compliance — High when it's a life-safety or licence-condition matter (fire
  extinguisher, safety equipment, blocked exit); Medium for municipal/administrative
  compliance gaps (waste segregation, pest-attraction risk) with no immediate danger.
- Revenue Control — High when the control gap could hide unauthorised revenue loss
  (unsigned bill edits, cancellations with no reason code); Medium when it's a policy
  threshold issue (discounts/comps/waivers above the norm) rather than a concealment risk.
- Operational Control (Medium, fallback) — a documented-SOP deviation that doesn't fit
  the above: reduces operational consistency but carries no acute safety or revenue risk.

For each item also return:
- impact: one sentence, plain language, naming the concrete operational consequence.
- correctiveAction: one concrete, actionable instruction to fix it — not a restatement of
  the problem.
- sla: a fix timeline appropriate to the severity (e.g. "Immediate (24 Hours)" for High,
  "Within 48 Hours" or "Within 5 Business Days" for Medium/Low).
- ownership: the role most likely responsible for fixing it (e.g. "Kitchen Supervisor /
  Chef", "Restaurant Manager", "Store Keeper / Head Chef") — a role, never a person's name.

Never invent, restate, or alter a number, date, quantity, or unit from the remark. You are
assessing and rewriting prose, not computing a figure.
`.trim();
