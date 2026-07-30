import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Github,
  HeartHandshake,
  Languages,
  LibraryBig,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MrlcQuestBrand, TaoMonLaeCredit } from '@/src/components/games/MrlcQuestBrand';

interface CourseSource {
  title: string;
  courses: string;
  badge: string;
  description: ReactNode;
  accent: string;
}

const COURSE_SOURCES: CourseSource[] = [
  {
    title: 'MRLC original curriculum',
    courses: 'Everyday English, Mandarin Foundations, and Chinese Conversation Starter',
    badge: 'Original',
    accent: 'from-violet-600 to-fuchsia-600',
    description: 'Written and organized for MRLC learners, with practical situations, guided sentence practice, and classroom-friendly lesson lengths.',
  },
  {
    title: 'Spanish seed curriculum',
    courses: 'Spanish Foundations',
    badge: 'Adapted',
    accent: 'from-orange-500 to-amber-500',
    description: (
      <>
        Adapted from{' '}
        <SourceLink href="https://github.com/TaoMonLae/duolingo-clone">TaoMonLae/duolingo-clone</SourceLink>.
        Language Quest’s learning flow was also informed by the MIT-licensed{' '}
        <SourceLink href="https://github.com/sanidhyy/duolingo-clone">sanidhyy/duolingo-clone</SourceLink>{' '}
        project.
      </>
    ),
  },
  {
    title: 'School-provided Mandarin curriculum',
    courses: 'Mandarin Complete Course',
    badge: 'School source',
    accent: 'from-rose-600 to-red-500',
    description: 'Generated from a Mandarin curriculum file supplied to the project by its owner. The source has no included license notice, so redistribution rights should be confirmed before distributing it outside the school’s authorized use.',
  },
  {
    title: 'English word collection and definitions',
    courses: 'Everyday English Word Quest, Academic English Word Quest, and English Word Power',
    badge: 'Curated',
    accent: 'from-sky-600 to-cyan-500',
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

      <main className="px-4 py-10 sm:px-6 sm:py-16">
        <section className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 px-6 py-12 text-white shadow-2xl sm:px-10 sm:py-16">
          <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
              <Sparkles className="h-3.5 w-3.5" /> Learn with transparency
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] sm:text-6xl">About Language Quest</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              A practical language-learning experience created for MRLC learners, families, and classrooms—with clear credit for the projects and curriculum sources that helped make it possible.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: Languages, title: 'Practical learning', copy: 'Listen, build complete sentences, check understanding, and retry with supportive feedback.' },
              { icon: ShieldCheck, title: 'Learner-first privacy', copy: 'Public learner accounts remain separated from private student records and school administration.' },
              { icon: HeartHandshake, title: 'Classroom ready', copy: 'Teachers can organize opt-in classrooms while learners keep ownership of their personal progress.' },
            ].map(({ icon: Icon, title, copy }) => (
              <article key={title} className="rounded-3xl border border-white bg-white/85 p-6 shadow-lg shadow-violet-900/5 dark:border-slate-800 dark:bg-slate-900/85">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-black">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-7xl">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
              <LibraryBig className="h-4 w-4" /> Notable course sources
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Where the learning content comes from</h2>
            <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
              Some courses are original MRLC work; others adapt or curate external material. These notes summarize the most important provenance and licensing details.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {COURSE_SOURCES.map((source) => (
              <article key={source.title} className="overflow-hidden rounded-3xl border border-white bg-white/90 shadow-xl shadow-violet-900/5 dark:border-slate-800 dark:bg-slate-900/90">
                <div className={`h-2 bg-gradient-to-r ${source.accent}`} />
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black">{source.title}</h3>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{source.courses}</p>
                    </div>
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{source.badge}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{source.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 grid max-w-7xl gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-6 dark:border-amber-500/25 dark:bg-amber-500/10">
            <h2 className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200">
              <ScrollText className="h-5 w-5" /> Attribution and redistribution
            </h2>
            <p className="mt-3 text-sm leading-7 text-amber-900/75 dark:text-amber-100/75">
              This page is a readable summary, not a replacement for the complete notices. Review the full license text and source-specific conditions before redistributing course content.
            </p>
            <a
              href="https://github.com/TaoMonLae/mrlc-lms/blob/main/THIRD_PARTY_NOTICES.md"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-black text-amber-900 underline-offset-4 hover:underline dark:text-amber-200"
            >
              Read complete third-party notices <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-700 to-fuchsia-700 p-6 text-white shadow-xl shadow-violet-700/20">
            <BookOpen className="h-7 w-7 text-violet-200" />
            <h2 className="mt-4 text-xl font-black">Learning support</h2>
            <p className="mt-2 text-sm leading-7 text-violet-100">
              Chinese pronunciation is generated with tone-marked Pinyin beneath each Hanzi. Supported courses can use the Apache-2.0-licensed{' '}
              <SourceLink href="https://huggingface.co/hexgrad/Kokoro-82M">hexgrad/Kokoro-82M</SourceLink>{' '}
              teacher voice, with an automatic browser-voice fallback.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-7xl rounded-[2rem] border border-white bg-white/90 p-8 text-center shadow-xl shadow-violet-900/5 dark:border-slate-800 dark:bg-slate-900/90 sm:p-12">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg dark:bg-violet-600">
            <Github className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-2xl font-black">Developed by Tao Mon Lae</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Designed and built for the learners, teachers, and community of the Mon Refugee Learning Centre.
          </p>
          <a
            href="https://github.com/TaoMonLae"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            <Github className="h-4 w-4" /> Visit GitHub profile
          </a>
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
