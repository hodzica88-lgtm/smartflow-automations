import Link from "next/link";

import styles from "./VarnitoLogo.module.css";

type VarnitoLogoProps = {
  href?: string;
  subtitle?: string;
};

export default function VarnitoLogo({ href = "/", subtitle }: VarnitoLogoProps) {
  return (
    <Link className={styles.logo} href={href}>
      <span className={styles.mark} aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11L19 35H29L41 11H33L24 29L15 11H7Z" fill="#D4AF37" />
        </svg>
      </span>
      <span>
        <span className={styles.word}>Varnito</span>
        {subtitle ? <span className={styles.muted}> · {subtitle}</span> : null}
      </span>
    </Link>
  );
}
