"use client";

import { useEffect, useState } from "react";

import DemoGuide from "@/features/demo/DemoGuide";
import DemoTour from "@/features/demo/DemoTour";
import type { DemoMarket } from "@/features/demo/types";

type DemoAssistantsProps = {
  market: DemoMarket;
  registerHref: string;
};

export default function DemoAssistants({ market, registerHref }: DemoAssistantsProps) {
  const [tourOpen, setTourOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.sessionStorage.getItem("varnito-demo-tour-dismissed") !== "1";
  });
  const [tourCompleted, setTourCompleted] = useState(false);

  useEffect(() => {
    if (tourOpen) {
      window.sessionStorage.removeItem("varnito-demo-tour-dismissed");
      return;
    }

    window.sessionStorage.setItem("varnito-demo-tour-dismissed", "1");
  }, [tourOpen]);

  return (
    <>
      <DemoTour
        market={market}
        registerHref={registerHref}
        open={tourOpen}
        setOpen={setTourOpen}
        completed={tourCompleted}
        setCompleted={setTourCompleted}
      />
      <DemoGuide />
    </>
  );
}
