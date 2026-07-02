import React from 'react';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  GED_STAGES,
  GED_SUBJECT_LABELS,
  type GedSubject,
  type GedStatus
} from '@/lib/ged/constants';

export interface GedReadinessItem {
  subject: GedSubject;
  status: GedStatus;
  examAverage?: number;
  attemptCount?: number;
  note?: string | null;
  updatedAt?: Date | string | null;
}

interface GedStageTrackerProps {
  readiness: GedReadinessItem[];
  compact?: boolean;  // For dashboard view
  showStats?: boolean; // Show exam averages
  className?: string;
}

export function GedStageTracker({
  readiness,
  compact = false,
  showStats = true,
  className = ''
}: GedStageTrackerProps) {
  if (compact) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {readiness.map((r) => (
          <CompactGedChip key={r.subject} item={r} showStats={showStats} />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {readiness.map((item) => (
        <GedStageRow key={item.subject} item={item} showStats={showStats} />
      ))}
    </div>
  );
}

function CompactGedChip({ item, showStats }: { item: GedReadinessItem; showStats: boolean }) {
  const stage = GED_STAGES.find(s => s.status === item.status);
  const subjectLabel = GED_SUBJECT_LABELS[item.subject];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 min-w-[50px]">
        {subjectLabel}
      </span>
      <Badge variant="outline" className={`${stage?.style} border text-[10px] font-semibold`}>
        {stage?.label}
      </Badge>
      {showStats && item.attemptCount && item.attemptCount > 0 && (
        <span className="text-[10px] text-slate-500">
          {item.examAverage}% ({item.attemptCount})
        </span>
      )}
    </div>
  );
}

function GedStageRow({ item, showStats }: { item: GedReadinessItem; showStats: boolean }) {
  const currentStep = GED_STAGES.findIndex(s => s.status === item.status) + 1;
  const subjectLabel = GED_SUBJECT_LABELS[item.subject];

  return (
    <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {subjectLabel}
          </span>
          {showStats && item.attemptCount && item.attemptCount > 0 && (
            <span className="text-xs text-slate-500">
              Avg: {item.examAverage}% across {item.attemptCount} {item.attemptCount === 1 ? 'exam' : 'exams'}
            </span>
          )}
        </div>
        {item.note && (
          <span className="text-xs text-slate-500 italic">"{item.note}"</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {GED_STAGES.map((stage, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          const isPending = step > currentStep;

          return (
            <React.Fragment key={stage.status}>
              <div className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                    ${isActive ? 'bg-aubergine-600 text-white ring-4 ring-aubergine-100 dark:ring-aubergine-900/30' : ''}
                    ${isPending ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500' : ''}
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < GED_STAGES.length && (
                  <div
                    className={`
                      w-8 h-0.5 transition-colors
                      ${step < currentStep ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-surface-raised'}
                    `}
                  />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 px-0.5">
        {GED_STAGES.map((stage) => (
          <span
            key={stage.status}
            className="text-[9px] font-medium text-slate-400 uppercase tracking-wider w-8 text-center"
          >
            {stage.label.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default GedStageTracker;
