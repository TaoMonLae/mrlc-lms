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
} from "lucide-react";
import { Card } from "@/components/ui/card";

const CREDITS: { title: string; description: string; icon: any }[] = [
  {
    title: "Language Quest",
    description:
      "An original LMS-native learning experience inspired by Sanidhya Kumar Verma's MIT-licensed Lingo project, rebuilt for MRLC accounts, courses, and reporting.",
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

      <Card className="border-slate-200 bg-white p-6 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-aubergine-600/10 text-aubergine-600">
          <Heart className="size-5" />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Developed by</h2>
        <p className="mt-1 text-xl font-bold text-aubergine-600">Tao Mon Lae</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          Designed and built for the students, teachers, and staff of the Mon Refugee Learning Centre.
        </p>
      </Card>
    </div>
  );
}
