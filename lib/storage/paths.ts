// Storage paths are org-scoped even though the bucket itself is private, so a future
// bucket-level policy change can't cross an org boundary by accident.
export function auditItemFilePath(orgId: string, auditItemId: string, fileId: string, filename: string): string {
  return `${orgId}/audit-items/${auditItemId}/${fileId}-${filename}`;
}

export function reportFilePath(orgId: string, auditId: string, version: number, filename: string): string {
  return `${orgId}/reports/${auditId}/v${version}/${filename}`;
}

// ADR-0021 — the MTD analog of reportFilePath, keyed on outletId+month instead of
// auditId since an MTD rollup isn't one audit.
export function mtdReportFilePath(orgId: string, outletId: string, month: string, version: number, filename: string): string {
  return `${orgId}/mtd-reports/${outletId}/${month}/v${version}/${filename}`;
}

export function operationalFilePath(orgId: string, auditId: string, fileId: string, filename: string): string {
  return `${orgId}/operational-files/${auditId}/${fileId}-${filename}`;
}
