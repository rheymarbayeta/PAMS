'use client';

import React from 'react';

type WizardStep = { id: string; label: string };

export function WizardSteps({
  steps,
  current,
  onStepClick,
}: {
  steps: WizardStep[];
  current: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <ol className="flex flex-wrap gap-2 mb-6">
      {steps.map((step, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                active
                  ? 'text-white border-transparent'
                  : done
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : 'bg-white text-slate-600 border-slate-200'
              }`}
              style={active ? { backgroundColor: 'var(--primary)' } : undefined}
            >
              <span
                className={`h-5 w-5 rounded-full text-xs flex items-center justify-center ${
                  active ? 'bg-white/20 text-white' : done ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function WizardNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  backLabel = 'Back',
  canNext = true,
  isLast = false,
  submitting = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  canNext?: boolean;
  isLast?: boolean;
  submitting?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
      <button
        type="button"
        onClick={onBack}
        disabled={!onBack}
        className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50"
      >
        {backLabel}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || submitting}
        className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-40"
        style={{ backgroundColor: 'var(--primary)' }}
      >
        {submitting ? 'Saving...' : isLast ? nextLabel : nextLabel}
      </button>
    </div>
  );
}
