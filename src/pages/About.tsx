import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BookMarked,
  Code2,
  Crown,
  Gamepad2,
  Github,
  Grid3x3,
  Heart,
  Info,
  Languages,
  Layers,
  Palette,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const PLATFORM_PILLARS = [
  {
    eyebrow: "Learning",
    title: "Teach, practise, and grow",
    description: "Classes, homework, exams, dictionaries, an e-library, and Learning Quest—including K–12 Mathematics and four GED preparation courses—live in one familiar learning space.",
    art: "/icons/optimized/Eduv2_06.png",
    tone: "from-violet-50 to-indigo-100/80 dark:from-violet-500/10 dark:to-indigo-500/10",
  },
  {
    eyebrow: "People",
    title: "Keep the school connected",
    description: "Students, teachers, families, and staff can find the information and conversations that matter to them.",
    art: "/icons/optimized/Eduv2_02.png",
    tone: "from-emerald-50 to-teal-100/80 dark:from-emerald-500/10 dark:to-teal-500/10",
  },
  {
    eyebrow: "Operations",
    title: "Run each school day clearly",
    description: "Attendance, schedules, fees, records, reports, and school workflows stay organised without losing the human touch.",
    art: "/icons/optimized/Eduv2_09.png",
    tone: "from-sky-50 to-cyan-100/80 dark:from-sky-500/10 dark:to-cyan-500/10",
  },
  {
    eyebrow: "Motivation",
    title: "Make progress feel rewarding",
    description: "Friendly games, achievements, streaks, and visible milestones give learners more reasons to keep showing up.",
    art: "/icons/optimized/Eduv2_05.png",
    tone: "from-amber-50 to-orange-100/80 dark:from-amber-500/10 dark:to-orange-500/10",
  },
] as const;

const THIRD_PARTY_NOTICES: { title: string; description: ReactNode }[] = [
  {
    title: "Learning Quest",
    description: (
      <>
        Informed by the concepts and interface patterns in{" "}
        <a href="https://github.com/sanidhyy/duolingo-clone" target="_blank" rel="noopener noreferrer" className="font-bold text-aubergine-700 hover:underline dark:text-violet-300">
          sanidhyy/duolingo-clone
        </a>{" "}
        (MIT License). An archived Spanish seed experiment was adapted from{" "}
        <a href="https://github.com/TaoMonLae/duolingo-clone" target="_blank" rel="noopener noreferrer" className="font-bold text-aubergine-700 hover:underline dark:text-violet-300">
          TaoMonLae/duolingo-clone
        </a>
        . MRLC’s original GED Science, Social Studies, RLA, and Mathematical Reasoning courses are informed by the public assessment guides and educator resources from{" "}
        <a href="https://www.ged.com/content/dam/websites/ged/resources/en/assessment-guide-for-educators-math.pdf" target="_blank" rel="noopener noreferrer" className="font-bold text-aubergine-700 hover:underline dark:text-violet-300">
          GED Testing Service
        </a>
        . They contain 150 concept-first lessons and 450 original practices, remain independent preparation materials, and do not reproduce official questions.
      </>
    ),
  },
  {
    title: "Sudoku",
    description: (
      <>
        Adapted from{" "}
        <a href="https://github.com/TN1ck/super-sudoku" target="_blank" rel="noopener noreferrer" className="font-bold text-aubergine-700 hover:underline dark:text-violet-300">
          super-sudoku
        </a>{" "}
        by Tom Nick (MIT License).
      </>
    ),
  },
  {
    title: "English definitions",
    description: (
      <>
        Powered by{" "}
        <a href="https://github.com/moos/wordpos" target="_blank" rel="noopener noreferrer" className="font-bold text-aubergine-700 hover:underline dark:text-violet-300">
          WordPOS
        </a>{" "}
        and Princeton WordNet 3.1.
      </>
    ),
  },
  {
    title: "English–Myanmar dictionary",
    description:
      "Translations originate from the ornagai/MZ dictionary dataset. Its data license isn't independently verifiable, so it's retained for internal, non-commercial school use only, with full provenance documented in the codebase.",
  },
  {
    title: "Mon dictionary",
    description: (
      <>
        Entries come from{" "}
        <a href="https://github.com/Barnista/MonDictDB" target="_blank" rel="noopener noreferrer" className="font-bold text-aubergine-700 hover:underline dark:text-violet-300">
          MonDictDB
        </a>{" "}
        (MIT License).
      </>
    ),
  },
  {
    title: "E-Library",
    description: (
      <>
        Project Gutenberg search and import uses the public{" "}
        <a href="https://github.com/garethbjohnson/gutendex" target="_blank" rel="noopener noreferrer" className="font-bold text-aubergine-700 hover:underline dark:text-violet-300">
          Gutendex
        </a>{" "}
        service and downloads selected public-domain books on demand.
      </>
    ),
  },
];

const CREDITS = [
  {
    title: "Learning Quest",
    description: "An LMS-native language, K–12 Mathematics, and four-subject GED experience with readable formulas, mastery practice, rewards, and teacher insights.",
    icon: Languages,
  },
  {
    title: "Chess",
    description: "Move validation by chess.js, with a custom AI opponent, piece art, and online multiplayer.",
    icon: Crown,
  },
  {
    title: "Sudoku",
    description: "A school-ready puzzle generator and solver developed for this platform.",
    icon: Grid3x3,
  },
  {
    title: "Checkers & Snake",
    description: "Two more in-house games designed to bring thoughtful play into the school day.",
    icon: Gamepad2,
  },
  {
    title: "React, Vite & TypeScript",
    description: "The frontend foundation behind the fast, responsive interface.",
    icon: Code2,
  },
  {
    title: "Tailwind CSS & shadcn/ui",
    description: "The design system and accessible interface components used throughout the LMS.",
    icon: Palette,
  },
  {
    title: "Prisma, PostgreSQL & Express",
    description: "The database and server tools that keep school information connected and reliable.",
    icon: Layers,
  },
  {
    title: "Lucide",
    description: "The open-source icon family used to make actions easier to recognise.",
    icon: Sparkles,
  },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <section className="relative isolate overflow-hidden rounded-[2.25rem] border border-amber-200/70 bg-[#fff8eb] px-6 py-8 shadow-[0_24px_70px_-36px_rgba(91,59,24,0.45)] dark:border-white/10 dark:bg-slate-950 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div className="absolute -left-28 -top-36 -z-10 h-80 w-80 rounded-full bg-amber-300/35 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute -bottom-44 right-0 -z-10 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-500/15" />
        <div className="grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-amber-800 shadow-sm backdrop-blur dark:border-amber-300/20 dark:bg-white/5 dark:text-amber-200">
              <Info className="h-3.5 w-3.5" /> About MRLC–LMS
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
              One school. One shared place to <span className="text-aubergine-700 dark:text-violet-300">learn, teach, and grow.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              The Mon Refugee Learning Centre LMS brings learning, school operations, and community into one thoughtful digital home—made for the people who use it every day.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {["For learners", "For teachers", "For the school team"].map((label) => (
                <span key={label} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-900/5 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto min-h-[290px] w-full max-w-md sm:min-h-[360px]">
            <div className="absolute inset-x-4 bottom-0 h-[72%] rounded-[2rem] border border-white/70 bg-gradient-to-br from-violet-200/70 via-white/65 to-amber-100/75 shadow-xl backdrop-blur dark:border-white/10 dark:from-violet-500/20 dark:via-slate-900/80 dark:to-amber-500/10" />
            <div className="absolute left-3 top-8 z-20 rounded-2xl bg-white/90 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur dark:bg-slate-900/90 dark:ring-white/10 sm:left-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Our purpose</p>
              <p className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">Learning with dignity</p>
            </div>
            <div className="absolute bottom-8 right-0 z-20 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-xl sm:right-1">
              <p className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4" /> Built for school life</p>
            </div>
            <img
              src="/icons/about-guide.webp"
              alt=""
              aria-hidden="true"
              decoding="async"
              fetchPriority="high"
              className="absolute bottom-0 left-1/2 z-10 h-[108%] max-h-[440px] w-auto -translate-x-1/2 object-contain drop-shadow-[0_28px_24px_rgba(68,45,20,0.22)]"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="platform-story-heading">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-aubergine-700 dark:text-violet-300">A complete school workspace</p>
            <h2 id="platform-story-heading" className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Built around the whole school day</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Useful administration and joyful learning belong together. Each part of the LMS supports the next.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PLATFORM_PILLARS.map((pillar) => (
            <article key={pillar.title} className={`group relative min-h-[310px] overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br ${pillar.tone} p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10`}>
              <div className="relative z-10 max-w-[75%]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-aubergine-700 dark:text-violet-300">{pillar.eyebrow}</p>
                <h3 className="mt-2 text-xl font-black leading-tight text-slate-950 dark:text-white">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{pillar.description}</p>
              </div>
              <div className="absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/70 dark:bg-white/5" />
              <img
                src={pillar.art}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute bottom-3 right-2 h-28 w-28 object-contain drop-shadow-xl transition duration-300 group-hover:scale-105 group-hover:-rotate-2"
              />
            </article>
          ))}
        </div>
      </section>

      <Card className="overflow-hidden border-slate-200 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-aubergine-800 via-violet-800 to-indigo-900 p-7 text-white sm:p-9">
            <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <div className="relative">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <UsersRound className="h-6 w-6" />
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-violet-200">Made with care</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Technology serving people</h2>
              <p className="mt-4 text-sm leading-6 text-white/75">The platform combines open-source foundations with features built specifically for MRLC—not a generic school dropped into a template.</p>
            </div>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 dark:bg-white/10">
            {CREDITS.map(({ title, description, icon: Icon }) => (
              <article key={title} className="bg-white p-5 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-aubergine-50 text-aubergine-700 dark:bg-violet-500/10 dark:text-violet-300">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-950 dark:text-white">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Card>

      <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]" aria-labelledby="acknowledgments-heading">
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-900 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <BookMarked className="h-5 w-5" />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Open-source acknowledgments</p>
          <h2 id="acknowledgments-heading" className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Credit belongs where it is due.</h2>
          <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">MRLC–LMS stands on generous public projects and datasets. Sources, licenses, and distribution limits remain documented clearly.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {THIRD_PARTY_NOTICES.map(({ title, description }, index) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950 dark:text-white">{title}</h3>
                <span className="text-xs font-black text-slate-300 dark:text-slate-600">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-7 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-slate-950 dark:to-amber-500/10 sm:p-9">
        <div className="absolute -bottom-16 right-4 h-44 w-44 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/10" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Designed and developed by</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Tao Mon Lae</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Built for the students, teachers, and staff of the Mon Refugee Learning Centre—with the belief that school technology should feel capable, welcoming, and distinctly ours.</p>
            </div>
          </div>
          <a
            href="https://github.com/TaoMonLae/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-aubergine-800 focus:outline-none focus:ring-4 focus:ring-aubergine-200 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-100"
          >
            <Github className="h-4 w-4" /> View GitHub <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
