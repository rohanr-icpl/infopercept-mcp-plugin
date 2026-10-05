"use client";

import { X } from "@phosphor-icons/react";

type TourCardProps = {
  step: { title: string; content: React.ReactNode };
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skipTour?: () => void;
  arrow: React.ReactNode;
};

const pad = (n: number) => String(n).padStart(2, "0");

/* 380px card, 3px progress rail, mono zero-padded counter, Skip on step 1 then Back + Next (section 16). */
export function TourCard({ step, currentStep, totalSteps, nextStep, prevStep, skipTour, arrow }: TourCardProps) {
  const last = currentStep === totalSteps - 1;
  return (
    <div className="tour-card" style={{ position: "relative" }} role="dialog" aria-label="Guided tour">
      <div className="tour-rail"><i style={{ ["--p" as string]: (currentStep + 1) / totalSteps }} /></div>
      <div className="tour-body">
        <div className="tour-head">
          <h2>{step.title}</h2>
          <button className="icon-btn" type="button" aria-label="Close tour" onClick={skipTour}><X size={16} weight="bold" /></button>
        </div>
        <p>{step.content}</p>
        <div className="tour-foot">
          <span className="tour-count">{pad(currentStep + 1)}/{pad(totalSteps)}</span>
          <div className="tour-actions">
            {currentStep === 0 ? (
              <button className="btn sm ghost" type="button" onClick={skipTour}>Skip</button>
            ) : (
              <button className="btn sm outline" type="button" onClick={prevStep}>Back</button>
            )}
            <button className="btn sm primary" type="button" onClick={nextStep}>{last ? "Done" : "Next"}</button>
          </div>
        </div>
      </div>
      {arrow}
    </div>
  );
}
