import React, { useEffect, useState } from 'react';

interface ProcessingProps {
  surveyNo: string;
  village: string;
  ready: boolean;
  onComplete: () => void;
}

interface StepConfig {
  label: string;
  startPercent: number;
  endPercent: number;
  delayMs: number;
}

const STEP_SEQUENCE: StepConfig[] = [
  { label: "finding parcel", startPercent: 14, endPercent: 27, delayMs: 800 },
  { label: "extracting court references", startPercent: 35, endPercent: 42, delayMs: 1400 },
  { label: "resolving entities", startPercent: 54, endPercent: 62, delayMs: 900 },
  { label: "checking linked cases", startPercent: 72, endPercent: 85, delayMs: 1600 },
  { label: "scoring evidence", startPercent: 94, endPercent: 100, delayMs: 600 },
];

export const Processing: React.FC<ProcessingProps> = ({ surveyNo, village, ready, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPercent, setCurrentPercent] = useState(14);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let subTickId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const runStep = (index: number) => {
      if (cancelled) return;
      if (index >= STEP_SEQUENCE.length) {
        setAnimationDone(true);
        return;
      }

      const step = STEP_SEQUENCE[index];
      setCurrentStepIndex(index);
      setCurrentPercent(step.startPercent);

      subTickId = setTimeout(() => {
        if (!cancelled) setCurrentPercent(step.endPercent);
      }, Math.max(step.delayMs * 0.45, 250));

      timeoutId = setTimeout(() => {
        runStep(index + 1);
      }, step.delayMs);
    };

    runStep(0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(subTickId);
    };
  }, []);

  useEffect(() => {
    if (!animationDone || !ready) return;
    const hold = setTimeout(onComplete, 400);
    return () => clearTimeout(hold);
  }, [animationDone, ready, onComplete]);

  const currentStep = STEP_SEQUENCE[currentStepIndex] || STEP_SEQUENCE[0];
  const previousStep = currentStepIndex > 0 ? STEP_SEQUENCE[currentStepIndex - 1] : null;
  const holding = animationDone && !ready;

  return (
    <div className="w-full px-8 sm:px-16 md:px-20 pt-16 sm:pt-24 max-w-6xl mx-auto flex flex-col items-start">
      <div className="w-full">
        <div className="min-h-[40px] flex items-end">
          {previousStep ? (
            <span className="font-serif italic text-neutral-400 text-2xl sm:text-3xl font-normal tracking-wide transition-opacity duration-300">
              {previousStep.label}.. done
            </span>
          ) : (
            <span className="opacity-0 font-serif italic text-2xl sm:text-3xl">placeholder</span>
          )}
        </div>

        <h2 className="font-serif italic font-bold text-4xl sm:text-5xl md:text-6xl text-black tracking-tight mt-1 mb-8">
          {holding ? 'waiting on the index' : currentStep.label}
        </h2>

        <div className="w-full border-2 border-black bg-white h-14 sm:h-16 relative flex items-center shadow-none">
          <div
            className="bg-black h-full flex items-center pl-5 transition-all duration-300 ease-out overflow-hidden"
            style={{ width: `${holding ? 100 : currentPercent}%` }}
          >
            <span className="font-mono text-sm sm:text-base text-white tracking-widest whitespace-nowrap select-none font-medium">
              {holding ? 'index still answering...' : `${currentPercent}% done...`}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs sm:text-sm font-mono text-ink-muted">
          <span>
            {holding
              ? 'Animation complete — holding until court and land records return.'
              : `Cross-referencing ${surveyNo || 'survey'} · ${village || 'Sultanpur'} against court orders...`}
          </span>
          <span>STAGE {Math.min(currentStepIndex + 1, 5)} OF 5</span>
        </div>
      </div>
    </div>
  );
};
