// ADR-0020 — the model returns each row as an object keyed by the photo's own headers, so a
// skipped cell is a missing key (a blank), never a left-shift of the cells after it. This turns
// those rows into the stored positional shape `{ columns, rows }` and reports rows that did not
// carry exactly one value per header (missing or unknown keys), so the caller can retry/log.
// Never alters a cell's own value.
export type ExtractedTableShape = { columns: string[]; rows: string[][] };

// Header text copied from a wrapped header cell can carry stray spacing ("TABLE  NO.");
// collapse it, and match row keys the same way so spacing can't break the lookup.
const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();

function cellText(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

export function tableFromKeyedRows(
  columns: string[],
  rows: Record<string, unknown>[],
): { table: ExtractedTableShape; anomalies: number } {
  const headers = columns.map(tidy);
  const known = new Set(headers);
  let anomalies = 0;
  const out = rows.map((raw) => {
    const row = new Map(Object.entries(raw).map(([k, v]) => [tidy(k), v]));
    if (row.size !== headers.length || [...row.keys()].some((k) => !known.has(k)) || headers.some((h) => !row.has(h))) anomalies++;
    return headers.map((h) => cellText(row.get(h)));
  });
  return { table: { columns: headers, rows: out }, anomalies };
}
