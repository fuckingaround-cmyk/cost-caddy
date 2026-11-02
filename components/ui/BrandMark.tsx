import styles from "./BrandMark.module.css";

export function BrandMark({ size = "header" }: { size?: "header" | "login" }) {
  const symbolPx = size === "login" ? 36 : 28;
  return (
    <div className={styles.logo}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand
          SVG; next/image's optimizer rejects SVGs without dangerouslyAllowSVG */}
      <img
        src="/brand/cost-caddy-symbol.svg"
        alt=""
        width={symbolPx}
        height={symbolPx}
        className={styles.symbol}
      />
      <span className={size === "login" ? styles.wordmarkLogin : styles.wordmark}>
        cost<span className={styles.wordmarkAccent}>caddy</span>
      </span>
    </div>
  );
}
