import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Filter,
  GraduationCap,
  Target,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/src/lib/api';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import type {
  LanguageQuestAnalyticsMetrics,
  LanguageQuestAnalyticsPayload,
} from '@/src/types/languageQuest';
import {
  languageQuestAnalyticsStatusLabel,
  type LanguageQuestAnalyticsStatus,
} from '@/shared/languageQuestAnalytics';

const statusStyle: Record<LanguageQuestAnalyticsStatus, string> = {
  NO_DATA: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
  NEEDS_REVIEW: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200',
  DEVELOPING: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  SECURE: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
};

function StatusBadge({ status }: { status: LanguageQuestAnalyticsStatus }) {
  return <Badge variant="outline" className={statusStyle[status]}>{languageQuestAnalyticsStatusLabel(status)}</Badge>;
}

function AccuracyBar({ value }: { value: number | null }) {
  const percentage = value ?? 0;
  const tone = value === null
    ? 'bg-slate-300'
    : value < 70
      ? 'bg-rose-500'
      : value < 85
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-black text-slate-700 dark:text-slate-200">{value === null ? '—' : `${value}%`}</span>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}>{icon}</div>
      <p className="mt-5 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
    </article>
  );
}

function lastActivity(value: string | null) {
  if (!value) return 'No attempts yet';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function attemptDetail(metrics: LanguageQuestAnalyticsMetrics) {
  return `${metrics.correctAttempts} correct · ${metrics.wrongAttempts} incorrect`;
}

export default function LanguageQuestAnalytics() {
  const [data, setData] = useState<LanguageQuestAnalyticsPayload | null>(null);
  const [classroomId, setClassroomId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (classroomId) params.set('classroomId', classroomId);
    if (courseId) params.set('courseId', courseId);
    setLoading(true);
    setLoadError('');
    apiGet<LanguageQuestAnalyticsPayload>(
      `/api/language-quest/analytics${params.size ? `?${params}` : ''}`,
      { signal: controller.signal },
    )
      .then(setData)
      .catch((error: any) => {
        if (error?.name === 'AbortError') return;
        const message = error?.message || 'Could not load Learning Quest analytics';
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [classroomId, courseId, reloadKey]);

  const weakestQuestions = useMemo(
    () => data?.questions.filter((question) => question.status === 'NEEDS_REVIEW').slice(0, 12) ?? [],
    [data],
  );
  const displayedQuestions = weakestQuestions.length ? weakestQuestions : data?.questions.slice(0, 12) ?? [];
  const selectedClassroom = data?.filters.classrooms.find((classroom) => classroom.id === classroomId);

  if (!data && loadError) {
    return (
      <div className="grid min-h-[520px] place-items-center px-4">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm dark:border-rose-500/30 dark:bg-slate-900">
          <AlertTriangle className="mx-auto h-11 w-11 text-rose-500" />
          <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">Analytics could not load</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{loadError}</p>
          <Button className="mt-5" onClick={() => setReloadKey((value) => value + 1)}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-[520px] place-items-center" aria-busy="true">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          <p className="mt-4 text-sm font-bold text-slate-500">Building the class learning picture…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-w-0 max-w-full space-y-6 pb-12 transition-opacity ${loading ? 'opacity-70' : 'opacity-100'}`} aria-busy={loading}>
      <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Learning Quest
      </Button>

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-400/10 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-fuchsia-200">
              <BarChart3 className="h-4 w-4" /> Teacher learning insights
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Learning Quest Analytics</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              See which questions, lessons, and practice skills need reteaching—and which learners may benefit from focused support.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">Current view</p>
            <p className="mt-1 font-black">{data.selection.classroomLabel}</p>
            <p className="text-xs text-white/65">{data.selection.courseLabel}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
          <Filter className="h-4 w-4" /> Analytics scope
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Classroom
            <select
              value={classroomId}
              onChange={(event) => setClassroomId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-violet-500/15"
            >
              <option value="">{data.filters.classrooms.length ? 'All accessible classrooms' : 'All learners'}</option>
              {data.filters.classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name} · {classroom.memberCount} learners</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Course
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-violet-500/15"
            >
              <option value="">All courses</option>
              {data.filters.courses.map((course) => (
                <option key={course.id} value={course.id}>{course.imageEmoji} {course.title}{course.published ? '' : ' · Draft'}</option>
              ))}
            </select>
          </label>
        </div>
        {selectedClassroom?.focusCourseTitle && !courseId && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Classroom focus: <strong>{selectedClassroom.focusCourseTitle}</strong>. Choose it above to isolate that course.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Users className="h-5 w-5" />} label="Learners in scope" value={data.summary.learnerCount} detail={`${data.summary.activeLearnerCount} have recorded attempts`} tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" />
        <MetricCard icon={<Activity className="h-5 w-5" />} label="Answer attempts" value={data.summary.attempts.toLocaleString()} detail={attemptDetail(data.summary)} tone="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" />
        <MetricCard icon={<Target className="h-5 w-5" />} label="Overall accuracy" value={data.summary.accuracyPercent === null ? '—' : `${data.summary.accuracyPercent}%`} detail={`${data.summary.questionCount} questions attempted`} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Questions to review" value={data.summary.needsReviewCount} detail="At least 3 attempts and below 70% accuracy" tone="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" />
      </section>

      {data.summary.attempts === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <BookOpenCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">No attempts in this view yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Try another classroom or course. Analytics will appear after learners answer Learning Quest challenges.</p>
        </section>
      ) : (
        <>
          <section className="grid min-w-0 gap-6 xl:grid-cols-2">
            <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Practice skills</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Accuracy by activity</h2>
                </div>
                <Badge variant="secondary">{data.skills.length} skills</Badge>
              </div>
              <div className="mt-5 space-y-4">
                {data.skills.map((skill) => (
                  <div key={skill.type} className="min-w-0 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{skill.label}</p>
                        <p className="text-xs text-slate-500">{skill.attempts} attempts · {skill.questionCount} questions</p>
                      </div>
                      <StatusBadge status={skill.status} />
                    </div>
                    <div className="mt-3"><AccuracyBar value={skill.accuracyPercent} /></div>
                  </div>
                ))}
              </div>
            </article>

            <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-600 dark:text-fuchsia-300">Lesson signals</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Lessons needing attention</h2>
                </div>
                <GraduationCap className="h-6 w-6 text-fuchsia-500" />
              </div>
              <div className="mt-5 space-y-3">
                {data.lessons.slice(0, 8).map((lesson) => (
                  <div key={lesson.lessonId} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900 dark:text-white">{lesson.lessonTitle}</p>
                        <p className="truncate text-xs text-slate-500">{lesson.courseTitle} · {lesson.unitTitle}</p>
                      </div>
                      <StatusBadge status={lesson.status} />
                    </div>
                    <div className="mt-3"><AccuracyBar value={lesson.accuracyPercent} /></div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-end sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">Question diagnosis</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{weakestQuestions.length ? 'Weakest questions' : 'Attempted questions'}</h2>
                <p className="mt-1 text-sm text-slate-500">Use these prompts for a mini-lesson, small group, or targeted practice.</p>
              </div>
              <Badge variant="outline">Showing {displayedQuestions.length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr><th className="px-6 py-3">Question</th><th className="px-4 py-3">Skill</th><th className="px-4 py-3">Accuracy</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Learners</th><th className="px-6 py-3">Signal</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedQuestions.map((question) => (
                    <tr key={question.challengeId} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="max-w-md px-6 py-4">
                        <p className="font-bold leading-5 text-slate-900 dark:text-white">{question.question}</p>
                        <p className="mt-1 text-xs text-slate-500">{question.courseTitle} · {question.unitTitle} · {question.lessonTitle}</p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-300">{question.skillLabel}</td>
                      <td className="px-4 py-4"><AccuracyBar value={question.accuracyPercent} /></td>
                      <td className="px-4 py-4"><span className="font-black text-slate-900 dark:text-white">{question.attempts}</span><p className="text-xs text-rose-500">{question.wrongAttempts} incorrect</p></td>
                      <td className="px-4 py-4 font-black text-slate-700 dark:text-slate-200">{question.learnerCount}</td>
                      <td className="px-6 py-4"><StatusBadge status={question.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">Learner support</p>
                <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Who may need a check-in</h2>
                <p className="mt-1 text-sm text-slate-500">Lowest accuracy appears first; learners without attempts remain visible for classroom scopes.</p>
              </div>
              <Badge variant="secondary">{data.learners.length} learners</Badge>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.learners.slice(0, 15).map((learner) => (
                <article key={learner.userId} className="min-w-0 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <LanguageQuestAvatar avatarId={learner.avatarId} name={learner.name} className="h-11 w-11 text-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-slate-900 dark:text-white">{learner.name}</p>
                      <p className="text-xs text-slate-500">{lastActivity(learner.lastAttemptAt)}</p>
                    </div>
                    {learner.status === 'SECURE' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <StatusBadge status={learner.status} />}
                  </div>
                  <div className="mt-4"><AccuracyBar value={learner.accuracyPercent} /></div>
                  <p className="mt-2 text-xs text-slate-500">{learner.attempts} attempts · {attemptDetail(learner)}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
