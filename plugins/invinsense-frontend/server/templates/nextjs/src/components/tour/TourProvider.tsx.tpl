"use client";

import { NextStep, NextStepProvider } from "nextstepjs";
import { tours } from "./tours";
import { TourCard } from "./TourCard";

export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextStepProvider>
      <NextStep steps={tours} cardComponent={TourCard} shadowRgb="0,0,0" shadowOpacity="0.55">
        {children}
      </NextStep>
    </NextStepProvider>
  );
}
