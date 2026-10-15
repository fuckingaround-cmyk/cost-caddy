// ADR-0020 — extracted register tables have whatever columns the photo prints, so the only
// structural guarantee is that every row is exactly as wide as the header. Short rows are
// padded with empty cells (a blank stays a blank); an over-long row's extra cells are merged
// into the last cell rather than dropped, so nothing the model read is lost. Never alters
// a cell's own value.
export function normaliseExtractedTable(table: { columns: string[]; rows: string[][] }): { columns: string[]; rows: string[][] } {
  const columns = table.columns.map((c) => c.trim());
  const width = columns.length;
  const rows = table.rows.map((row) => {
    if (row.length === width) return row;
    if (row.length < width) return [...row, ...Array<string>(width - row.length).fill('')];
    return [...row.slice(0, width - 1), row.slice(width - 1).filter((c) => c.trim() !== '').join(' ')];
  });
  return { columns, rows };
}
