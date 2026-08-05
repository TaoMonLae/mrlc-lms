import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  BookOpenText,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { LanguageQuestPinyinText } from '@/src/components/games/LanguageQuestPinyinText';
import { apiGet, qs } from '@/src/lib/api';
import { languageQuestSpeechLocale } from '@/shared/languageQuestVoice';
import type { LanguageQuestLearnedWordStatus } from '@/shared/languageQuestLearnedWords';

interface LearnedWordCourse {
  id: string;
  title: string;
  language: string;
  imageEmoji: string;
  accentColor: string;
  wordCount: number;
  reviewCount: number;
  secureCount: number;
}

interface LearnedWord {
  id: string;
  challengeId: string;
  term: string;
  clue: string;
  emoji: string | null;
  audioText: string;
  pinyin: string[] | null;
  course: Omit<LearnedWordCourse, 'wordCount' | 'reviewCount' | 'secureCount'>;
  unit: { id: string; title: string };
  lesson: { id: string; title: string };
  attempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  encounters: number;
  accuracyPercent: number;
  status: LanguageQuestLearnedWordStatus;
  firstLearnedAt: string;
  lastPractisedAt: string;
}

interface LearnedWordsPayload {
  viewerMode: 'SELF' | 'TEACHER';
  learner: { id: string; name: string; avatarId: string; active: boolean };
  classroom: {
    id: string;
    name: string;
    focusCourse: Omit<LearnedWordCourse, 'wordCount' | 'reviewCount' | 'secureCount'>;
  } | null;
  selection: { courseId: string | null; status: LanguageQuestLearnedWordStatus | null; query: string };
  summary: { totalWords: number; secureWords: number; reviewWords: number; learningWords: number };
  courses: LearnedWordCourse[];
  words: LearnedWord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

const STATUS_STYLES: Record<LanguageQuestLearnedWordStatus, string> = {
  SECURE: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/15',
  REVIEW: 'bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/15',
  LEARNING: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/15',
};

const STATUS_LABELS: Record<LanguageQuestLearnedWordStatus, string> = {
  SECURE: 'Secure',
  REVIEW: 'Review',
  LEARNING: 'Learning',
};

export default function LanguageQuestWords() {
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get('classroomId') || '';
  const learnerId = searchParams.get('learnerId') || '';
  const initialCourseId = searchParams.get('courseId') || '';
  const [data, setData] = useState<LearnedWordsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [courseId, setCourseId] = useState(initialCourseId);
  const [status, setStatus] = useState<LanguageQuestLearnedWordStatus | ''>('');
  const [page, setPage] = useState(1);
  const [studyMode, setStudyMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => { setPage(1); }, [debouncedQuery, courseId, status]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    apiGet<LearnedWordsPayload>(`/api/language-quest/learned-words${qs({
      classroomId: classroomId || null,
      learnerId: learnerId || null,
      courseId: courseId || null,
      q: debouncedQuery || null,
      status: status || null,
      page: String(page),
      pageSize: '48',
    })}`, { signal: controller.signal })
      .then((payload) => {
        setData(payload);
        if (payload.viewerMode === 'TEACHER' && payload.selection.courseId) setCourseId(payload.selection.courseId);
      })
      .catch((error: any) => {
        if (error?.name === 'AbortError') return;
        const message = error?.message || 'Could not load learned words';
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [classroomId, learnerId, courseId, debouncedQuery, status, page]);

  const returnPath = data?.viewerMode === 'TEACHER'
    ? '/games/language-quest/classrooms'
    : initialCourseId ? `/games/language-quest/courses/${initialCourseId}` : '/games/language-quest';
  const returnLabel = data?.viewerMode === 'TEACHER' ? 'Classroom roster' : initialCourseId ? 'Course path' : 'Language Quest';
  const currentCourse = useMemo(
    () => data?.courses.find((course) => course.id === data.selection.courseId) || data?.classroom?.focusCourse || null,
    [data],
  );

  const speak = (word: LearnedWord) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.audioText || word.term);
    utterance.lang = languageQuestSpeechLocale(word.course.language);
    window.speechSynthesis.speak(utterance);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loadError && !data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <BookOpenText className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">Learned words are unavailable</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-300">{loadError}</p>
        <Button className="mt-6" render={<Link to="/games/language-quest" />} nativeButton={false}>Back to Language Quest</Button>
      </div>
    );
  }

  if (!data) {
    return <div className="grid min-h-[420px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <Button variant="ghost" className="-ml-2" render={<Link to={returnPath} />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {returnLabel}
      </Button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-violet-700 to-fuchsia-700 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-white/10" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            {data.viewerMode === 'TEACHER' ? (
              <LanguageQuestAvatar avatarId={data.learner.avatarId} name={data.learner.name} className="h-16 w-16 shrink-0 text-3xl ring-4 ring-white/20" />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15"><BookOpenText className="h-8 w-8" /></span>
            )}
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">{data.viewerMode === 'TEACHER' ? 'Teacher review' : 'Your personal word bank'}</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">{data.viewerMode === 'TEACHER' ? `${data.learner.name}’s Learned Words` : 'My Learned Words'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                {data.viewerMode === 'TEACHER'
                  ? `${data.classroom?.name} · ${currentCourse?.title || 'Focus course'}. Review words from completed practices and spot terms that need support.`
                  : 'Every vocabulary word or phrase from a completed practice is saved here automatically. Search, listen, and switch to study mode whenever you want to review.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="shrink-0 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            onClick={() => { setStudyMode((value) => !value); setRevealedIds(new Set()); }}
          >
            {studyMode ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
            {studyMode ? 'Show full list' : 'Study with hidden words'}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Learned" value={data.summary.totalWords} icon={<BookOpenText className="h-5 w-5" />} tone="bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" />
        <Stat label="Secure" value={data.summary.secureWords} icon={<CheckCircle2 className="h-5 w-5" />} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" />
        <Stat label="Learning" value={data.summary.learningWords} icon={<Sparkles className="h-5 w-5" />} tone="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" />
        <Stat label="Needs review" value={data.summary.reviewWords} icon={<Brain className="h-5 w-5" />} tone="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_240px_180px]">
          <label className="relative">
            <span className="sr-only">Search learned words</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search words, meanings, lessons…" />
          </label>
          <label>
            <span className="sr-only">Filter by course</span>
            <select value={data.viewerMode === 'TEACHER' ? data.selection.courseId || '' : courseId} onChange={(event) => setCourseId(event.target.value)} disabled={data.viewerMode === 'TEACHER'} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              {data.viewerMode === 'SELF' && <option value="">All courses</option>}
              {data.courses.map((course) => <option key={course.id} value={course.id}>{course.imageEmoji} {course.title} ({course.wordCount})</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by learning status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as LanguageQuestLearnedWordStatus | '')} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
              <option value="">All statuses</option>
              <option value="REVIEW">Needs review</option>
              <option value="LEARNING">Still learning</option>
              <option value="SECURE">Secure</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="grid min-h-64 place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>
      ) : data.words.length === 0 ? (
        <section className="rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 p-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <BookOpenText className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white">{data.summary.totalWords ? 'No words match these filters' : 'No learned words yet'}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{data.summary.totalWords ? 'Try another search, course, or status.' : 'Complete vocabulary practices in a lesson and the words will appear here automatically.'}</p>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Learned words">
          {data.words.map((word) => {
            const revealed = !studyMode || revealedIds.has(word.id);
            return (
              <article key={word.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="h-1.5" style={{ backgroundColor: word.course.accentColor }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black uppercase tracking-wider text-slate-400">{word.course.imageEmoji} {word.course.title}</p>
                      {revealed ? (
                        <div className="mt-3 flex items-start gap-2">
                          {word.emoji && <span className="text-2xl">{word.emoji}</span>}
                          <h2 className="min-w-0 text-2xl font-black text-slate-950 dark:text-white"><LanguageQuestPinyinText text={word.term} pinyin={word.pinyin} size="lg" /></h2>
                        </div>
                      ) : (
                        <p className="mt-3 text-lg font-black text-violet-700 dark:text-violet-300">Think of the word…</p>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="shrink-0" onClick={() => speak(word)} aria-label={`Listen to ${word.term}`}><Volume2 className="h-4 w-4" /></Button>
                  </div>

                  <div className="mt-4 min-h-24 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meaning or practice clue</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{word.clue}</p>
                  </div>

                  {studyMode && (
                    <Button variant="outline" className="mt-3 w-full" onClick={() => toggleReveal(word.id)}>
                      {revealed ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />} {revealed ? 'Hide word' : 'Reveal word'}
                    </Button>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge className={STATUS_STYLES[word.status]}>{STATUS_LABELS[word.status]}</Badge>
                    <span className="text-xs font-bold text-slate-500">{word.accuracyPercent}% accuracy</span>
                    {word.encounters > 1 && <span className="text-xs text-slate-400">Seen in {word.encounters} practices</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                    <span className="truncate">{word.unit.title} · {word.lesson.title}</span>
                    <span className="shrink-0">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(word.lastPractisedAt))}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {data.pagination.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Learned words pages">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="mr-1 h-4 w-4" /> Previous</Button>
          <span className="text-sm font-bold text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages}</span>
          <Button variant="outline" disabled={page >= data.pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
        </nav>
      )}

      {data.viewerMode === 'TEACHER' && (
        <section className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-100">
          <GraduationCap className="mt-0.5 h-5 w-5 shrink-0" />
          <p>This review is limited to <strong>{data.classroom?.focusCourse.title}</strong>, the course assigned to {data.classroom?.name}. Other personal learning remains private.</p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>{icon}</span>
      <div><p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p><p className="text-xs font-bold text-slate-500">{label}</p></div>
    </div>
  );
}
