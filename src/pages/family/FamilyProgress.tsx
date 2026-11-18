import { CheckCircle2, ChevronDown, CircleDashed, XCircle, MessageSquareText } from "lucide-react";
import {
  type Overview, type ViewKey, Panel, EmptyLine, ViewHeading, SharingNotice, can, gedSubjects, readinessSteps, dateLabel, dayKey, daysBetween, secondaryButton,
} from "./familyShared";

type Props = { overview: Overview; goTo: (view: ViewKey) => void; askAbout: (topic: string) => void };

const examTypeLabel: Record<string, string> = { QUIZ: "Quiz", MIDTERM: "Midterm", FINAL: "Final exam", MOCK: "Practice test" };

export default function FamilyProgress({ overview, askAbout }: Props) {
  const today = overview.today;
  const work = [...overview.homework].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  if (!can(overview, "LEARNING")) return <div><ViewHeading title="Learning progress" description="How your learner is moving toward the four GED tests." /><SharingNotice overview={overview} scope="LEARNING" /></div>;

  return <div>
    <ViewHeading title="Learning progress" description="How your learner is moving toward the four GED tests, with recent results and class work." action={<button type="button" onClick={() => askAbout("LEARNING")} className={secondaryButton}><MessageSquareText className="size-4" aria-hidden="true" />Ask a teacher</button>} />

    <Panel title="GED readiness by subject" id="readiness-title">
      <ul className="divide-y divide-border">
        {gedSubjects.map((subject) => {
          const row = overview.readiness.find((item) => item.subject === subject.key);
          const stepIndex = row ? readinessSteps.findIndex((step) => step.key === row.status) : -1;
          const step = stepIndex >= 0 ? readinessSteps[stepIndex] : null;
          return <li key={subject.key} className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-semibold text-foreground">{subject.label}</h3>
              <p className={`text-sm font-semibold ${step?.key === "PASSED" || step?.key === "READY" ? "text-success" : step ? "text-primary" : "text-muted-foreground"}`}>{step ? step.label : "Not assessed yet"}</p>
            </div>
            <ol className="mt-3 grid grid-cols-6 gap-1" aria-label={`${subject.short} readiness: ${step ? `step ${stepIndex + 1} of 6, ${step.label}` : "not assessed yet"}`}>
              {readinessSteps.map((item, index) => <li key={item.key} className={`h-2 rounded-full ${index <= stepIndex ? (stepIndex >= 3 ? "bg-success" : "bg-primary") : "bg-muted"}`} aria-hidden="true" />)}
            </ol>
            <div className="mt-1.5 hidden grid-cols-6 gap-1 text-[11px] leading-4 text-muted-foreground sm:grid" aria-hidden="true">
              {readinessSteps.map((item, index) => <span key={item.key} className={index === stepIndex ? "font-semibold text-foreground" : ""}>{item.label}</span>)}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step ? step.meaning : "The teacher has not recorded readiness for this subject yet."}</p>
            {row?.note && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm leading-6 text-foreground"><span className="font-semibold">Teacher note:</span> {row.note}</p>}
            {row && (daysBetween(dayKey(row.updatedAt), today) > 60
              ? <p className="mt-2 text-xs text-muted-foreground">Last reviewed {dateLabel(row.updatedAt)}. This may have changed since then; ask the teacher for an update.</p>
              : <p className="mt-2 text-xs text-muted-foreground">Reviewed {dateLabel(row.updatedAt)}</p>)}
          </li>;
        })}
      </ul>
      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">How the GED test is scored<ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="grid gap-5 px-5 pb-6 text-sm leading-6 text-muted-foreground sm:px-6 md:grid-cols-2">
          <div>
            <p>The GED has four separate tests. Each one is scored from 100 to 200, and a learner needs at least 145 on every test. A high score in one subject cannot make up for a low score in another.</p>
            <dl className="mt-3 divide-y divide-border rounded-md border border-border">
              <div className="flex justify-between gap-3 px-3 py-2"><dt>Below passing</dt><dd className="font-semibold tabular-nums text-foreground">100–144</dd></div>
              <div className="flex justify-between gap-3 px-3 py-2"><dt>Passed</dt><dd className="font-semibold tabular-nums text-foreground">145–164</dd></div>
              <div className="flex justify-between gap-3 px-3 py-2"><dt>College Ready</dt><dd className="font-semibold tabular-nums text-foreground">165–174</dd></div>
              <div className="flex justify-between gap-3 px-3 py-2"><dt>College Ready + Credit</dt><dd className="font-semibold tabular-nums text-foreground">175–200</dd></div>
            </dl>
          </div>
          <div>
            <p>Before booking an official test, learners usually take the GED Ready practice test. Its result says how likely a pass is:</p>
            <dl className="mt-3 divide-y divide-border rounded-md border border-border">
              <div className="flex justify-between gap-3 px-3 py-2"><dt>Likely to pass</dt><dd className="font-semibold tabular-nums text-foreground">145–200</dd></div>
              <div className="flex justify-between gap-3 px-3 py-2"><dt>Too close to call</dt><dd className="font-semibold tabular-nums text-foreground">134–144</dd></div>
              <div className="flex justify-between gap-3 px-3 py-2"><dt>Not likely to pass</dt><dd className="font-semibold tabular-nums text-foreground">100–133</dd></div>
            </dl>
            <p className="mt-3">The readiness steps above are your learner's teachers' judgement from class work and school tests. They are not official GED scores.</p>
          </div>
        </div>
      </details>
    </Panel>

    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Panel title="Test and exam results" id="results-title">
        {overview.examResults.length ? <ul className="divide-y divide-border">
          {overview.examResults.map((result) => <li key={result.id} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground">{result.title}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{[result.subject, examTypeLabel[result.type] || result.type, result.completedAt ? dateLabel(result.completedAt) : null].filter(Boolean).join(" · ")}</p>
              {result.passed != null && <p className={`mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium ${result.passed ? "text-success" : "text-warning"}`}>{result.passed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}{result.passed ? "Reached the pass mark" : "Below the pass mark"}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-semibold tabular-nums text-foreground">{result.percent}%</p>
              <p className="text-xs tabular-nums text-muted-foreground">{result.score} / {result.totalMarks}</p>
            </div>
          </li>)}
        </ul> : <EmptyLine>No released results yet. Results appear here after teachers release them.</EmptyLine>}
        {overview.grades.length > 0 && <>
          <h3 className="border-t border-border px-5 pb-1 pt-4 text-sm font-semibold text-foreground sm:px-6">Gradebook marks</h3>
          <ul className="divide-y divide-border">
            {overview.grades.map((grade) => <li key={grade.id} className="flex items-start justify-between gap-4 px-5 py-3 sm:px-6">
              <div className="min-w-0"><p className="font-medium text-foreground">{grade.title}</p><p className="text-sm text-muted-foreground">{[grade.subject, dateLabel(grade.date)].filter(Boolean).join(" · ")}</p>{grade.comment && <p className="mt-1 text-sm leading-6 text-foreground">{grade.comment}</p>}</div>
              <p className="shrink-0 font-semibold tabular-nums text-foreground">{grade.marks} / {grade.maxMarks}</p>
            </li>)}
          </ul>
        </>}
      </Panel>

      <Panel title="Class work, last 30 days" id="work-title">
        {work.length ? <ul className="divide-y divide-border">
          {work.map((item) => {
            const due = daysBetween(today, dayKey(item.dueDate));
            const state = item.submission ? (item.submission.status === "MARKED" ? "Marked" : item.submission.status === "REDO" ? "Needs redoing" : "Handed in") : due < 0 ? "Not handed in" : due === 0 ? "Due today" : "Upcoming";
            const tone = item.submission?.status === "REDO" || (!item.submission && due < 0) ? "text-destructive" : item.submission ? "text-success" : "text-muted-foreground";
            const Icon = item.submission && item.submission.status !== "REDO" ? CheckCircle2 : !item.submission && due < 0 ? XCircle : CircleDashed;
            return <li key={item.id} className="px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><h3 className="font-medium text-foreground">{item.title}</h3><p className="mt-0.5 text-sm text-muted-foreground">{item.subject || "Class work"} · Due {dateLabel(item.dueDate, { day: "numeric", month: "short" })}</p></div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-medium ${tone}`}><Icon className="size-4" aria-hidden="true" />{state}</span>
              </div>
              {item.submission?.score != null && <p className="mt-1 text-sm text-foreground">Score: <span className="font-semibold tabular-nums">{item.submission.score}</span></p>}
              {item.submission?.feedback && <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm leading-6 text-foreground"><span className="font-semibold">Teacher feedback:</span> {item.submission.feedback}</p>}
            </li>;
          })}
        </ul> : <EmptyLine>No class work was set in the last 30 days.</EmptyLine>}
      </Panel>
    </div>

    <Panel title="Teachers" id="teachers-title" className="mt-6">
      {overview.teachers.length ? <ul className="grid sm:grid-cols-2">
        {overview.teachers.map((teacher) => <li key={teacher.id} className="border-b border-border px-5 py-3 sm:px-6">
          <p className="font-medium text-foreground" data-no-i18n>{teacher.name}</p>
          <p className="text-sm text-muted-foreground">{teacher.subjects.length ? teacher.subjects.join(", ") : "Class teacher"}</p>
        </li>)}
      </ul> : <EmptyLine>Teachers will be listed once the class timetable is set.</EmptyLine>}
      <p className="px-5 py-3 text-sm text-muted-foreground sm:px-6">To reach a teacher, send a message. The office passes it on and replies here.</p>
    </Panel>
  </div>;
}
