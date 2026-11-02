import { addDaysISO, maxISO } from '@/lib/dates';

export interface MtdCandidate {
  auditId: string;
  name: string | null;
  templateName: string;
  version: number;
  publishedAt: Date;
  periodStart: string; // already resolved (periodStart ?? periodEnd) by the caller
  periodEnd: string;
}

export interface MtdGap {
  start: string; // first uncovered day after the included run
  end: string; // last uncovered day before the first excluded candidate
}

export interface MtdContiguityResult<T extends MtdCandidate> {
  included: T[];
  excluded: T[];
  gap: MtdGap | null;
}

// ADR-0021 — stop-at-first-gap. Sorts ascending by periodStart, then walks forward; each
// next candidate counts as contiguous only if its periodStart is <= (the included run's
// periodEnd so far) + 1 day. The first candidate that fails this breaks the run —
// everything from there on is excluded, even if published, even if it would otherwise be
// contiguous with something further along (a gap always wins over a later match). Only
// ever called on already-published candidates (listOutletReports), so an unpublished
// audit is implicitly "the gap" by simply not appearing in the input at all.
export function computeMtdContiguity<T extends MtdCandidate>(candidates: T[]): MtdContiguityResult<T> {
  if (candidates.length === 0) return { included: [], excluded: [], gap: null };

  const sorted = [...candidates].sort((a, b) =>
    a.periodStart === b.periodStart ? a.periodEnd.localeCompare(b.periodEnd) : a.periodStart.localeCompare(b.periodStart),
  );

  const included: T[] = [sorted[0]];
  let runEnd = sorted[0].periodEnd;

  for (let i = 1; i < sorted.length; i++) {
    const candidate = sorted[i];
    if (candidate.periodStart <= addDaysISO(runEnd, 1)) {
      included.push(candidate);
      runEnd = maxISO(runEnd, candidate.periodEnd);
      continue;
    }
    return {
      included,
      excluded: sorted.slice(i),
      gap: { start: addDaysISO(runEnd, 1), end: addDaysISO(candidate.periodStart, -1) },
    };
  }

  return { included, excluded: [], gap: null };
}
