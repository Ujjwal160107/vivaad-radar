import React, { useEffect, useState } from 'react';

interface ProcessingProps {
  surveyNo: string;
  village: string;
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

export const Processing: React.FC<ProcessingProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPercent, setCurrentPercent] = useState(14);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let subTickId: ReturnType<typeof setTimeout>;

    const runStep = (index: number) => {
      if (index >= STEP_SEQUENCE.length) {
        setTimeout(onComplete, 400);
        return;
      }

      const step = STEP_SEQUENCE[index];
      setCurrentStepIndex(index);
      setCurrentPercent(step.startPercent);

      // Natural randomized cadence
      subTickId = setTimeout(() => {
        setCurrentPercent(step.endPercent);
      }, Math.max(step.delayMs * 0.45, 250));

      timeoutId = setTimeout(() => {
        runStep(index + 1);
      }, step.delayMs);
    };

    runStep(0);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(subTickId);
    };
  }, [onComplete]);

  const currentStep = STEP_SEQUENCE[currentStepIndex] || STEP_SEQUENCE[0];
  const previousStep = currentStepIndex > 0 ? STEP_SEQUENCE[currentStepIndex - 1] : null;

  return (
    <div className="w-full px-8 sm:px-16 md:px-20 pt-16 sm:pt-24 max-w-6xl mx-auto flex flex-col items-start">
      {/* Top half alignment */}
      <div className="w-full">
        {/* Previous Step Indicator (Grey Italic Serif) */}
        <div className="min-h-[40px] flex items-end">
          {previousStep ? (
            <span className="font-serif italic text-neutral-400 text-2xl sm:text-3xl font-normal tracking-wide transition-opacity duration-300">
              {previousStep.label}.. done
            </span>
          ) : (
            <span className="opacity-0 font-serif italic text-2xl sm:text-3xl">placeholder</span>
          )}
        </div>

        {/* Current Active Step Headline (Bold Italic Libre Baskerville) */}
        <h2 className="font-serif italic font-bold text-4xl sm:text-5xl md:text-6xl text-black tracking-tight mt-1 mb-8">
          {currentStep.label}
        </h2>

        {/* 2px Solid Black Neubrutalist Progress Bar */}
        <div className="w-full border-2 border-black bg-white h-14 sm:h-16 relative flex items-center shadow-none">
          {/* Black Progress Fill */}
          <div
            className="bg-black h-full flex items-center pl-5 transition-all duration-300 ease-out overflow-hidden"
            style={{ width: `${currentPercent}%` }}
          >
            <span className="font-mono text-sm sm:text-base text-white tracking-widest whitespace-nowrap select-none font-medium">
              {currentPercent}% done...
            </span>
          </div>
        </div>

        {/* Clean Status Note */}
        <div className="mt-4 flex items-center justify-between text-xs sm:text-sm font-mono text-ink-muted">
          <span>Cross-referencing revenue records and court orders...</span>
          <span>STAGE {currentStepIndex + 1} OF 5</span>
        </div>
      </div>
    </div>
  );
};
