// Shared between the client (submit-gate/jump-to-incomplete) and the server
// (submitAudit's own re-validation) so the two can never drift (BUG-015): a
// checklist point only counts as answered once its non-pass remark/reason
// requirement (UX-009, R10) is actually met, not just once its status is set.
//
// The freeform "Other Observations" catch-all is exempt: it may stay pending, and any
// status it does get needs no remark or N/A reason.
export function isItemAnswered(item: { status: string; remark: string; naReason: string | null; freeform?: boolean }): boolean {
  if (item.freeform) return true;
  if (item.status === 'pending') return false;
  if (item.status === 'pass') return true;
  if (item.remark.trim() === '') return false;
  if (item.status === 'na' && !item.naReason) return false;
  return true;
}
