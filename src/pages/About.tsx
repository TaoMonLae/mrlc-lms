import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import AnimatedContent from '@/components/AnimatedContent';
import { useSettings } from '../providers/SettingsProvider';

const SCHOOL_DAY = [
  {
    number: '01',
    title: 'Learning has a visible path.',
    description: 'Classes, homework, exams, dictionaries and the e-library stay connected, so the next task is never hidden behind a different system.',
    scope: 'Classes · Homework · Exams · Library',
  },
  {
    number: '02',
    title: 'People share one source of truth.',
    description: 'Students, teachers and the school team work from the same current records instead of passing disconnected files between departments.',
    scope: 'Profiles · Attendance · Timetables · Communication',
  },
  {
    number: '03',
    title: 'Operations support the classroom.',
    description: 'Fees, reports, documents and daily administration are organised around the school day—not treated as a separate back office.',
    scope: 'Fees · Documents · Reports · School operations',
  },
  {
    number: '04',
    title: 'Practice can still feel alive.',
    description: 'Learning Quest, mastery review and thoughtful games make progress visible without turning the school portal into a toy.',
    scope: 'Languages · K–12 Mathematics · GED · Mastery',
  },
] as const;

const BUILD_REGISTRY = [
  ['Learning Quest', 'Language learning, K–12 Mathematics and four GED subject paths with mastery practice and teacher insight.'],
  ['School learning', 'Classwork, homework, examinations, grade records, attendance, timetables and reporting.'],
  ['Reading and reference', 'A managed e-library, public-domain imports and English, Myanmar and Mon dictionary resources.'],
  ['Thoughtful play', 'Chess, checkers, Sudoku, Snake and other school-ready games with access controls.'],
  ['Application foundation', 'React, TypeScript, Vite, Tailwind CSS and accessible interface primitives.'],
  ['Data and services', 'Express, Prisma and PostgreSQL keep school information connected and auditable.'],
] as const;

const THIRD_PARTY_NOTICES: { title: string; description: ReactNode }[] = [
  {
    title: 'Learning Quest',
    description: <>
      Interface concepts were informed by <ExternalLink href="https://github.com/sanidhyy/duolingo-clone">sanidhyy/duolingo-clone</ExternalLink> (MIT). An archived Spanish seed experiment was adapted from <ExternalLink href="https://github.com/TaoMonLae/duolingo-clone">TaoMonLae/duolingo-clone</ExternalLink>. MRLC’s original GED preparation uses public educator guidance from <ExternalLink href="https://www.ged.com/content/dam/websites/ged/resources/en/assessment-guide-for-educators-math.pdf">GED Testing Service</ExternalLink>; it does not reproduce official questions.
    </>,
  },
  {
    title: 'Sudoku',
    description: <>Adapted from <ExternalLink href="https://github.com/TN1ck/super-sudoku">super-sudoku</ExternalLink> by Tom Nick under the MIT License.</>,
  },
  {
    title: 'English definitions',
    description: <>Powered by <ExternalLink href="https://github.com/moos/wordpos">WordPOS</ExternalLink> and Princeton WordNet 3.1.</>,
  },
  {
    title: 'English–Myanmar dictionary',
    description: 'Translations originate from the ornagai/MZ dataset. Because its data license is not independently verifiable, it remains limited to internal, non-commercial school use with provenance recorded in the codebase.',
  },
  {
    title: 'Mon dictionary',
    description: <>Entries come from <ExternalLink href="https://github.com/Barnista/MonDictDB">MonDictDB</ExternalLink> under the MIT License.</>,
  },
  {
    title: 'E-Library',
    description: <>Project Gutenberg search and import uses the public <ExternalLink href="https://github.com/garethbjohnson/gutendex">Gutendex</ExternalLink> service and downloads selected public-domain books on demand.</>,
  },
];

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-current underline decoration-2 underline-offset-4">{children}</a>;
}

export default function AboutPage() {
  const { schoolProfile, brandingSettings } = useSettings();
  const schoolName = schoolProfile.name || 'Mon Refugee Learning Centre';
  const style = {
    '--about-brand': brandingSettings.primaryColor || '#112d40',
    '--about-accent': brandingSettings.accentColor || '#168c83',
  } as CSSProperties;

  return (
    <div style={style} className="-m-4 overflow-hidden bg-white text-[#112d40] sm:-m-6 xl:-m-8">
      <section className="grid min-h-[520px] border-b border-[#112d40] lg:grid-cols-[1.18fr_0.82fr]" aria-labelledby="about-title">
        <div className="flex min-h-[520px] flex-col justify-between bg-[var(--about-brand)] px-6 py-8 text-white sm:px-10 sm:py-10 xl:px-16 xl:py-14">
          <div className="flex items-center justify-between gap-6 border-b border-white/30 pb-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70 sm:text-xs">
            <span>About the school portal</span>
            <span>MRLC · Mae Sot</span>
          </div>
          <AnimatedContent container="#main-content" distance={34} duration={0.75} className="py-12 lg:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">One connected school day</p>
            <h1 id="about-title" className="mt-5 max-w-[10ch] text-balance text-5xl font-black uppercase leading-[0.82] tracking-[-0.065em] sm:text-6xl lg:text-7xl xl:text-[6.7rem]">
              A clear place to learn, teach and move forward.
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-base leading-7 text-white/75 sm:text-lg">
              {schoolProfile.description || 'The MRLC school portal brings learning, records and community into one dependable workspace for the people who use it every day.'}
            </p>
          </AnimatedContent>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/30 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/65 sm:text-xs">
            <span>Students</span><span>Teachers</span><span>School team</span><span>Public learners</span>
          </div>
        </div>

        <div className="relative min-h-[380px] overflow-hidden bg-[#f4d35e] lg:min-h-[520px]">
          {brandingSettings.loginHeroUrl ? (
            <>
              <img src={brandingSettings.loginHeroUrl} alt={`${schoolName} learning community`} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[#112d40]/20" />
              <p className="absolute bottom-0 left-0 right-0 bg-[#f4d35e] px-6 py-5 text-xs font-bold uppercase tracking-[0.16em] text-[#112d40] sm:px-10">
                School life first. Technology in service of it.
              </p>
            </>
          ) : (
            <div className="flex h-full min-h-[380px] flex-col justify-between p-7 text-[#112d40] sm:p-10 lg:min-h-[520px]">
              <div className="flex items-start justify-between gap-6">
                {brandingSettings.logoUrl ? <img src={brandingSettings.logoUrl} alt={`${schoolName} logo`} className="h-20 w-20 border border-[#112d40] bg-white object-contain p-2" /> : <span className="grid h-20 w-20 place-items-center border border-[#112d40] bg-white text-2xl font-black">M</span>}
                <span className="text-right text-[10px] font-bold uppercase tracking-[0.18em]">School portal<br />2026</span>
              </div>
              <p aria-hidden="true" className="text-[clamp(5rem,14vw,11rem)] font-black uppercase leading-[0.7] tracking-[-0.08em] text-[#112d40]/15">MRLC</p>
              <p className="max-w-[20ch] text-2xl font-black leading-[1.02] tracking-[-0.04em]">Learning with dignity.<br />Records with clarity.</p>
            </div>
          )}
        </div>
      </section>

      <AnimatedContent container="#main-content" distance={30} duration={0.68} threshold={0.16}>
        <section className="grid border-b border-[#112d40] lg:grid-cols-[0.72fr_1.28fr]" aria-labelledby="purpose-title">
          <div className="bg-[#f4d35e] px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Why it exists</p>
            <h2 id="purpose-title" className="mt-5 max-w-[12ch] text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-5xl">The portal should reduce distance—not create more of it.</h2>
          </div>
          <div className="grid gap-10 bg-white px-6 py-12 sm:px-10 lg:grid-cols-2 lg:px-14 lg:py-16">
            <p className="text-2xl font-black leading-tight tracking-[-0.035em] text-[#112d40]">MRLC serves a real school community. The software starts with that responsibility.</p>
            <div className="space-y-5 text-sm leading-7 text-[#526875] sm:text-base">
              <p>Teachers need less duplication. Students need a clear next step. School staff need dependable records. Every part of the portal is designed around those practical needs.</p>
              <p>Learning Quest is one learning area inside that wider school system. It should never replace the school’s identity, login or primary journey.</p>
            </div>
          </div>
        </section>
      </AnimatedContent>

      <section className="px-6 py-14 sm:px-10 lg:px-14 lg:py-20" aria-labelledby="school-day-title">
        <AnimatedContent container="#main-content" distance={28} duration={0.65}>
          <div className="grid gap-5 pb-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--about-accent)]">Built around the whole school day</p>
            <h2 id="school-day-title" className="max-w-[15ch] text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-5xl lg:text-6xl">Four jobs. One connected workspace.</h2>
          </div>
        </AnimatedContent>

        <div className="border-b border-[#112d40]">
          {SCHOOL_DAY.map((item, index) => (
            <AnimatedContent key={item.number} container="#main-content" direction="horizontal" reverse={index % 2 === 1} distance={26} duration={0.6} threshold={0.08}>
              <article className="grid gap-5 border-t border-[#112d40] py-7 sm:grid-cols-[72px_0.9fr_1.1fr] sm:py-9 lg:grid-cols-[100px_0.8fr_1.2fr]">
                <p className="text-sm font-black tracking-[0.14em] text-[var(--about-accent)]">{item.number}</p>
                <h3 className="max-w-[18ch] text-2xl font-black leading-[1.02] tracking-[-0.035em] sm:text-3xl">{item.title}</h3>
                <div>
                  <p className="max-w-2xl text-sm leading-6 text-[#526875] sm:text-base sm:leading-7">{item.description}</p>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#778b95]">{item.scope}</p>
                </div>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </section>

      <AnimatedContent container="#main-content" distance={30} duration={0.7}>
        <section className="grid bg-black text-white sm:grid-cols-3" aria-label="Learning Quest curriculum evidence">
          {[
            ['150', 'Concept-first GED lessons'],
            ['450', 'Original practice activities'],
            ['04', 'GED subject pathways'],
          ].map(([value, label]) => (
            <div key={label} className="border-b border-white/25 px-6 py-10 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-10 lg:py-14">
              <p className="text-6xl font-black leading-none tracking-[-0.07em] text-[#f4d35e] sm:text-7xl">{value}</p>
              <p className="mt-4 max-w-[18ch] text-xs font-bold uppercase tracking-[0.15em] text-white/65">{label}</p>
            </div>
          ))}
        </section>
      </AnimatedContent>

      <section className="grid border-b border-[#112d40] lg:grid-cols-[0.72fr_1.28fr]" aria-labelledby="build-title">
        <AnimatedContent container="#main-content" distance={26} duration={0.65} className="bg-[var(--about-brand)] px-6 py-12 text-white sm:px-10 lg:px-12 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">What the portal brings together</p>
          <h2 id="build-title" className="mt-5 max-w-[12ch] text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-5xl">Technology serving school life.</h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/70">The platform combines open-source foundations with features built specifically for MRLC—not a generic school dropped into a template.</p>
        </AnimatedContent>
        <div className="bg-white px-6 py-4 sm:px-10 lg:px-14">
          {BUILD_REGISTRY.map(([title, description], index) => (
            <AnimatedContent key={title} container="#main-content" direction="horizontal" distance={20} duration={0.55} delay={index * 0.025}>
              <article className="grid gap-3 border-b border-[#cad4d9] py-6 last:border-b-0 sm:grid-cols-[48px_0.65fr_1.35fr] sm:items-start">
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#8a9ca5]">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="font-black tracking-[-0.02em]">{title}</h3>
                <p className="text-sm leading-6 text-[#526875]">{description}</p>
              </article>
            </AnimatedContent>
          ))}
        </div>
      </section>

      <section className="px-6 py-14 sm:px-10 lg:px-14 lg:py-20" aria-labelledby="credits-title">
        <AnimatedContent container="#main-content" distance={28} duration={0.65}>
          <div className="grid gap-5 pb-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--about-accent)]">Open-source acknowledgements</p>
            <div>
              <h2 id="credits-title" className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-5xl">Credit belongs where it is due.</h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#526875]">Sources, licenses and distribution limits remain visible because responsible school technology should explain what it stands on.</p>
            </div>
          </div>
        </AnimatedContent>

        <div className="border-b border-[#112d40]">
          {THIRD_PARTY_NOTICES.map(({ title, description }, index) => (
            <article key={title} className="grid gap-4 border-t border-[#112d40] py-6 sm:grid-cols-[72px_0.55fr_1.45fr] sm:py-7">
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#8a9ca5]">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="font-black tracking-[-0.02em]">{title}</h3>
              <p className="text-sm leading-6 text-[#526875]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <AnimatedContent container="#main-content" distance={24} duration={0.6}>
        <section className="grid bg-[var(--about-accent)] text-white lg:grid-cols-[1.25fr_0.75fr]" aria-labelledby="maker-title">
          <div className="px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">Designed and developed by Tao Mon Lae</p>
            <h2 id="maker-title" className="mt-5 max-w-[17ch] text-4xl font-black uppercase leading-[0.9] tracking-[-0.055em] sm:text-5xl">Built for the students, teachers and staff of MRLC.</h2>
          </div>
          <div className="flex flex-col justify-between border-t border-white/30 px-6 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-12 lg:py-16">
            <p className="text-sm leading-7 text-white/75">School technology should feel capable, welcoming and distinctly ours.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/dashboard" className="inline-flex min-h-12 items-center justify-center bg-white px-5 text-sm font-black text-[#112d40] transition-colors duration-150 hover:bg-[#f4d35e]">Return to dashboard →</Link>
              <a href="https://github.com/TaoMonLae/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center border border-white px-5 text-sm font-black text-white transition-colors duration-150 hover:bg-white hover:text-[#112d40]">View project work ↗</a>
            </div>
          </div>
        </section>
      </AnimatedContent>
    </div>
  );
}
