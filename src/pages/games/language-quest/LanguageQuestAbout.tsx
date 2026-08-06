import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Github,
  HeartHandshake,
  Headphones,
  Languages,
  LibraryBig,
  MessageCircleMore,
  MousePointerClick,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MrlcQuestBrand, TaoMonLaeCredit } from '@/src/components/games/MrlcQuestBrand';

interface CourseSource {
  title: string;
  courses: string;
  badge: string;
  description: ReactNode;
  accent: string;
  art: string;
}

const COURSE_SOURCES: CourseSource[] = [
  {
    title: 'MRLC original curriculum',
    courses: 'Everyday English, Mandarin Foundations, and Chinese Conversation Starter',
    badge: 'Original',
    accent: 'from-violet-600 to-fuchsia-600',
    art: '/icons/optimized/Eduv1_01.png',
    description: 'Written and organized for MRLC learners, with practical situations, guided sentence practice, and classroom-friendly lesson lengths.',
  },
  {
    title: 'Archived Spanish experiment',
    courses: 'Spanish Foundations (not in the learner catalog)',
    badge: 'Archived',
    accent: 'from-orange-500 to-amber-500',
    art: '/icons/optimized/Eduv1_04.png',
    description: (
      <>
        Historical seed content adapted from{' '}
        <SourceLink href="https://github.com/TaoMonLae/duolingo-clone">TaoMonLae/duolingo-clone</SourceLink>.
        The course remains retired while its records are preserved. Language Quest’s learning flow was also informed by the MIT-licensed{' '}
        <SourceLink href="https://github.com/sanidhyy/duolingo-clone">sanidhyy/duolingo-clone</SourceLink>{' '}
        project.
      </>
    ),
  },
  {
    title: 'School-provided Mandarin curriculum',
    courses: 'Mandarin Complete A1–B2',
    badge: 'School source',
    accent: 'from-rose-600 to-red-500',
    art: '/icons/optimized/Eduv1_02.png',
    description: 'Generated from a Mandarin curriculum file supplied to the project by its owner. The source has no included license notice, so redistribution rights should be confirmed before distributing it outside the school’s authorized use.',
  },
  {
    title: 'Malay learning paths',
    courses: 'Canonical Bahasa Malaysia A1–C1 path',
    badge: 'Canonical path',
    accent: 'from-amber-500 to-orange-600',
    art: '/icons/optimized/Eduv1_10.png',
    description: 'The five-level CEFR progression is the learner-facing Malay path. Overlapping Malay Speaking, Modern Spoken Malay, and Teach Yourself Malay courses are archived with historical progress preserved. Content remains subject to ongoing native-speaker review and source-specific redistribution conditions.',
  },
  {
    title: 'English word collection and definitions',
    courses: 'Everyday English Word Quest, Academic English Word Quest, and English Word Power',
    badge: 'Curated',
    accent: 'from-sky-600 to-cyan-500',
    art: '/icons/optimized/Eduv1_06.png',
    description: (
      <>
        Terms are curated from{' '}
        <SourceLink href="https://github.com/dwyl/english-words">dwyl/english-words</SourceLink>.
        Definitions and word data use{' '}
        <SourceLink href="https://github.com/moos/wordpos">WordPOS</SourceLink>{' '}
        and Princeton WordNet 3.1.
      </>
    ),
  },
  {
    title: 'Ranked advanced vocabulary',
    courses: 'Advanced English: Core, Mastery, and Expert',
    badge: 'Curated',
    accent: 'from-indigo-600 to-blue-600',
    art: '/icons/optimized/Eduv1_07.png',
    description: (
      <>
        Individual terms and ranking signals are selected from{' '}
        <SourceLink href="https://github.com/Isomorpheuss/advanced-english-vocabulary">
          Isomorpheuss/advanced-english-vocabulary
        </SourceLink>.
        The source repository has no license file; MRLC does not copy its definitions and instead uses WordNet-backed explanations.
      </>
    ),
  },
  {
    title: 'CEFR vocabulary sets',
    courses: 'English Vocabulary A1: Foundations through C2: Mastery',
    badge: 'MIT licensed',
    accent: 'from-emerald-600 to-teal-500',
    art: '/icons/optimized/Eduv1_09.png',
    description: (
      <>
        Adapted from the MIT-licensed vocabulary sets in{' '}
        <SourceLink href="https://github.com/AyeNyeinSan22/linguify">AyeNyeinSan22/linguify</SourceLink>,
        including source-supplied definitions, examples, parts of speech, and IPA.
      </>
    ),
  },
];

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-bold text-violet-700 underline-offset-4 hover:underline dark:text-violet-300"
    >
      {children}<ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

export default function LanguageQuestAbout() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="lq-mesh min-h-screen overflow-x-hidden text-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <MrlcQuestBrand compact />
          <Button
            variant="outline"
            className="rounded-xl border-violet-200 bg-white/80 font-bold text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-200"
            render={<Link to="/language-quest" />}
            nativeButton={false}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Course library
          </Button>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-6 sm:py-12">
        <section className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[1.75rem] border border-violet-400/20 bg-[radial-gradient(circle_at_82%_18%,rgba(217,70,239,.28),transparent_34%),linear-gradient(135deg,#090f25_0%,#251054_55%,#45105e_100%)] text-white shadow-[0_35px_110px_-42px_rgba(88,28,135,.85)] sm:rounded-[2.25rem] lg:min-h-[590px] lg:grid-cols-[1.04fr_.96fr]">
          <div className="pointer-events-none absolute -left-20 -top-28 h-80 w-80 rounded-full border-[48px] border-sky-400/10" />
          <div className="pointer-events-none absolute bottom-8 left-[48%] h-24 w-24 rounded-full bg-amber-300/15 blur-2xl" />

          <div className="relative z-10 flex flex-col justify-center px-5 py-9 sm:px-10 sm:py-16 lg:px-14">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> The story behind the quest
            </span>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.55rem,12vw,5.2rem)] font-black leading-[0.94] tracking-[-0.055em] sm:mt-6">
              Language learning,
              <span className="block bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">made more human.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-200 sm:mt-6 sm:text-lg sm:leading-8">
              Language Quest is MRLC’s colorful learning space for useful words, complete sentences, confident speaking, and classroom connection—with transparent credit for every source that helped shape it.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-amber-400 px-6 font-black text-slate-950 shadow-xl shadow-amber-950/20 hover:bg-amber-300"
                render={<Link to="/language-quest" />}
                nativeButton={false}
              >
                Explore courses <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-white/20 bg-white/10 px-6 font-black text-white backdrop-blur hover:bg-white/20 hover:text-white"
                render={<a href="#course-sources" />}
                nativeButton={false}
              >
                View course sources
              </Button>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-2 border-t border-white/10 pt-5 sm:mt-9 sm:pt-6">
              {[
                ['5 steps', 'Learn to check'],
                ['Free', 'Learner account'],
                ['Global', 'Quest community'],
              ].map(([value, label]) => (
                <div key={value}>
                  <p className="text-lg font-black text-white sm:text-xl">{value}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden sm:min-h-[480px] lg:min-h-[590px]">
            <div className="absolute bottom-8 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-500/30 to-sky-400/10 ring-1 ring-white/15 sm:bottom-10 sm:h-[72%] sm:w-[72%]" />
            <div className="absolute bottom-3 left-1/2 h-10 w-[58%] -translate-x-1/2 rounded-[100%] bg-slate-950/60 blur-xl sm:bottom-5 sm:h-12 sm:w-[64%]" />
            <div className="absolute bottom-0 left-1/2 z-[2] h-[80%] -translate-x-1/2 sm:h-[96%]">
              <img
                src="/icons/optimized/YellowHoodieGuide.png"
                alt="Friendly Language Quest guide wearing a yellow hoodie"
                className="lq-float-delayed h-full w-auto max-w-none object-contain drop-shadow-[0_30px_35px_rgba(0,0,0,.35)]"
              />
            </div>
            <div className="lq-float absolute left-3 top-5 z-10 rounded-xl border border-white/15 bg-slate-950/75 px-3 py-2.5 shadow-xl backdrop-blur sm:left-10 sm:top-12 sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-300">
                <Headphones className="h-4 w-4" /> Listen • Pick • Spell
              </p>
            </div>
            <div className="lq-float-delayed absolute bottom-5 right-3 z-10 max-w-[175px] rounded-xl border border-amber-200/30 bg-amber-300 px-3 py-2.5 text-slate-950 shadow-xl sm:bottom-20 sm:right-8 sm:max-w-[190px] sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="flex items-center gap-2 text-xs font-black sm:text-sm">
                <MessageCircleMore className="h-4 w-4" /> English, Burmese & Mon guidance
              </p>
            </div>
            <span className="absolute right-14 top-8 hidden h-12 w-12 place-items-center rounded-2xl bg-fuchsia-500 text-white shadow-xl sm:grid">
              <Star className="h-6 w-6 fill-current" />
            </span>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-7xl rounded-[2rem] border border-white/80 bg-white/75 p-3 shadow-xl shadow-violet-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/55 sm:p-4">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                art: '/icons/optimized/LanguageLearning/V1/Languages.png',
                icon: Languages,
                title: 'Practise for real life',
                copy: 'Move from listening and recognition to spelling, sentence building, and confident recall.',
                tone: 'from-sky-100 to-cyan-50 dark:from-sky-950 dark:to-slate-900',
              },
              {
                art: '/icons/optimized/Eduv1_05.png',
                icon: ShieldCheck,
                title: 'A safe learner space',
                copy: 'Public learner accounts stay separated from private student records and LMS administration.',
                tone: 'from-violet-100 to-fuchsia-50 dark:from-violet-950 dark:to-slate-900',
              },
              {
                art: '/icons/optimized/LanguageLearning/V1/Blackboard.png',
                icon: HeartHandshake,
                title: 'Ready for classrooms',
                copy: 'Teachers can organize opt-in classrooms while learners keep their own progress and rewards.',
                tone: 'from-amber-100 to-orange-50 dark:from-amber-950 dark:to-slate-900',
              },
            ].map(({ art, icon: Icon, title, copy, tone }) => (
              <article key={title} className={`group relative min-h-56 overflow-hidden rounded-[1.6rem] bg-gradient-to-br ${tone} p-6`}>
                <div className="relative z-10 max-w-[72%]">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-xl font-black">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
                </div>
                <img
                  src={art}
                  alt=""
                  aria-hidden="true"
                  className="absolute -bottom-8 -right-9 h-40 w-40 object-contain opacity-90 drop-shadow-xl transition duration-300 group-hover:-translate-y-2 group-hover:rotate-3 group-hover:scale-105"
                />
              </article>
            ))}
          </div>
        </section>

        <section id="course-sources" className="mx-auto mt-20 max-w-7xl scroll-mt-28">
          <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
                <LibraryBig className="h-4 w-4" /> Notable course sources
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
                Clear credit builds better learning.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-slate-600 dark:text-slate-300">
                Some courses are original MRLC work; others adapt or curate external material. These notes make the most important provenance and licensing details easy to find.
              </p>
              <div className="relative mt-8 hidden min-h-72 overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-500 p-6 text-white shadow-2xl shadow-violet-700/20 lg:block">
                <div className="relative z-10 max-w-[60%]">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-100">Open learning</p>
                  <p className="mt-3 text-2xl font-black">Know what you study—and where it came from.</p>
                </div>
                <img
                  src="/icons/LanguageQuests_Graphics/Owl School 15.svg"
                  alt=""
                  aria-hidden="true"
                  className="absolute -bottom-8 -right-14 h-64 w-72 object-contain drop-shadow-2xl"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {COURSE_SOURCES.map((source, index) => (
                <article
                  key={source.title}
                  className="group relative overflow-hidden rounded-3xl border border-white bg-white/90 p-5 shadow-lg shadow-violet-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-6"
                >
                  <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${source.accent}`} />
                  <div className="flex gap-4 sm:gap-5">
                    <div className={`relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${source.accent} sm:block`}>
                      <img src={source.art} alt="" aria-hidden="true" className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)] object-contain drop-shadow-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Source {String(index + 1).padStart(2, '0')}</p>
                          <h3 className="mt-1 text-xl font-black">{source.title}</h3>
                          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{source.courses}</p>
                        </div>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{source.badge}</span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{source.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 grid max-w-7xl gap-5 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-7 dark:border-amber-500/25 dark:from-amber-950/65 dark:to-slate-950">
            <div className="relative z-10 max-w-[78%]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-lg">
                <ScrollText className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-xl font-black text-amber-950 dark:text-amber-100">Attribution and redistribution</h2>
              <p className="mt-3 text-sm leading-7 text-amber-950/75 dark:text-amber-100/75">
                This page is a readable summary, not a replacement for the complete notices. Review the full license text and source-specific conditions before redistributing course content.
              </p>
              <a
                href="https://github.com/TaoMonLae/mrlc-lms/blob/main/THIRD_PARTY_NOTICES.md"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-black text-amber-950 underline-offset-4 hover:underline dark:text-amber-200"
              >
                Read complete notices <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <img src="/icons/optimized/Eduv1_03.png" alt="" aria-hidden="true" className="absolute -bottom-8 -right-8 h-40 w-40 object-contain opacity-80 drop-shadow-xl" />
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-800 via-indigo-900 to-slate-950 p-7 text-white shadow-xl shadow-violet-700/15">
            <div className="relative z-10 max-w-[78%]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-violet-200 shadow-lg backdrop-blur">
                <BookOpen className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-xl font-black">Learning support</h2>
              <p className="mt-3 text-sm leading-7 text-violet-100 [&_a]:text-violet-100">
                Chinese pronunciation uses tone-marked Pinyin beneath each Hanzi. Supported courses can use the Apache-2.0-licensed{' '}
                <SourceLink href="https://huggingface.co/hexgrad/Kokoro-82M">hexgrad/Kokoro-82M</SourceLink>{' '}
                teacher voice, with an automatic browser-voice fallback.
              </p>
            </div>
            <img src="/icons/optimized/Eduv1_02.png" alt="" aria-hidden="true" className="absolute -bottom-8 -right-8 h-40 w-40 object-contain opacity-80 drop-shadow-xl" />
          </div>
        </section>

        <section className="relative mx-auto mt-16 grid max-w-7xl overflow-hidden rounded-[2.25rem] border border-white bg-white/90 shadow-2xl shadow-violet-900/10 dark:border-slate-800 dark:bg-slate-900/90 lg:grid-cols-[.8fr_1.2fr]">
          <div className="relative min-h-72 overflow-hidden bg-gradient-to-br from-sky-100 via-violet-100 to-fuchsia-100 dark:from-sky-950 dark:via-violet-950 dark:to-slate-950">
            <div className="absolute left-8 top-8 h-24 w-24 rounded-full border-[18px] border-white/60 dark:border-white/10" />
            <img
              src="/icons/LanguageQuests_Graphics/Owl School 10.svg"
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 h-[92%] w-[92%] -translate-x-1/2 object-contain drop-shadow-2xl"
            />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Built with the community in mind</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Developed by Tao Mon Lae</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Designed and built for the learners, teachers, and community of the Mon Refugee Learning Centre. Language Quest is open source so others can learn from it, improve it, and give credit to the work behind it.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://github.com/TaoMonLae"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
              >
                <Github className="h-4 w-4" /> Visit GitHub profile
              </a>
              <Link
                to="/language-quest"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                Start learning <MousePointerClick className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Open-source project • MIT licensed
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/70 px-4 py-7 backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <MrlcQuestBrand compact />
          <TaoMonLaeCredit />
        </div>
      </footer>
    </div>
  );
}
