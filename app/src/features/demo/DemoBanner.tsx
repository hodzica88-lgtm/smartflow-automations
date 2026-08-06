import styles from "@/features/demo/demo.module.css";

export default function DemoBanner() {
  return (
    <div className={styles.notice} role="status" aria-live="polite">
      Demo-Modus - Aenderungen werden nicht gespeichert.
    </div>
  );
}
