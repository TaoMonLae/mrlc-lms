import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileChartColumn,
  GraduationCap,
  Languages,
  Library,
  Menu,
  Moon,
  Receipt,
  ShieldCheck,
  Sun,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import Hero1 from "@/components/blocks/hero-1";
import { useTheme } from "../components/theme-provider";
import { useUser } from "../lib/permissions";

const navigation = [
  { label: "Learning", href: "#learning-path" },
  { label: "School tools", href: "#school-tools" },
  { label: "For everyone", href: "#roles" },
  { label: "About MRLC", href: "#about" },
];

const schoolTools = [
  { icon: Users, title: "Student records", text: "Profiles, contacts and academic history in one dependable record." },
  { icon: CalendarDays, title: "Attendance", text: "A quick daily register with patterns that are easy to follow up." },
  { icon: ClipboardCheck, title: "Classes & exams", text: "Plan lessons, run GED practice and return results clearly." },
  { icon: Library, title: "Learning library", text: "Keep physical and digital resources easy to find and share." },
  { icon: Receipt, title: "Fees & receipts", text: "Track contributions and give families a transparent payment history." },
  { icon: FileChartColumn, title: "Reports", text: "Turn day-to-day activity into useful school and learner reports." },
];

const rolePanels = [
  {
    icon: GraduationCap,
    title: "Students",
    text: "See today’s learning, open resources, take assessments and understand what comes next.",
    points: ["Personal timetable", "Results & feedback", "Language Quest"],
    className: "bg-academic-gold text-academic-navy-deep",
  },
  {
    icon: Users,
    title: "Families",
    text: "Stay close to attendance, progress and school updates without sorting through separate systems.",
    points: ["Attendance history", "Progress reports", "Fee records"],
    className: "bg-academic-sky text-white",
  },
  {
    icon: UserRoundCheck,
    title: "Educators",
    text: "Move from the morning register to teaching, grading and follow-up with less admin friction.",
    points: ["Class workspace", "Assessment tools", "School-wide insight"],
    className: "bg-academic-teal text-white",
  },
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-academic-gold selection:text-academic-navy-deep">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-white focus:px-4 focus:py-3 focus:text-academic-navy-deep focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <span className="grid size-10 place-items-center bg-academic-navy-deep text-lg font-semibold text-white">M</span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-[-0.01em]">MRLC LMS</span>
              <span className="block text-[11px] font-medium tracking-[0.06em] text-muted-foreground">GED SCHOOL</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Use light theme" : "Use dark theme"}
              className="grid size-11 place-items-center text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              to={user ? "/dashboard" : "/login"}
              className="inline-flex min-h-11 items-center gap-2 bg-academic-navy-deep px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-academic-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              {user ? "Dashboard" : "Login"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            className="grid size-11 place-items-center sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-navigation" className="border-t border-border bg-background px-4 py-5 sm:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="border-b border-border py-3 text-base font-medium last:border-0">
                  {item.label}
                </a>
              ))}
              <div className="mt-4 grid grid-cols-[44px_1fr] gap-3">
                <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={isDark ? "Use light theme" : "Use dark theme"} className="grid size-11 place-items-center border border-border">
                  {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </button>
                <Link to={user ? "/dashboard" : "/login"} className="inline-flex min-h-11 items-center justify-center gap-2 bg-academic-navy-deep px-5 text-sm font-semibold text-white">
                  {user ? "Open Dashboard" : "Login to MRLC"}<ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main id="main-content">
        <Hero1 authenticated={Boolean(user)} />

        <section className="border-b border-border bg-white dark:bg-surface-indigo">
          <div className="mx-auto grid max-w-[1440px] divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
            {[
              { icon: BookOpen, title: "Learn", text: "Lessons and resources stay connected to each learner." },
              { icon: ClipboardCheck, title: "Run the school day", text: "Attendance, classes and exams move through one workflow." },
              { icon: ShieldCheck, title: "Support with care", text: "Clear permissions keep sensitive information in the right hands." },
            ].map(({ icon: FeatureIcon, title, text }) => (
              <div key={title} className="flex gap-4 px-6 py-7 lg:px-10">
                <FeatureIcon className="mt-0.5 size-5 shrink-0 text-academic-teal" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="learning-path" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-academic-teal">A VISIBLE LEARNING PATH</p>
                <h2 className="mt-4 max-w-[11ch] text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">Learners always know what comes next.</h2>
              </div>
              <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                Inspired by the clarity of a course map, MRLC brings the school journey into focus—from today’s class to GED readiness and independent learning.
              </p>
            </div>

            <div className="mt-12 overflow-hidden border border-border bg-academic-navy-deep text-white">
              <div className="grid lg:grid-cols-[1fr_0.85fr]">
                <ol className="divide-y divide-white/15 p-6 sm:p-10">
                  {[
                    ["01", "Start with today", "Open the timetable, join class and find the right resource without hunting."],
                    ["02", "See progress clearly", "Attendance, assignments and feedback build one understandable learner story."],
                    ["03", "Keep moving forward", "GED practice and Language Quest show the next achievable step."],
                  ].map(([number, title, text]) => (
                    <li key={number} className="grid gap-3 py-6 first:pt-0 last:pb-0 sm:grid-cols-[4rem_1fr]">
                      <span className="font-semibold tabular-nums text-academic-gold">{number}</span>
                      <div>
                        <h3 className="text-xl font-semibold tracking-[-0.015em]">{title}</h3>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">{text}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="bg-aubergine-50 p-6 text-academic-navy-deep dark:bg-accent dark:text-white sm:p-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.08em] text-academic-teal dark:text-accent-foreground">MY LEARNING</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">Today’s route</h3>
                    </div>
                    <Languages className="size-7 text-academic-teal dark:text-accent-foreground" aria-hidden="true" />
                  </div>
                  <div className="mt-8 space-y-2">
                    {[
                      ["Completed", "English vocabulary", "bg-academic-teal"],
                      ["Now", "GED mathematics", "bg-academic-gold"],
                      ["Next", "Language Quest", "bg-academic-sky"],
                    ].map(([status, title, color]) => (
                      <div key={status} className="grid grid-cols-[12px_1fr] gap-4 bg-white p-4 text-academic-navy-deep dark:bg-surface-indigo dark:text-white">
                        <span className={`mt-1.5 size-3 ${color}`} aria-hidden="true" />
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">{status.toUpperCase()}</p>
                          <p className="mt-1 font-semibold">{title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/language-quest" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-academic-teal dark:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Open Language Quest <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="roles" className="scroll-mt-20 border-y border-border bg-white px-5 py-20 dark:bg-surface-indigo sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.08em] text-academic-teal">ONE SCHOOL, THREE CLEAR VIEWS</p>
              <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">The right view for every person.</h2>
              <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground">Each role sees what helps them act, while private information remains protected.</p>
            </div>

            <div className="mt-12 grid gap-4 lg:grid-cols-3">
              {rolePanels.map((role) => (
                <article key={role.title} className={`flex min-h-[390px] flex-col p-7 sm:p-8 ${role.className}`}>
                  <role.icon className="size-7" aria-hidden="true" />
                  <h3 className="mt-10 text-3xl font-semibold tracking-[-0.025em]">{role.title}</h3>
                  <p className="mt-4 text-base leading-7 opacity-85">{role.text}</p>
                  <ul className="mt-auto space-y-3 pt-9">
                    {role.points.map((point) => (
                      <li key={point} className="flex items-center gap-3 border-t border-current/20 pt-3 text-sm font-medium">
                        <Check className="size-4 shrink-0" aria-hidden="true" />{point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="school-tools" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-academic-teal">SCHOOL TOOLS</p>
                <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">The admin fades. Teaching stays in focus.</h2>
                <p className="mt-5 max-w-md text-pretty leading-7 text-muted-foreground">Every module shares the same calm structure, so staff can learn the system once and move confidently.</p>
              </div>

              <div className="border-t border-border">
                {schoolTools.map((tool) => (
                  <div key={tool.title} className="grid gap-4 border-b border-border py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-start">
                    <tool.icon className="size-5 text-academic-teal" aria-hidden="true" />
                    <h3 className="font-semibold tracking-[-0.01em]">{tool.title}</h3>
                    <p className="max-w-lg text-sm leading-6 text-muted-foreground">{tool.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 bg-academic-navy-deep px-5 py-20 text-white sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex items-center gap-3 text-academic-gold">
                <ShieldCheck className="size-6" aria-hidden="true" />
                <span className="text-xs font-semibold tracking-[0.08em]">PRIVATE BY DESIGN</span>
              </div>
              <h2 className="mt-5 max-w-[13ch] text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">Built around MRLC—not a generic school template.</h2>
              <p className="mt-6 max-w-2xl text-pretty leading-7 text-slate-300">Role-based access, school-owned workflows and focused tools support the people doing the work while protecting learner information.</p>
            </div>
            <Link to={user ? "/dashboard" : "/login"} className="inline-flex min-h-12 items-center justify-center gap-2 bg-academic-gold px-7 text-sm font-semibold text-academic-navy-deep transition-[background-color,transform] duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-academic-navy-deep active:scale-[0.98]">
              {user ? "Open Dashboard" : "Login to MRLC"}<ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center bg-academic-navy-deep font-semibold text-white">M</span>
            <span>MRLC Learning Management System</span>
          </div>
          <p>Purpose-built for MRLC GED School in Malaysia.</p>
        </div>
      </footer>
    </div>
  );
}
