import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Moon,
  ShieldCheck,
  Sparkles,
  SpellCheck2,
  Star,
  Sun,
  Target,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/src/components/theme-provider';
import { MrlcQuestBrand, TaoMonLaeCredit } from '@/src/components/games/MrlcQuestBrand';
import { LanguageQuestCourseFolder } from '@/src/components/games/LanguageQuestCourseFolder';
import { useAuth } from '@/src/providers/AuthProvider';
import { orderedLanguageQuestCategories } from '@/shared/languageQuestCourseCategories';

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
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    fetch('/api/language-quest/public/catalog')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => setCourses(payload.courses ?? []))
      .catch(() => setCourses([]));
  }, []);

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
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 shadow-sm shadow-violet-900/5 backdrop-blur-xl transition-colors dark:border-slate-800/90 dark:bg-slate-950/85 dark:shadow-black/20">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <MrlcQuestBrand compact />
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="hidden font-bold text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:inline-flex" render={<Link to="/language-quest/about" />} nativeButton={false}>
              <Info className="mr-2 h-4 w-4" /> About
            </Button>
            {!user && (
              <Button variant="ghost" className="hidden font-bold text-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex" render={<Link to="/login" />} nativeButton={false}>
                Sign in
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-violet-200 bg-white/80 text-violet-700 shadow-sm hover:bg-violet-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-amber-300 dark:hover:bg-slate-800"
              onClick={() => setTheme(darkMode ? 'light' : 'dark')}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </Button>
            <Button className="rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-4 font-black text-white shadow-lg shadow-violet-600/20 hover:from-violet-800 hover:to-fuchsia-700 sm:px-5" render={<Link to={startHref} />} nativeButton={false}>
              {user ? 'Continue learning' : 'Start free'}
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:pb-28">
          <div className="pointer-events-none absolute -left-16 top-16 h-40 w-40 rounded-full bg-amber-300/50 blur-2xl" />
          <div className="pointer-events-none absolute -right-24 top-4 h-72 w-72 rounded-full bg-sky-300/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.03fr_.97fr]">
            <div className="relative z-10 text-center lg:text-left">
              <Badge className="border-violet-200 bg-white/80 px-3 py-1.5 text-violet-700 shadow-sm hover:bg-white/80 dark:border-violet-500/30 dark:bg-slate-900/80 dark:text-violet-300 dark:hover:bg-slate-900/80">
                <Sparkles className="h-3.5 w-3.5" /> Practical language for real life
              </Badge>
              <h1 className="mx-auto mt-6 max-w-3xl text-[clamp(2.65rem,7.2vw,5rem)] font-black leading-[0.98] tracking-[-0.055em] lg:mx-0">
                Learn the words.
                <span className="block bg-gradient-to-r from-violet-700 via-fuchsia-600 to-rose-500 bg-clip-text text-transparent">Build the sentence.</span>
                <span className="block">Speak with confidence.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8 lg:mx-0">
                Short guided lessons combine listening, spelling, sentence writing, and friendly clue-safe quizzes. Learn at your own pace and keep every achievement in one free account.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Button size="lg" className="h-13 rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-7 font-black text-white shadow-xl shadow-violet-600/25 transition hover:-translate-y-0.5 hover:from-violet-800 hover:to-fuchsia-700" render={<Link to={startHref} />} nativeButton={false}>
                  {user ? 'Continue your quest' : 'Create a learner account'} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-13 rounded-xl border-2 border-violet-200 bg-white/80 px-7 font-black text-violet-800 shadow-sm hover:bg-violet-50 dark:border-violet-500/40 dark:bg-slate-900/80 dark:text-violet-200 dark:hover:bg-slate-800" render={<a href="#courses" />} nativeButton={false}>
                  Explore courses
                </Button>
              </div>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 lg:justify-start">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Visitors can browse courses. A free signup is required to begin and save progress.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs font-bold lg:justify-start">
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/60 dark:text-sky-300">🎧 Listen</span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/60 dark:text-amber-300">🔤 Spell</span>
                <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-950/60 dark:text-fuchsia-300">✍️ Write</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">💬 Speak</span>
              </div>
            </div>

            <div className="lq-hero-scene relative mx-auto w-full max-w-xl py-8 sm:px-6">
              <div className="lq-orbit pointer-events-none absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-violet-300/60 dark:border-violet-400/35">
                <span className="absolute -top-3 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-2xl bg-amber-400 text-white shadow-lg"><Star className="h-5 w-5 fill-current" /></span>
                <span className="absolute -bottom-3 left-1/2 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-2xl bg-sky-500 text-white shadow-lg"><Globe2 className="h-5 w-5" /></span>
              </div>
              <div className="lq-hero-card relative rounded-[2rem] border border-white bg-white/75 p-3 shadow-[0_35px_90px_-28px_rgba(76,29,149,.5)] backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/75 sm:p-5">
                <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-violet-700 via-fuchsia-600 to-rose-500 p-6 text-white sm:p-8">
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
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-400 shadow-lg shadow-emerald-950/20"><CheckCircle2 className="h-5 w-5" /></span>
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
            </div>
          </div>
        </section>

        <section className="border-y border-white/80 bg-white/75 px-4 py-16 backdrop-blur transition-colors dark:border-slate-800/80 dark:bg-slate-950/55 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Your lesson guide</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">A clear routine in every lesson</h2>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">You always know what to do next, why it matters, and how to recover from a mistake.</p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: Headphones, step: '01', title: 'Learn and listen', copy: 'Meet the key phrase, hear its pronunciation, and connect it to a real situation.', tone: 'from-sky-500 to-blue-600', shadow: 'shadow-sky-500/15' },
                { icon: SpellCheck2, step: '02', title: 'Listen and spell', copy: 'Hear the word without seeing its letters, then type it from memory.', tone: 'from-amber-400 to-orange-600', shadow: 'shadow-amber-500/15' },
                { icon: Keyboard, step: '03', title: 'Build the sentence', copy: 'Type the complete phrase from memory. Punctuation and capital letters will not block you.', tone: 'from-fuchsia-500 to-violet-700', shadow: 'shadow-fuchsia-500/15' },
                { icon: Target, step: '04', title: 'Check understanding', copy: 'Choose from a clue-safe prompt, read a clear correction, and retry immediately when needed.', tone: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-500/15' },
              ].map(({ icon: Icon, step, title, copy, tone, shadow }) => (
                <article key={step} className={`group rounded-3xl border border-white bg-white p-6 shadow-xl ${shadow} transition duration-300 hover:-translate-y-2 dark:border-slate-800 dark:bg-slate-900/90`}>
                  <div className="flex items-center justify-between">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110`}><Icon className="h-5 w-5" /></span>
                    <span className="text-2xl font-black text-slate-200 dark:text-slate-700">{step}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
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
                <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700">Course library</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Choose your next quest</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">Browse freely. Create an account when you are ready to open a lesson and save your progress.</p>
            </div>

            {courses.length ? (
              <div className="mt-10 space-y-5">
                {courseGroups.map((group, index) => (
                  <LanguageQuestCourseFolder
                    key={group.category}
                    category={group.category}
                    count={group.courses.length}
                    defaultOpen={index === 0}
                    idPrefix="public-course-folder"
                  >
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {group.courses.map((course) => (
                        <article key={course.id} className="group overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-violet-900/5 transition duration-300 hover:-translate-y-2 hover:rotate-[0.4deg] hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-black/20">
                          <div className="h-2" style={{ backgroundColor: course.accentColor }} />
                          <div className="p-6">
                            <div className="flex items-start gap-4">
                              <span className="grid h-14 w-14 place-items-center rounded-2xl text-3xl shadow-inner transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" style={{ backgroundColor: `${course.accentColor}20` }}>{course.imageEmoji}</span>
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{course.language}</p>
                                <h4 className="mt-1 text-xl font-black">{course.title}</h4>
                              </div>
                            </div>
                            <p className="mt-4 min-h-12 text-sm leading-6 text-slate-600 dark:text-slate-300">{course.description || 'A practical language course for everyday learning.'}</p>
                            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">{course.unitCount} units</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">{course.lessonCount} lessons</span>
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 dark:bg-slate-800">{course.challengeCount} practices</span>
                            </div>
                            <Button className="mt-6 w-full rounded-xl font-black text-white shadow-lg transition-transform group-hover:scale-[1.02]" style={{ backgroundColor: course.accentColor }} render={<Link to={startHref} />} nativeButton={false}>
                              {user ? 'Open course library' : 'Sign up to learn'} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </LanguageQuestCourseFolder>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-dashed border-violet-200 bg-white/60 p-12 text-center dark:border-violet-500/30 dark:bg-slate-900/60">
                <BookOpen className="mx-auto h-10 w-10 text-violet-300 dark:text-violet-400" />
                <p className="mt-3 font-bold">Course previews are being prepared.</p>
              </div>
            )}
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 sm:pb-20">
          <div className="relative mx-auto flex max-w-7xl flex-col items-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 px-6 py-14 text-center text-white shadow-2xl sm:py-16">
            <div className="absolute -left-12 -top-14 h-48 w-48 rounded-full bg-sky-500/20 blur-2xl" />
            <div className="absolute -bottom-16 -right-8 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-2xl" />
            <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/10 shadow-xl ring-1 ring-white/15"><Languages className="h-8 w-8 text-violet-200" /></span>
            <h2 className="mt-5 text-3xl font-black tracking-tight">Ready to say more than single words?</h2>
            <p className="mt-3 max-w-xl text-slate-300">Create your free learner account and turn useful language into complete, confident sentences.</p>
            <Button size="lg" className="relative mt-7 rounded-xl bg-white font-black text-slate-950 shadow-xl hover:bg-violet-100" render={<Link to={startHref} />} nativeButton={false}>
              {user ? 'Continue learning' : 'Start Language Quest'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/70 bg-white/65 px-4 py-8 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
          <MrlcQuestBrand compact />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <BookMarked className="h-4 w-4 text-violet-600 dark:text-violet-400" /> Learning made with care for every learner.
          </div>
          <div className="flex flex-col items-center gap-2 sm:items-end">
            <Link to="/language-quest/about" className="inline-flex items-center gap-1.5 text-xs font-black text-violet-700 underline-offset-4 hover:underline dark:text-violet-300">
              <Info className="h-3.5 w-3.5" /> About &amp; course sources
            </Link>
            <TaoMonLaeCredit />
          </div>
        </div>
      </footer>
    </div>
  );
}
