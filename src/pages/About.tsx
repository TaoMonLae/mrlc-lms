import type { ReactNode } from "react";
import {
  Info,
  Crown,
  Grid3x3,
  Gamepad2,
  Code2,
  Sparkles,
  Layers,
  Palette,
  Heart,
  Languages,
  Github,
  BookMarked,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const THIRD_PARTY_NOTICES: { title: string; description: ReactNode }[] = [
  {
    title: "Language Quest",
    description: (
      <>
        Informed by the concepts and interface patterns in{" "}
        <a href="https://github.com/sanidhyy/duolingo-clone" target="_blank" rel="noopener noreferrer" className="font-medium text-aubergine-600 hover:underline">
          sanidhyy/duolingo-clone
        </a>{" "}
        (MIT License). An archived Spanish seed experiment was adapted from{" "}
        <a href="https://github.com/TaoMonLae/duolingo-clone" target="_blank" rel="noopener noreferrer" className="font-medium text-aubergine-600 hover:underline">
          TaoMonLae/duolingo-clone
        </a>
        .
      </>
    ),
  },
  {
    title: "Sudoku",
    description: (
      <>
        Adapted from{" "}
        <a href="https://github.com/TN1ck/super-sudoku" target="_blank" rel="noopener noreferrer" className="font-medium text-aubergine-600 hover:underline">
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
        <a href="https://github.com/moos/wordpos" target="_blank" rel="noopener noreferrer" className="font-medium text-aubergine-600 hover:underline">
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
        <a href="https://github.com/Barnista/MonDictDB" target="_blank" rel="noopener noreferrer" className="font-medium text-aubergine-600 hover:underline">
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
        <a href="https://github.com/garethbjohnson/gutendex" target="_blank" rel="noopener noreferrer" className="font-medium text-aubergine-600 hover:underline">
          Gutendex
        </a>{" "}
        service and downloads selected public-domain books on demand.
      </>
    ),
  },
];

const CREDITS: { title: string; description: string; icon: any }[] = [
  {
    title: "Language Quest",
    description:
      "An LMS-native learning experience inspired by Sanidhya Kumar Verma's MIT-licensed Lingo project; the earlier Spanish seed experiment is archived while its historical records are preserved.",
    icon: Languages,
  },
  {
    title: "Chess",
    description:
      "Rules and move validation powered by chess.js, with a hand-built AI opponent, custom SVG piece art, and real-time online multiplayer.",
    icon: Crown,
  },
  {
    title: "Sudoku",
    description: "A custom-built puzzle generator and solver, created in-house for this platform.",
    icon: Grid3x3,
  },
  {
    title: "Checkers & Snake",
    description: "Two more in-house games built for the platform's Games section.",
    icon: Gamepad2,
  },
  {
    title: "React, Vite & TypeScript",
    description: "The frontend framework, build tool, and language behind the interface.",
    icon: Code2,
  },
  {
    title: "Tailwind CSS & shadcn/ui",
    description: "The styling system and UI components used throughout the app.",
    icon: Palette,
  },
  {
    title: "Prisma, PostgreSQL & Express",
    description: "The database toolkit, database, and backend server framework.",
    icon: Layers,
  },
  {
    title: "lucide-react",
    description: "The icon set used across the interface, including on this page.",
    icon: Sparkles,
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-1">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          <Info className="h-6 w-6 text-aubergine-600" />
          About this platform
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          What this app is, and who and what made it possible.
        </p>
      </div>

      <Card className="border-slate-200 bg-white p-6 dark:border-surface-raised dark:bg-surface-indigo">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What is this?</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This is the Mon Refugee Learning Centre's Learning Management System — a single place for
          students, teachers, and staff to manage classes, attendance, exams, homework, the library,
          finances, and day-to-day school operations. It also includes a Games section, a dictionary,
          Mon language lessons, chat, and a school news feed, built to make the platform a place
          students want to spend time in, not just a set of admin tools.
        </p>
      </Card>

      <Card className="border-slate-200 bg-white p-6 dark:border-surface-raised dark:bg-surface-indigo">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Honorable credits</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Built with the help of these open-source projects and in-house creations.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CREDITS.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="flex gap-3 rounded-xl border border-slate-200 p-4 dark:border-surface-raised"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-aubergine-600/10 text-aubergine-600">
                <Icon className="size-4.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-300">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border-slate-200 bg-white p-6 dark:border-surface-raised dark:bg-surface-indigo">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <BookMarked className="h-5 w-5 text-aubergine-600" />
          Notable third-party data and acknowledgments
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Some content and datasets in this platform come from outside projects. Their sources and
          licenses are documented here and reviewed before any redistribution.
        </p>
        <ul className="mt-4 space-y-3">
          {THIRD_PARTY_NOTICES.map(({ title, description }) => (
            <li key={title} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-surface-raised">
              <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
              <p className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-300">{description}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="border-slate-200 bg-white p-6 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-aubergine-600/10 text-aubergine-600">
          <Heart className="size-5" />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Developed by</h2>
        <p className="mt-1 text-xl font-bold text-aubergine-600">Tao Mon Lae</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Designed and built for the students, teachers, and staff of the Mon Refugee Learning Centre.
        </p>
        <a
          href="https://github.com/TaoMonLae/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-aubergine-600 hover:text-aubergine-600 dark:border-surface-raised dark:text-slate-200"
        >
          <Github className="h-4 w-4" />
          github.com/TaoMonLae
        </a>
      </Card>
    </div>
  );
}
