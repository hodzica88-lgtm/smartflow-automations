"use client";

import { useState } from "react";

import DemoGuide from "@/features/demo/DemoGuide";
import DemoTour from "@/features/demo/DemoTour";
import type { DemoMarket } from "@/features/demo/types";

type DemoAssistantsProps = {
  market: DemoMarket;
  registerHref: string;
};

export default function DemoAssistants({ market, registerHref }: DemoAssistantsProps) {
  const [tourOpen, setTourOpen] = useState(true);
  const [tourCompleted, setTourCompleted] = useState(false);

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
