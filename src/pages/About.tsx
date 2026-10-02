import type { ReactNode } from 'react';
import { Link } from 'react-router';
import './About.css';
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
  return (
    <div className="school-about">
      <header className="about-masthead">
        <span>About {schoolShortName}</span>
        <nav aria-label="About page sections">
          <a href="#about-school">Our school</a>
          <a href="#about-platform">The platform</a>
          <a href="#about-developer">Developer</a>
          <a href="#about-credits">Credits</a>
        </nav>
      </header>

      <section id="about-school" className="about-intro" aria-labelledby="about-title">
        <div className="about-intro-copy">
          <p className="about-eyebrow">{schoolName}</p>
          <h1 id="about-title">Education, dignity and a clear next step.</h1>
          <p className="about-lead">A GED school serving refugee learners in Malaysia. A shared place for learning, student support and the everyday work of our school.</p>
          <dl className="about-school-facts">
            <div><dt>Community</dt><dd>Students, teachers & school staff</dd></div>
            <div><dt>Based in</dt><dd>{schoolLocation}</dd></div>
          </dl>
        </div>
        <figure className="about-school-image">
          {brandingSettings.loginHeroUrl ? (
            <img src={brandingSettings.loginHeroUrl} alt={`${schoolName} learning community in Malaysia`} />
          ) : (
            <div className="about-school-mark">
              {brandingSettings.logoUrl && <img src={brandingSettings.logoUrl} alt={`${schoolName} logo`} />}
              <p>{schoolName}</p><span>Learning together in Malaysia</span>
            </div>
          )}
          <figcaption>School life first. Technology in service of it.</figcaption>
        </figure>
      </section>

      <section className="about-section about-purpose" aria-labelledby="purpose-title">
        <div className="about-section-label"><span>01 / Our purpose</span><h2 id="purpose-title">Learning should open a future.</h2></div>
        <div className="about-prose"><p>MRLC serves learners building their next chapter in Malaysia. Teachers need less duplication. Students need a clear next step. School staff need dependable records.</p><p>This portal connects those needs. Learning Quest supports independent practice, while the school’s people and purpose remain at the centre.</p></div>
      </section>

      <section id="about-platform" className="about-section" aria-labelledby="system-title">
        <div className="about-section-label"><span>02 / The platform</span><h2 id="system-title">One school.<br />Connected responsibilities.</h2><p>Tools that follow the school day, from the classroom to the office.</p></div>
        <div className="about-system-list">
          {SCHOOL_SYSTEM.map(item => <article key={item.number} className="about-system-row">
            <span className="about-row-number">{item.number}</span><div><h3>{item.label}</h3><p>{item.description}</p><small>{item.scope}</small></div>
          </article>)}
          <details className="about-details"><summary>Explore the platform foundations</summary><dl className="about-registry">{BUILD_REGISTRY.map(([title, description]) => <div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}</dl></details>
        </div>
      </section>

      <section id="about-developer" className="about-section about-developer" aria-labelledby="developer-title">
        <div className="about-section-label"><span>03 / Behind the platform</span>
          <img className="about-portrait" src="/images/about/tao-mon-lae.jpg" alt="Tao Mon Lae, developer of MRLC LMS" width="160" height="160" loading="lazy" />
          <p className="about-photo-caption">Tao Mon Lae · GitHub profile photo</p>
        </div>
        <div><p className="about-eyebrow">Designed and developed by</p><h2 id="developer-title">Tao Mon Lae</h2>
          <p className="about-developer-role">Product designer & full-stack developer</p>
          <p>Tao Mon Lae leads the design and development of MRLC LMS, from the interface and learning tools to the school-operation systems and open-source foundations behind the platform.</p>
          <dl className="about-registry">{DEVELOPER_REGISTRY.filter(([term]) => term !== 'Role').map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>
          <div className="about-developer-links"><a href="https://github.com/TaoMonLae" target="_blank" rel="noopener noreferrer" className="about-primary-link">GitHub profile ↗</a><ExternalLink href="https://github.com/TaoMonLae/mrlc-lms">Source repository ↗</ExternalLink></div>
        </div>
      </section>

      <section id="about-credits" className="about-section" aria-labelledby="credits-title">
        <div className="about-section-label"><span>04 / Acknowledgements</span><h2 id="credits-title">Built on shared work.</h2><p>The people, projects and resources that support this platform.</p></div>
        <div className="about-notices">{THIRD_PARTY_NOTICES.map(({title, description}) => <article key={title}><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
      <footer className="about-footer"><div><strong>{schoolShortName} LMS</strong><p>Built for the people who make the school day happen.</p></div><Link to="/dashboard">Return to dashboard →</Link></footer>
    </div>
  );
}
