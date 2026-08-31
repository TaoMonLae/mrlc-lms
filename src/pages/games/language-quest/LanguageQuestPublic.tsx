import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  BookOpen,
  BookMarked,
  CheckCircle2,
  Globe2,
  Headphones,
  Heart,
  Info,
  Keyboard,
  Languages,
  LogIn,
  MessageCircle,
  Moon,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Sigma,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/src/components/theme-provider';
import { MrlcQuestBrand, TaoMonLaeCredit } from '@/src/components/games/MrlcQuestBrand';
import { LanguageQuestCourseFolders } from '@/src/components/games/LanguageQuestCourseFolder';
import { useAuth } from '@/src/providers/AuthProvider';
import { orderedLanguageQuestCategories } from '@/shared/languageQuestCourseCategories';
import { QuestDepthStage, QuestStaggeredText } from '@/src/components/games/LanguageQuestMotion';

interface PublicCourse {
  id: string;
  title: string;
  description: string | null;
  language: string;
  category: string;
  imageEmoji: string;
  accentColor: string;
  unitCount: number;
  lessonCount: number;
  challengeCount: number;
}

export default function LanguageQuestPublic() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogStatus('loading');
    fetch('/api/language-quest/public/catalog', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Catalog request failed (${response.status})`))))
      .then((payload) => {
        setCourses(payload.courses ?? []);
        setCatalogStatus('ready');
      })
      .catch((error: any) => {
        if (error?.name !== 'AbortError') setCatalogStatus('error');
      });
    return () => controller.abort();
  }, [catalogRetry]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => setSystemDark(media.matches);
    syncSystemTheme();
    media.addEventListener('change', syncSystemTheme);
    return () => media.removeEventListener('change', syncSystemTheme);
  }, []);

  const startHref = user ? '/games/language-quest' : '/signup';
  const darkMode = theme === 'dark' || (theme === 'system' && systemDark);
  const courseGroups = orderedLanguageQuestCategories(courses);

  return (
    <div className="lq-mesh min-h-screen overflow-x-hidden text-slate-950 transition-colors duration-300 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-[var(--lq-steel-border)] bg-[var(--lq-paper-white)]/90 shadow-[var(--lq-shadow-subtle)] backdrop-blur-xl transition-colors dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/20">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <MrlcQuestBrand compact />
          <div className="flex items-center gap-2">
            <Link to="/language-quest/about" className="lq-btn-ghost hidden md:inline-flex dark:text-slate-200">
              <Info className="mr-2 h-4 w-4" /> About
            </Link>
            {!user && (
              <Link to="/login" aria-label="Sign in" className="lq-btn-ghost dark:text-slate-200">
                <LogIn className="h-4 w-4 sm:hidden" aria-hidden="true" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-[var(--lq-steel-border)] bg-white/80 text-[var(--lq-signal-blue)] shadow-sm hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-amber-300 dark:hover:bg-slate-800"
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </Button>
            <Link to={startHref} className="lq-btn-primary">
              {user ? 'Continue learning' : 'Start free'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lq-hero-gradient relative overflow-hidden px-4 pb-20 pt-12 text-white sm:px-6 sm:pt-20 lg:pb-28">
          <div className="pointer-events-none absolute -left-16 top-16 h-40 w-40 rounded-full bg-[var(--lq-spring-mint)]/25 blur-2xl" />
          <div className="pointer-events-none absolute -right-24 top-4 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.03fr_.97fr]">
            <div className="relative z-10 text-center lg:text-left">
              <Badge className="border-white/25 bg-white/10 px-3 py-1.5 text-white shadow-sm hover:bg-white/10">
                <Sparkles className="h-3.5 w-3.5" /> Guided learning for real life
              </Badge>
              <QuestStaggeredText
                text="Learn the idea. Build the skill. Grow with confidence."
                className="mx-auto mt-6 max-w-3xl text-balance text-[clamp(2.65rem,7.2vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-white lg:mx-0"
              />
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8 lg:mx-0">
                Short guided courses combine languages, K–12 mathematics, worked feedback, and friendly scored practice. Learn at your own pace and keep every achievement in one free account.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link to={startHref} className="lq-btn-primary h-13 px-7 text-base">
                  {user ? 'Continue your quest' : 'Create a learner account'} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <a href="#courses" className="lq-btn-outline h-13 border-white px-7 text-base text-white hover:bg-white/10" style={{ borderColor: '#fff', color: '#fff' }}>
                  Explore courses
                </a>
              </div>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/75 lg:justify-start">
                <ShieldCheck className="h-4 w-4 text-[var(--lq-spring-mint)]" /> Visitors can browse courses. A free signup is required to begin and save progress.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-bold text-white/78 lg:justify-start">
                <span className="inline-flex items-center gap-1.5"><Headphones className="h-4 w-4" /> Listen</span>
                <span className="inline-flex items-center gap-1.5"><Keyboard className="h-4 w-4" /> Spell</span>
                <span className="inline-flex items-center gap-1.5"><Sigma className="h-4 w-4" /> Solve</span>
                <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> Speak in sentences</span>
              </div>
            </div>

            <QuestDepthStage className="relative mx-auto w-full max-w-xl py-8 sm:px-6">
              <img
                src="/icons/LanguageQuests_Graphics/Owl School 8.svg"
                alt=""
                aria-hidden="true"
                className="lq-float-delayed pointer-events-none absolute -left-8 -top-6 z-20 hidden h-28 w-28 object-contain drop-shadow-2xl sm:block"
              />
              <div className="lq-orbit pointer-events-none absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-violet-300/60 dark:border-violet-400/35">
                <span className="absolute -top-3 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-2xl bg-amber-400 text-white shadow-lg"><Star className="h-5 w-5 fill-current" /></span>
                <span className="absolute -bottom-3 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-2xl bg-sky-500 text-white shadow-lg"><Globe2 className="h-5 w-5" /></span>
              </div>
              <div className="relative rounded-[2rem] border border-white bg-white/90 p-3 shadow-[0_35px_90px_-28px_rgba(59,30,144,.45)] backdrop-blur sm:p-5">
                <div className="lq-hero-gradient relative overflow-hidden rounded-[1.6rem] p-6 text-white sm:p-8">
                  <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/15 blur-2xl" />
                  <div className="lq-depth-1 relative flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Sentence practice</p>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Zap className="h-4 w-4 fill-amber-300 text-amber-300" /></span>
                  </div>
                  <p className="lq-depth-1 relative mt-5 text-sm text-white/75">Write the polite response:</p>
                  <p className="lq-depth-2 relative mt-2 text-3xl font-black sm:text-4xl">“Thank you.”</p>
                  <div className="lq-depth-2 relative mt-8 rounded-2xl border-2 border-white/30 bg-white/15 px-4 py-4 text-lg font-semibold shadow-inner sm:px-5">
                    You’re welcome.
                  </div>
                  <div className="lq-depth-1 relative mt-5 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-white/80">Meaning + form + confidence</span>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--lq-spring-mint)] text-[var(--lq-charcoal)] shadow-lg"><CheckCircle2 className="h-5 w-5" /></span>
                  </div>
                </div>
              </div>
              <div className="lq-float absolute -bottom-1 left-0 rounded-2xl border border-violet-100 bg-white px-5 py-4 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:-left-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Today</p>
                <p className="mt-1 font-black text-violet-700 dark:text-violet-300">3 useful sentences learned</p>
              </div>
              <div className="lq-float-delayed absolute -right-1 top-0 grid h-14 w-14 place-items-center rounded-2xl bg-rose-500 text-white shadow-xl sm:-right-2">
                <Heart className="h-7 w-7 fill-current" />
              </div>
            </QuestDepthStage>
          </div>
        </section>

        <section className="border-y border-[var(--lq-steel-border)] bg-[var(--lq-paper-white)]/80 px-4 py-16 backdrop-blur transition-colors dark:border-slate-800/80 dark:bg-slate-950/55 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--lq-signal-blue)]">Your lesson guide</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--lq-charcoal)] dark:text-white sm:text-4xl">A clear routine in every lesson</h2>
              <p className="mt-3 leading-7 text-[var(--lq-slate-caption)] dark:text-slate-300">You always know what to do next, why it matters, and how to recover from a mistake.</p>
            </div>
            <div className="mt-10 grid overflow-hidden border-y border-l border-[var(--lq-steel-border)] bg-[var(--lq-steel-border)] md:grid-cols-2 xl:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
              {[
                { art: '/icons/optimized/LanguageLearning/V1/Listening.png', step: '01', title: 'Learn and listen', copy: 'Meet the key phrase, hear its pronunciation, and connect it to a real situation.' },
                { art: '/icons/optimized/LanguageLearning/V1/Notes.png', step: '02', title: 'Listen and spell', copy: 'Hear the word without seeing its letters, then type it from memory.' },
                { art: '/icons/optimized/LanguageLearning/V1/Conversation.png', step: '03', title: 'Build the sentence', copy: 'Type the complete phrase from memory. Punctuation and capital letters will not block you.' },
                { art: '/icons/optimized/LanguageLearning/V1/Dictionary.png', step: '04', title: 'Check understanding', copy: 'Read a clear correction and retry immediately when needed.' },
              ].map(({ art, step, title, copy }) => (
                <article key={step} className="group border-b border-r border-[var(--lq-steel-border)] bg-white p-6 transition-colors hover:bg-sky-50/70 dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 border-[var(--lq-signal-blue)] bg-sky-50 transition-transform duration-200 group-hover:-translate-y-1 dark:bg-sky-950">
                      <img src={art} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-12 w-12 object-contain drop-shadow-md" />
                    </span>
                    <span className="text-2xl font-extrabold text-[var(--lq-signal-blue)]/25 dark:text-sky-300/30">{step}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="courses" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--lq-signal-blue)]">Course library</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--lq-charcoal)] dark:text-white sm:text-4xl">Choose your next quest</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[var(--lq-slate-caption)] dark:text-slate-300">Browse freely. Create an account when you are ready to open a lesson and save your progress.</p>
            </div>

            {catalogStatus === 'loading' ? (
              <div className="lq-card mt-10 p-12 text-center dark:border dark:border-slate-800" aria-busy="true">
                <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[var(--lq-steel-border)] border-t-[var(--lq-signal-blue)]" />
                <p className="mt-4 font-bold text-[var(--lq-charcoal)] dark:text-white">Loading course previews…</p>
              </div>
            ) : catalogStatus === 'error' ? (
              <div className="lq-card mt-10 p-10 text-center dark:border dark:border-rose-500/30" role="alert">
                <BookOpen className="mx-auto h-10 w-10 text-rose-400" />
                <p className="mt-3 font-black text-[var(--lq-charcoal)] dark:text-white">We could not load the course library.</p>
                <p className="mt-1 text-sm text-[var(--lq-slate-caption)] dark:text-slate-300">Check your connection and try again.</p>
                <button type="button" className="lq-btn-outline mt-5" onClick={() => setCatalogRetry((value) => value + 1)}><RefreshCcw className="mr-2 h-4 w-4" /> Try again</button>
              </div>
            ) : courses.length ? (
              <div className="mt-10">
                <LanguageQuestCourseFolders
                  groups={courseGroups}
                  idPrefix="public-course-folder"
                  renderCourse={(course) => (
                    <article key={course.id} className="group min-w-0 bg-white p-6 transition-colors hover:bg-sky-50/70 dark:bg-slate-900 dark:hover:bg-slate-800/85">
                        <div className="flex items-start gap-4">
                          <span className="lq-tile-circle relative grid h-14 w-14 shrink-0 place-items-center border border-[var(--lq-steel-border)] text-3xl transition-transform duration-200 group-hover:-translate-y-1 dark:border-slate-700">
                            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900" style={{ backgroundColor: course.accentColor }} aria-hidden="true" />
                            {course.imageEmoji}
                          </span>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--lq-slate-caption)] dark:text-slate-500">{course.language}</p>
                            <h4 className="mt-1 text-xl font-black text-[var(--lq-charcoal)] dark:text-white">{course.title}</h4>
                          </div>
                        </div>
                        <p className="mt-4 min-h-12 text-sm leading-6 text-[var(--lq-slate-caption)] dark:text-slate-300">{course.description || 'A practical language course for everyday learning.'}</p>
                        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[var(--lq-slate-caption)] dark:text-slate-400">
                          <span className="rounded-full bg-[var(--lq-canvas-mist)] px-3 py-1.5 dark:bg-slate-800">{course.unitCount} units</span>
                          <span className="rounded-full bg-[var(--lq-canvas-mist)] px-3 py-1.5 dark:bg-slate-800">{course.lessonCount} lessons</span>
                          <span className="rounded-full bg-[var(--lq-canvas-mist)] px-3 py-1.5 dark:bg-slate-800">{course.challengeCount} practices</span>
                        </div>
                        <Link to={user ? `/games/language-quest/courses/${course.id}` : '/signup'} className="mt-6 flex min-h-11 items-center justify-between border-t border-[var(--lq-steel-border)] pt-4 text-sm font-extrabold text-[var(--lq-signal-blue)] outline-none focus-visible:ring-4 focus-visible:ring-[var(--lq-signal-blue)]/20 dark:border-slate-700">
                          {user ? 'Open this course' : 'Sign up to learn'} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </article>
                  )}
                />
              </div>
            ) : (
              <div className="lq-card mt-10 border border-dashed border-[var(--lq-steel-border)] p-12 text-center dark:border-slate-700">
                <BookOpen className="mx-auto h-10 w-10 text-[var(--lq-signal-blue)]/60" />
                <p className="mt-3 font-bold text-[var(--lq-charcoal)] dark:text-white">No courses are published yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className="lq-hero-gradient border-y border-white/10 px-4 py-14 text-white sm:px-6 sm:py-16">
          <div className="relative mx-auto grid max-w-7xl items-center gap-7 sm:grid-cols-[auto_1fr_auto]">
            <span className="grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-white/10"><Languages className="h-8 w-8 text-white" /></span>
            <div>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white">Ready to turn useful words into confident sentences?</h2>
              <p className="mt-2 max-w-2xl text-white/75">Create your learner account, start a course, and keep every achievement in one place.</p>
            </div>
            <Link to={startHref} className="lq-btn-primary min-h-13 shrink-0 px-7 text-base">
              {user ? 'Continue learning' : 'Start Learning Quest'} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-[var(--lq-steel-border)] bg-[var(--lq-canvas-mist)]/90 px-4 py-8 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <MrlcQuestBrand compact />
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--lq-slate-caption)] dark:text-slate-400">
            <BookMarked className="h-4 w-4 text-[var(--lq-signal-blue)]" /> Learning made with care for every learner.
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <Link to="/language-quest/about" className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--lq-signal-blue)] underline-offset-4 hover:underline">
              <Info className="h-3.5 w-3.5" /> About &amp; course sources
            </Link>
            <TaoMonLaeCredit />
          </div>
        </div>
      </footer>
    </div>
  );
}
