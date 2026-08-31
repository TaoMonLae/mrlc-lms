import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import AnimatedContent from '@/components/AnimatedContent';
import { useSettings } from '../providers/SettingsProvider';

const SCHOOL_SYSTEM = [
  {
    number: '01',
    label: 'Learn',
    title: 'A visible path from class to qualification.',
    description: 'Classes, homework, examinations, GED preparation, dictionaries and the e-library stay connected so learners can see what comes next.',
    scope: 'Teaching · Assessment · GED · Reading',
  },
  {
    number: '02',
    label: 'Support',
    title: 'One current record for the people doing the work.',
    description: 'Students, teachers and school staff share attendance, timetables, profiles and communication without passing disconnected files between teams.',
    scope: 'People · Attendance · Timetables · Communication',
  },
  {
    number: '03',
    label: 'Operate',
    title: 'Administration that stays close to the classroom.',
    description: 'Fees, payroll, documents, reports and daily operations are organised around school life and the decisions MRLC needs to make.',
    scope: 'Finance · Documents · Reports · Operations',
  },
  {
    number: '04',
    label: 'Practice',
    title: 'Independent learning without losing school context.',
    description: 'Learning Quest, mastery review and carefully controlled games help learners practise while MRLC remains the primary identity and home.',
    scope: 'Languages · Mathematics · GED · Mastery',
  },
] as const;

const BUILD_REGISTRY = [
  ['Learning Quest', 'Language learning, K–12 Mathematics and four GED subject pathways with mastery practice and teacher insight.'],
  ['School learning', 'Classwork, homework, examinations, grade records, attendance, timetables and reporting.'],
  ['Reading and reference', 'A managed e-library plus English, Myanmar and Mon dictionary resources.'],
  ['School operations', 'Finance, payroll, documents, communication and administrative records in one role-based system.'],
  ['Application foundation', 'React, TypeScript, Vite and accessible interface primitives on the client.'],
  ['Data and services', 'Express, Prisma and PostgreSQL keep school information connected and auditable.'],
] as const;

const DEVELOPER_REGISTRY = [
  ['Role', 'Product designer and full-stack developer'],
  ['Responsibility', 'Product direction, interface design, application engineering and system integration'],
  ['Focus', 'Learning tools, school operations, accessible interfaces and maintainable data systems'],
  ['Project', 'MRLC LMS and Learning Quest'],
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
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-current underline decoration-1 underline-offset-4 transition-opacity hover:opacity-65">{children}</a>;
}

export default function AboutPage() {
  const { schoolProfile, brandingSettings } = useSettings();
  const schoolName = schoolProfile.name || 'Mon Refugee Learning Centre';
  const schoolShortName = schoolProfile.shortName || 'MRLC';
  const configuredAddress = schoolProfile.address?.trim();
  const schoolLocation = configuredAddress && !/(mae sot|thailand)/i.test(configuredAddress)
    ? configuredAddress
    : 'Malaysia';
  const style = {
    '--about-ink': '#19324d',
    '--about-teal': '#168c83',
    '--about-yellow': '#f4d35e',
  } as CSSProperties;

  return (
    <div style={style} className="-m-4 overflow-hidden bg-white text-[var(--about-ink)] sm:-m-6 xl:-m-8">
      <section className="grid min-h-[580px] border-b border-[var(--about-ink)] lg:grid-cols-[1.28fr_0.72fr]" aria-labelledby="about-title">
        <div className="flex min-h-[580px] flex-col justify-between bg-[var(--about-ink)] px-6 py-8 text-white sm:px-10 sm:py-10 xl:px-16 xl:py-14">
          <div className="flex items-center justify-between gap-6 border-b border-white/30 pb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/65 sm:text-xs">
            <span>About {schoolShortName}</span>
            <span>Malaysia · GED School</span>
          </div>

          <AnimatedContent container="#main-content" distance={34} duration={0.75} className="py-12 lg:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--about-yellow)]">Mon Refugee Learning Centre</p>
            <h1 id="about-title" className="mt-6 max-w-[10ch] text-balance text-[clamp(3.7rem,8vw,7.4rem)] font-black uppercase leading-[0.78] tracking-[-0.075em]">
              Education, dignity and a clear next step.
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-base leading-7 text-white/75 sm:text-lg">
              {schoolName} is a GED school serving refugee learners in Malaysia. This portal brings teaching, student support and school operations into one dependable place.
            </p>
          </AnimatedContent>

          <div className="grid grid-cols-2 gap-y-3 border-t border-white/30 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/60 sm:grid-cols-4 sm:text-xs">
            <span>Students</span><span>Teachers</span><span>School staff</span><span>Community</span>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden bg-[var(--about-yellow)] lg:min-h-[580px]">
          {brandingSettings.loginHeroUrl ? (
            <>
              <img src={brandingSettings.loginHeroUrl} alt={`${schoolName} learning community in Malaysia`} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[var(--about-ink)]/20" />
              <p className="absolute bottom-0 left-0 right-0 bg-[var(--about-yellow)] px-6 py-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--about-ink)] sm:px-10">
                School life first. Technology in service of it.
              </p>
            </>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col justify-between p-7 text-[var(--about-ink)] sm:p-10 lg:min-h-[580px]">
              <div className="flex items-start justify-between gap-6">
                {brandingSettings.logoUrl ? (
                  <img src={brandingSettings.logoUrl} alt={`${schoolName} logo`} className="h-20 w-20 border border-[var(--about-ink)] bg-white object-contain p-2" />
                ) : (
                  <span className="grid h-20 w-20 place-items-center border border-[var(--about-ink)] bg-white text-2xl font-black">M</span>
                )}
                <span className="text-right text-[10px] font-bold uppercase tracking-[0.18em]">Malaysia<br />School portal</span>
              </div>
              <p aria-hidden="true" className="-ml-2 text-[clamp(8rem,20vw,15rem)] font-black uppercase leading-[0.62] tracking-[-0.1em] text-[var(--about-ink)]/14">MY</p>
              <div className="border-t border-[var(--about-ink)] pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]">{schoolLocation}</p>
                <p className="mt-3 max-w-[18ch] text-2xl font-black leading-[0.95] tracking-[-0.04em]">Learning with dignity.<br />Records with clarity.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatedContent container="#main-content" distance={30} duration={0.68} threshold={0.16}>
        <section className="grid border-b border-[var(--about-ink)] lg:grid-cols-[0.72fr_1.28fr]" aria-labelledby="purpose-title">
          <div className="bg-[var(--about-yellow)] px-6 py-12 sm:px-10 lg:px-12 lg:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Why MRLC exists</p>
            <h2 id="purpose-title" className="mt-5 max-w-[12ch] text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-5xl">Learning should open a future, not another barrier.</h2>
          </div>
          <div className="grid gap-10 bg-white px-6 py-12 sm:px-10 lg:grid-cols-2 lg:px-14 lg:py-16">
            <p className="text-2xl font-black leading-tight tracking-[-0.04em] text-[var(--about-ink)]">MRLC serves learners building their next chapter in Malaysia. The system begins with that responsibility.</p>
            <div className="space-y-5 text-sm leading-7 text-[#526875] sm:text-base">
              <p>Teachers need less duplication. Students need a clear next step. School staff need dependable records. The portal connects those needs without allowing software to become the centre of the school.</p>
              <p>Learning Quest is one learning environment inside MRLC. It supports independent practice, but the school’s identity, people and purpose always come first.</p>
            </div>
          </div>
        </section>
      </AnimatedContent>

      <section className="px-6 py-14 sm:px-10 lg:px-14 lg:py-20" aria-labelledby="system-title">
        <AnimatedContent container="#main-content" distance={28} duration={0.65}>
          <div className="grid gap-5 pb-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--about-teal)]">One connected school system</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[#778b95]">Malaysia · {schoolLocation}</p>
            </div>
            <h2 id="system-title" className="max-w-[14ch] text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-5xl lg:text-6xl">Four responsibilities. One source of truth.</h2>
          </div>
        </AnimatedContent>

        <div className="border-b border-[var(--about-ink)]">
          {SCHOOL_SYSTEM.map((item, index) => (
            <AnimatedContent key={item.number} container="#main-content" direction="horizontal" reverse={index % 2 === 1} distance={26} duration={0.6} threshold={0.08}>
              <article className="grid gap-5 border-t border-[var(--about-ink)] py-7 sm:grid-cols-[64px_0.34fr_0.72fr_1.25fr] sm:py-9 lg:grid-cols-[84px_0.28fr_0.72fr_1.2fr]">
                <p className="text-sm font-black tracking-[0.14em] text-[var(--about-teal)]">{item.number}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#778b95]">{item.label}</p>
                <h3 className="max-w-[20ch] text-2xl font-black leading-[1.02] tracking-[-0.04em] sm:text-3xl">{item.title}</h3>
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
              <p className="text-6xl font-black leading-none tracking-[-0.07em] text-[var(--about-yellow)] sm:text-7xl">{value}</p>
              <p className="mt-4 max-w-[18ch] text-xs font-bold uppercase tracking-[0.15em] text-white/65">{label}</p>
            </div>
          ))}
        </section>
      </AnimatedContent>

      <section className="grid border-b border-[var(--about-ink)] lg:grid-cols-[0.72fr_1.28fr]" aria-labelledby="build-title">
        <AnimatedContent container="#main-content" distance={26} duration={0.65} className="bg-[var(--about-ink)] px-6 py-12 text-white sm:px-10 lg:px-12 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">What the portal brings together</p>
          <h2 id="build-title" className="mt-5 max-w-[12ch] text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-5xl">Technology serving school life.</h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/70">The platform combines open-source foundations with tools built specifically for MRLC—not a generic school dropped into a template.</p>
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

      <AnimatedContent container="#main-content" distance={26} duration={0.65}>
        <section className="grid border-b border-[var(--about-ink)] bg-[var(--about-teal)] text-white lg:grid-cols-[0.82fr_1.18fr]" aria-labelledby="developer-title">
          <div className="flex min-h-[420px] flex-col justify-between border-b border-white/30 px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
            <div className="flex items-start justify-between gap-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">Developer / project stewardship</p>
              <p className="text-right text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">Malaysia<br />Open source</p>
            </div>
            <p aria-hidden="true" className="text-[clamp(6rem,15vw,11rem)] font-black uppercase leading-[0.7] tracking-[-0.09em] text-white/16">TML</p>
            <p className="max-w-[24ch] text-sm leading-6 text-white/70">One named developer, accountable to one real school community.</p>
          </div>

          <div className="px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--about-yellow)]">Designed and developed by</p>
            <h2 id="developer-title" className="mt-4 text-5xl font-black uppercase leading-[0.86] tracking-[-0.065em] sm:text-6xl">Tao Mon Lae</h2>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/78">Tao Mon Lae leads the design and development of MRLC LMS: shaping the product, building the full-stack application, integrating learning and school-operation systems, and maintaining the open-source foundations behind the platform.</p>

            <dl className="mt-9 border-b border-white/30">
              {DEVELOPER_REGISTRY.map(([term, description]) => (
                <div key={term} className="grid gap-2 border-t border-white/30 py-4 sm:grid-cols-[0.42fr_1.58fr]">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{term}</dt>
                  <dd className="text-sm font-bold leading-6 text-white">{description}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="https://github.com/TaoMonLae" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center bg-white px-5 text-sm font-black text-[var(--about-ink)] transition-colors duration-150 hover:bg-[var(--about-yellow)]">GitHub profile ↗</a>
              <a href="https://github.com/TaoMonLae/mrlc-lms" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center border border-white px-5 text-sm font-black text-white transition-colors duration-150 hover:bg-white hover:text-[var(--about-ink)]">Source repository ↗</a>
            </div>
          </div>
        </section>
      </AnimatedContent>

      <section className="px-6 py-14 sm:px-10 lg:px-14 lg:py-20" aria-labelledby="credits-title">
        <AnimatedContent container="#main-content" distance={28} duration={0.65}>
          <div className="grid gap-5 pb-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--about-teal)]">Open-source acknowledgements</p>
            <div>
              <h2 id="credits-title" className="text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-5xl">Credit belongs where it is due.</h2>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#526875]">Sources, licenses and distribution limits remain visible because responsible school technology should explain what it stands on.</p>
            </div>
          </div>
        </AnimatedContent>

        <div className="border-b border-[var(--about-ink)]">
          {THIRD_PARTY_NOTICES.map(({ title, description }, index) => (
            <article key={title} className="grid gap-4 border-t border-[var(--about-ink)] py-6 sm:grid-cols-[72px_0.55fr_1.45fr] sm:py-7">
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#8a9ca5]">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="font-black tracking-[-0.02em]">{title}</h3>
              <p className="text-sm leading-6 text-[#526875]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid bg-[var(--about-yellow)] text-[var(--about-ink)] lg:grid-cols-[1.25fr_0.75fr]" aria-label="Return to the school portal">
        <div className="px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Mon Refugee Learning Centre · Malaysia</p>
          <p className="mt-5 max-w-[17ch] text-4xl font-black uppercase leading-[0.88] tracking-[-0.06em] sm:text-5xl">Built for the people who make the school day happen.</p>
        </div>
        <div className="flex items-end border-t border-[var(--about-ink)] px-6 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-12 lg:py-16">
          <Link to="/dashboard" className="inline-flex min-h-12 items-center justify-center bg-[var(--about-ink)] px-5 text-sm font-black text-white transition-colors duration-150 hover:bg-[var(--about-teal)]">Return to dashboard →</Link>
        </div>
      </section>
    </div>
  );
}
