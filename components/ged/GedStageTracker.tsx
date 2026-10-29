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
    <div className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2">
      <span className="min-w-[50px] text-xs font-bold text-foreground">
        {subjectLabel}
      </span>
      <Badge variant="outline" className={`${stage?.style} border text-[11px] font-semibold`}>
        {stage?.label}
      </Badge>
      {showStats && item.attemptCount && item.attemptCount > 0 && (
        <span className="text-xs text-muted-foreground">
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
    <div className="min-w-0 border-b border-border pb-4 last:border-b-0 last:pb-0">
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-bold text-foreground">
            {subjectLabel}
          </span>
          {showStats && item.attemptCount && item.attemptCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Avg: {item.examAverage}% across {item.attemptCount} {item.attemptCount === 1 ? 'exam' : 'exams'}
            </span>
          )}
        </div>
        {item.note && (
          <span className="min-w-0 break-words text-xs italic text-muted-foreground">"{item.note}"</span>
        )}
      </div>

      <ol className="grid min-w-0 grid-cols-2 gap-2 min-[360px]:grid-cols-3 sm:grid-cols-6" aria-label={`${subjectLabel} GED readiness stages`}>
        {GED_STAGES.map((stage, index) => {
          const step = index + 1;
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          const isPending = step > currentStep;

          return (
            <li key={stage.status} aria-current={isActive ? 'step' : undefined} className={`min-w-0 border-t-2 px-1 pt-2 text-center ${isActive ? 'border-aubergine-600' : isCompleted ? 'border-emerald-500' : 'border-border'}`}>
                <div
                  className={`
                    mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold
                    ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                    ${isActive ? 'bg-aubergine-600 text-white' : ''}
                    ${isPending ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step}
                </div>
                <span className={`mt-2 block break-words text-xs font-semibold leading-4 ${isActive ? 'text-aubergine-700 dark:text-aubergine-300' : 'text-muted-foreground'}`}>
                  {stage.label}
                </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default GedStageTracker;
