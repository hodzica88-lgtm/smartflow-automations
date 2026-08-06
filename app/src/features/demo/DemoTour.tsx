"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { getDemoCopy } from "@/features/demo/copy";
import type { DemoMarket } from "@/features/demo/types";
import styles from "@/features/demo/demo.module.css";

export default function DemoTour({
  market,
  registerHref,
  open,
  setOpen,
  completed,
  setCompleted,
}: {
  market: DemoMarket;
  registerHref: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  completed: boolean;
  setCompleted: (value: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const copy = getDemoCopy(market);
  const steps = copy.tour.steps;
  const stepIndex = Math.max(
    0,
    steps.findIndex((step) => pathname.startsWith(step.route)),
  );

  const currentStep = steps[stepIndex];

  const onNext = () => {
    if (stepIndex >= steps.length - 1) {
      setOpen(false);
      setCompleted(true);
      return;
    }

    const next = steps[stepIndex + 1];
    router.push(next.route);
  };

  if (open && currentStep) {
    return (
      <div className={styles.tourOverlay} role="dialog" aria-modal="true" aria-label={copy.tour.ariaLabel}>
        <div className={styles.tourCard}>
          <p className={styles.badge} style={{ margin: 0 }}>{copy.tour.stepLabel(stepIndex + 1, steps.length)}</p>
          <h2 style={{ margin: 0 }}>{currentStep.title}</h2>
          <p className={styles.muted}>{currentStep.text}</p>
          <div className={styles.tourActions}>
            <button className={styles.buttonSecondary} type="button" onClick={() => setOpen(false)}>
              {copy.tour.skip}
            </button>
            <button className={styles.button} type="button" onClick={onNext}>
              {stepIndex >= steps.length - 1 ? copy.tour.finish : copy.tour.next}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!completed) {
    return null;
  }

  return (
    <aside className={styles.ctaWrap} aria-label={copy.tour.doneAria}>
      <strong>{copy.ctaTitle}</strong>
      <Link href={registerHref} className={styles.button}>
        {copy.ctaButton}
      </Link>
    </aside>
  );
}
