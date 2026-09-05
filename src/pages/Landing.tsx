import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import Hero1 from "@/components/blocks/hero-1";
import { useTheme } from "../components/theme-provider";
import { useUser } from "../lib/permissions";
import { useSettings } from "../providers/SettingsProvider";

const navigation = [
  { label: "Learning", href: "#learning-path" },
  { label: "School tools", href: "#school-tools" },
  { label: "For everyone", href: "#roles" },
  { label: "About MRLC", href: "/about" },
];

const schoolTools = [
  ["01", "Student records", "Profiles, contacts and academic history in one dependable record."],
  ["02", "Attendance", "A quick daily register with patterns that are easy to follow up."],
  ["03", "Classes & exams", "Plan lessons, run GED practice and return results clearly."],
  ["04", "Learning library", "Keep physical and digital resources easy to find and share."],
  ["05", "Fees & receipts", "Track contributions and give families a transparent payment history."],
  ["06", "Reports", "Turn day-to-day activity into useful school and learner reports."],
];

const rolePanels = [
  {
    number: "01",
    title: "Students",
    text: "Today’s timetable, learning resources, assessments and Language Quest—together in one route.",
    detail: "LEARN · PRACTISE · PROGRESS",
    className: "bg-academic-gold text-academic-navy-deep",
  },
  {
    number: "02",
    title: "Families",
    text: "Attendance, progress and school updates presented without searching through separate systems.",
    detail: "ATTENDANCE · REPORTS · FEES",
    className: "bg-academic-sky text-white",
  },
  {
    number: "03",
    title: "Educators",
    text: "From the morning register to teaching, grading and follow-up with less administrative friction.",
    detail: "TEACH · ASSESS · SUPPORT",
    className: "bg-academic-teal text-white",
  },
];

function BrandMark({ logoUrl, schoolName, compact = false }: { logoUrl: string | null; schoolName: string; compact?: boolean }) {
  const defaultLogoUrl = "/icon-192.png";
  const [configuredLogoFailed, setConfiguredLogoFailed] = useState(false);
  const [defaultLogoFailed, setDefaultLogoFailed] = useState(false);

  useEffect(() => {
    setConfiguredLogoFailed(false);
    setDefaultLogoFailed(false);
  }, [logoUrl]);

  const displayLogoUrl = logoUrl && !configuredLogoFailed
    ? logoUrl
    : defaultLogoFailed ? null : defaultLogoUrl;

  return (
    <span className="flex min-w-0 items-center gap-3">
      {displayLogoUrl ? (
        <img
          src={displayLogoUrl}
          alt=""
          width={compact ? 36 : 44}
          height={compact ? 36 : 44}
          className={`${compact ? "size-9" : "size-11"} shrink-0 bg-white object-contain p-1`}
          onError={() => {
            if (logoUrl && displayLogoUrl === logoUrl) setConfiguredLogoFailed(true);
            else setDefaultLogoFailed(true);
          }}
        />
      ) : (
        <span className={`${compact ? "text-base" : "text-lg"} shrink-0 border-y-2 border-current py-1 font-black tracking-[-0.05em]`} aria-hidden="true">
          MRLC
        </span>
      )}
      <span className="min-w-0 leading-tight">
        <span className={`${compact ? "text-sm" : "text-base"} block truncate font-bold tracking-[-0.02em]`}>{schoolName}</span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-current/60">GED school · Malaysia</span>
      </span>
    </span>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { schoolProfile, brandingSettings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const schoolName = schoolProfile.name || "Mon Refugee Learning Centre";

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-academic-gold selection:text-academic-navy-deep">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-white focus:px-4 focus:py-3 focus:text-academic-navy-deep focus:shadow-lg"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-academic-navy-deep text-white">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/" aria-label={`${schoolName} home`} className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-gold focus-visible:ring-offset-2 focus-visible:ring-offset-academic-navy-deep">
            <BrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
            {navigation.map((item) => (
              item.href.startsWith("/") ? (
                <Link key={item.href} to={item.href} className="text-sm font-semibold text-white/65 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-gold">
                  {item.label}
                </Link>
              ) : (
                <a key={item.href} href={item.href} className="text-sm font-semibold text-white/65 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-gold">
                  {item.label}
                </a>
              )
            ))}
          </nav>

          <div className="hidden items-stretch sm:flex">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Use light theme" : "Use dark theme"}
              className="grid size-12 place-items-center border-x border-white/10 text-white/65 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-gold"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <Link
              to={user ? "/dashboard" : "/login"}
              className="inline-flex min-h-12 items-center gap-3 bg-academic-teal px-6 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-white hover:text-academic-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-academic-gold active:scale-[0.98]"
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
            className="grid size-11 shrink-0 place-items-center sm:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-gold"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-navigation" className="border-t border-white/10 bg-academic-navy-deep px-4 py-5 sm:hidden" aria-label="Mobile navigation">
            <div className="flex flex-col">
              {navigation.map((item) => (
                item.href.startsWith("/") ? (
                  <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-3 text-base font-semibold text-white/80 last:border-0">
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="border-b border-white/10 py-3 text-base font-semibold text-white/80 last:border-0">
                    {item.label}
                  </a>
                )
              ))}
              <div className="mt-4 grid grid-cols-[44px_1fr] gap-3">
                <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={isDark ? "Use light theme" : "Use dark theme"} className="grid size-11 place-items-center border border-white/20">
                  {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </button>
                <Link to={user ? "/dashboard" : "/login"} className="inline-flex min-h-11 items-center justify-center gap-2 bg-academic-teal px-5 text-sm font-bold text-white">
                  {user ? "Open Dashboard" : "Login to MRLC"}<ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main id="main-content">
        <Hero1 authenticated={Boolean(user)} heroSrc={brandingSettings.loginHeroUrl} schoolName={schoolName} />

        <section className="border-b border-academic-navy-deep/20 bg-white text-academic-navy-deep dark:bg-surface-indigo dark:text-white" aria-label="MRLC learning system">
          <div className="mx-auto grid max-w-[1440px] divide-y divide-current/15 md:grid-cols-[0.55fr_1.45fr] md:divide-x md:divide-y-0">
            <p className="px-6 py-6 text-[11px] font-bold uppercase tracking-[0.18em] text-academic-teal lg:px-10">One connected school day</p>
            <div className="grid divide-y divide-current/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {["01 · Learn", "02 · Run", "03 · Support"].map((item) => (
                <p key={item} className="px-6 py-6 text-sm font-bold tracking-[-0.01em] lg:px-8">{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section id="learning-path" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-academic-teal">A visible learning path</p>
                <h2 className="mt-4 max-w-[11ch] text-balance text-4xl font-black leading-[0.96] tracking-[-0.045em] sm:text-6xl">Learners know what comes next.</h2>
              </div>
              <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                MRLC brings the school journey into focus—from today’s class to GED readiness and independent language practice.
              </p>
            </div>

            <div className="mt-12 grid overflow-hidden border border-academic-navy-deep bg-academic-navy-deep text-white lg:grid-cols-[1fr_0.9fr]">
              <ol className="divide-y divide-white/15 px-6 sm:px-10">
                {[
                  ["01", "Start with today", "Open the timetable, join class and find the right resource without hunting."],
                  ["02", "See progress clearly", "Attendance, assignments and feedback build one understandable learner story."],
                  ["03", "Keep moving forward", "GED practice and Language Quest reveal the next achievable step."],
                ].map(([number, title, text]) => (
                  <li key={number} className="grid gap-3 py-7 sm:grid-cols-[4rem_1fr] sm:py-8">
                    <span className="font-black tabular-nums text-academic-gold">{number}</span>
                    <div>
                      <h3 className="text-xl font-bold tracking-[-0.02em]">{title}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-white/65">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="bg-white p-6 text-academic-navy-deep dark:bg-accent dark:text-white sm:p-10">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-academic-teal dark:text-accent-foreground">Today’s route</p>
                <div className="mt-7 border-y border-current/20">
                  {[
                    ["08:30", "English vocabulary", "Complete"],
                    ["10:15", "GED mathematics", "Now"],
                    ["13:00", "Language Quest", "Next"],
                  ].map(([time, title, status]) => (
                    <div key={time} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 border-b border-current/15 py-4 last:border-0">
                      <span className="text-sm font-black tabular-nums">{time}</span>
                      <span className="text-sm font-semibold">{title}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-current/55">{status}</span>
                    </div>
                  ))}
                </div>
                <Link to="/language-quest" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-academic-teal dark:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Open Language Quest <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="roles" className="scroll-mt-20 bg-academic-navy-deep text-white">
          <div className="mx-auto max-w-[1440px] border-x border-white/10">
            <div className="grid gap-8 border-b border-white/15 px-6 py-16 sm:px-10 lg:grid-cols-[1fr_0.9fr] lg:items-end lg:py-20">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-academic-gold">One school, three views</p>
                <h2 className="mt-4 max-w-[13ch] text-balance text-4xl font-black leading-[0.96] tracking-[-0.045em] sm:text-6xl">The right information for every person.</h2>
              </div>
              <p className="max-w-xl text-pretty leading-7 text-white/65">Each role sees what helps them act, while private learner information stays protected.</p>
            </div>

            <div className="grid lg:grid-cols-3">
              {rolePanels.map((role) => (
                <article key={role.title} className={`flex min-h-[360px] flex-col border-b border-academic-navy-deep/25 p-7 lg:border-b-0 lg:border-r lg:last:border-r-0 sm:p-9 ${role.className}`}>
                  <span className="text-sm font-black tabular-nums opacity-70">{role.number}</span>
                  <h3 className="mt-10 text-4xl font-black tracking-[-0.04em]">{role.title}</h3>
                  <p className="mt-5 max-w-sm text-base leading-7 opacity-80">{role.text}</p>
                  <p className="mt-auto border-t border-current/25 pt-5 text-[10px] font-bold uppercase tracking-[0.16em]">{role.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="school-tools" className="scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1240px]">
            <div className="grid gap-12 lg:grid-cols-[0.65fr_1.35fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-academic-teal">School tools</p>
                <h2 className="mt-4 text-balance text-4xl font-black leading-[0.96] tracking-[-0.045em] sm:text-6xl">Admin fades. Teaching stays in focus.</h2>
                <p className="mt-6 max-w-md text-pretty leading-7 text-muted-foreground">One operating system for the work MRLC already does—without the visual noise of a generic dashboard catalogue.</p>
              </div>

              <div className="border-t border-border">
                {schoolTools.map(([number, title, detail]) => (
                  <div key={number} className="grid gap-3 border-b border-border py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-start">
                    <span className="text-xs font-black tabular-nums text-academic-teal">{number}</span>
                    <h3 className="font-bold tracking-[-0.02em]">{title}</h3>
                    <p className="max-w-lg text-sm leading-6 text-muted-foreground">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 border-t border-white/10 bg-academic-navy-deep px-5 py-20 text-white sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-academic-gold">Private by design</p>
              <h2 className="mt-5 max-w-[13ch] text-balance text-4xl font-black leading-[0.96] tracking-[-0.045em] sm:text-6xl">Built around MRLC, not a generic school template.</h2>
              <p className="mt-6 max-w-2xl text-pretty leading-7 text-white/65">Role-based access and school-owned workflows support the people doing the work while protecting learner information.</p>
            </div>
            <Link to="/about" className="inline-flex min-h-12 items-center justify-center gap-2 bg-academic-gold px-7 text-sm font-bold text-academic-navy-deep transition-[background-color,transform] duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-academic-navy-deep active:scale-[0.98]">
              About MRLC <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <BrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} compact />
          <p>Purpose-built for MRLC GED School in Malaysia.</p>
        </div>
      </footer>
    </div>
  );
}
