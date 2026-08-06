"use client";

import { getDemoCopy } from "@/features/demo/copy";
import { useDemo } from "@/features/demo/useDemo";
import styles from "@/features/demo/demo.module.css";

export default function DemoBanner() {
  const { state } = useDemo();
  const copy = getDemoCopy(state.market);

  return (
    <div className={styles.notice} role="status" aria-live="polite">
      {copy.banner}
    </div>
  );
}
