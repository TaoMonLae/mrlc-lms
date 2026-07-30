import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ArrowLeft, BookOpenText, RotateCcw, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/src/lib/api';
import { languageQuestStoryById } from '@/shared/languageQuestStory';
import { useLanguageQuestPreferences } from '@/src/components/games/LanguageQuestPreferences';
import { speakLanguageQuestVoice, cancelLanguageQuestVoice } from '@/src/lib/languageQuestVoice';

interface CourseHeader {
  id: string;
  title: string;
  language: string;
  accentColor: string;
}

const ENDING_STYLES = {
  good: { badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200', panel: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20' },
  ok: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200', panel: 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/20' },
  poor: { badge: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200', panel: 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900' },
} as const;

export default function LanguageQuestStory() {
  const { courseId, storyId } = useParams<{ courseId: string; storyId: string }>();
  const { voiceProvider, reducedMotion } = useLanguageQuestPreferences();
  const [course, setCourse] = useState<CourseHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const story = useMemo(() => (storyId ? languageQuestStoryById(storyId) : undefined), [storyId]);
  const [nodeId, setNodeId] = useState(story?.startNodeId ?? '');

  useEffect(() => {
    if (!courseId) return;
    apiGet<CourseHeader>(`/api/language-quest/courses/${courseId}`)
      .then(setCourse)
      .catch((error: any) => toast.error(error?.message || 'Could not load this course'))
      .finally(() => setLoading(false));
    return cancelLanguageQuestVoice;
  }, [courseId]);

  useEffect(() => {
    if (story) setNodeId(story.startNodeId);
  }, [story]);

  const node = story?.nodes[nodeId];

  useEffect(() => {
    if (node?.ending && node.ending.tone === 'good' && !reducedMotion) {
      void confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 }, colors: [course?.accentColor || '#7c3aed', '#f59e0b'] });
    }
  }, [node, reducedMotion, course]);

  const speak = (value: string, language: string) => {
    void speakLanguageQuestVoice(value, language, voiceProvider).then((result) => {
      if (result === 'unavailable') toast.info('Speech is not supported by this browser');
    });
  };

  const restart = () => {
    if (story) setNodeId(story.startNodeId);
  };

  if (loading) {
    return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;
  }

  if (!course || !story || !node) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <BookOpenText className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900 dark:text-white">This story could not be found.</p>
        <Button variant="outline" className="mt-4" render={<Link to={courseId ? `/games/language-quest/courses/${courseId}` : '/games/language-quest'} />} nativeButton={false}>Back to course</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      <Button variant="ghost" className="-ml-2" render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {course.title}
      </Button>

      <section className="overflow-hidden rounded-3xl text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${course.accentColor}, ${course.accentColor}cc)` }}>
        <div className="flex items-center gap-4 p-6 sm:p-8">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15"><BookOpenText className="h-8 w-8" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Story Mode</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{story.title}</h1>
            <p className="mt-1 text-sm text-white/80">{story.scenario}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">{node.speaker}</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h2 className="text-xl font-black leading-snug text-slate-950 dark:text-white sm:text-2xl">{node.line}</h2>
          <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => speak(node.audioText || node.line, course.language)} aria-label="Listen">
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">{node.translation}</p>

        {node.ending ? (
          <div className={`mt-6 rounded-2xl border-2 p-5 ${ENDING_STYLES[node.ending.tone].panel}`}>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${ENDING_STYLES[node.ending.tone].badge}`}>{node.ending.title}</span>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{node.ending.message}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={restart}>
                <RotateCcw className="mr-2 h-4 w-4" /> Try a different path
              </Button>
              <Button className="flex-1" style={{ backgroundColor: course.accentColor }} render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}>
                Back to course
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {node.choices?.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => setNodeId(choice.nextNodeId)}
                className="w-full rounded-2xl border-2 border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-surface-raised dark:hover:border-violet-600"
              >
                <p className="font-bold text-slate-900 dark:text-white">{choice.text}</p>
                <p className="mt-0.5 text-xs italic text-slate-500 dark:text-slate-400">{choice.translation}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
