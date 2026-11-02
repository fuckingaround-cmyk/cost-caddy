import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import styles from "./AppHeader.module.css";

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <BrandMark />
      <div className={styles.actions}>{children}</div>
    </header>
  );
}
