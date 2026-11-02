import type { ReactNode, SVGProps } from "react";

/**
 * App UI icon wrapper — inline stroked SVG, #1e3a5f, stroke-width 1.8, fill none.
 * Pass the icon's <path>/<circle>/etc. children (copy exact `d` values from the
 * matching .dc.html — never invent new iconography). Never mix with Material
 * Symbols (report surface only — see MaterialIcon).
 */
export function Icon({
  size = 15,
  children,
  ...props
}: { size?: number; children: ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--brand)"
      strokeWidth={1.8}
      style={{ flexShrink: 0 }}
      {...props}
    >
      {children}
    </svg>
  );
}
