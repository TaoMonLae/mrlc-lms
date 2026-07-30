import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Compass, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/src/lib/api';
import { languageQuestCategoryForLanguage } from '@/shared/languageQuestCourseCategories';
import { languageQuestCultureTopics } from '@/shared/languageQuestCulture';

interface CourseHeader {
  id: string;
  title: string;
  language: string;
  category: string;
  accentColor: string;
}

// Culture Quest is unscored, browse-at-your-own-pace side content -- no
// hearts, no XP, no progress tracking. It's meant to sit alongside the real
// lesson path and give a language some real-world context, so it stays as
// simple as reading a short article.
export default function LanguageQuestCulture() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<CourseHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    apiGet<CourseHeader>(`/api/language-quest/courses/${courseId}`)
      .then((data) => {
        setCourse(data);
        setOpenId(null);
      })
      .catch((error: any) => toast.error(error?.message || 'Could not load this course'))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div>;
  }

  if (!course) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <Globe2 className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900 dark:text-white">This course could not be found.</p>
        <Button variant="outline" className="mt-4" render={<Link to="/games/language-quest" />} nativeButton={false}>Back to Language Quest</Button>
      </div>
    );
  }

  const category = course.category?.trim() || languageQuestCategoryForLanguage(course.language);
  const topics = languageQuestCultureTopics(category);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Button variant="ghost" className="-ml-2" render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {course.title}
      </Button>

      <section className="overflow-hidden rounded-3xl text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${course.accentColor}, ${course.accentColor}cc)` }}>
        <div className="flex items-center gap-4 p-6 sm:p-8">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15"><Compass className="h-8 w-8" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Culture Quest</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Beyond the words</h1>
            <p className="mt-1 text-sm text-white/80">Short, unscored reads about the people and customs behind {course.language}.</p>
          </div>
        </div>
      </section>

      {topics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <Globe2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">Culture notes for {course.language} are coming soon.</p>
          <p className="mt-1 text-sm text-slate-500">Keep learning the language in the meantime -- this corner will fill in over time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => {
            const open = openId === topic.id;
            return (
              <article key={topic.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : topic.id)}
                  className="flex w-full items-center gap-4 p-5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-3xl" aria-hidden="true">{topic.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-900 dark:text-white">{topic.title}</h2>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">{topic.summary}</p>
                  </div>
                </button>
                {open && (
                  <ul className="space-y-2 border-t border-slate-100 px-5 py-4 dark:border-surface-raised">
                    {topic.facts.map((fact, factIndex) => (
                      <li key={factIndex} className="flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        <span aria-hidden="true" style={{ color: course.accentColor }}>•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
