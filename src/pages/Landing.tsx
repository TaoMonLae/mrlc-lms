import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, Check, ChevronRight, Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../components/theme-provider';
import { useUser } from '../lib/permissions';
import { useSettings } from '../providers/SettingsProvider';
import PublicBrandMark from '../components/PublicBrandMark';
import './landing.css';

const nav = [
  ['The platform', '#platform'],
  ['Learning Quest', '#learning-quest'],
  ["What's new", '#whats-new'],
  ['Kiosk downloads', '/kiosk-downloads'],
  ['About MRLC', '#about'],
];

const work = [
  ['Teach', 'Classes, timetables, homework and a shared library.'],
  ['Assess', 'Question banks, exams, review, grading and progress.'],
  ['Support', 'Attendance, student records, family access and reports.'],
];

const updates = [
  ['14 Oct 2026', 'Mac kiosk beta signed', "The Mac kiosk beta is Developer ID signed and notarized. Teachers can monitor assigned focus sessions, adjust time and respond to release requests. Windows remains an unsigned beta; phones and tablets can use the voluntary Focus web app beta."],
  ['6 Oct 2026', 'Better video and exam controls', 'Video lessons gained clearer player, fullscreen and bulk actions. Exam answer keys and response review follow staff permissions.'],
  ['3 Oct 2026', 'Notifications with more control', "Staff can choose in-app and email delivery, select relevant topics and retry a failed save. Email depends on the school's configured email service."],
  ['2 Oct 2026', 'Clearer exam work', 'Exam Studio, student answer review and navigation improvements help teachers author and review assessments.'],
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { schoolProfile, brandingSettings } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const schoolName = schoolProfile.name || 'Mon Refugee Learning Centre';
  const portalHref = user?.role === 'GUARDIAN' ? '/family' : user ? '/dashboard' : '/login';
  const portalLabel = user?.role === 'GUARDIAN' ? 'Open Family Portal' : user ? 'Open dashboard' : 'Sign in to MRLC';
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const heroPhoto = brandingSettings.loginHeroUrl && !photoFailed ? brandingSettings.loginHeroUrl : null;
  useEffect(() => setPhotoFailed(false), [brandingSettings.loginHeroUrl]);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return <div className="landing">
    <a className="landing-skip" href="#main-content">Skip to content</a>
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to="/" className="landing-home" aria-label={schoolName + ' home'}><PublicBrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} /></Link>
        <nav className="landing-nav" aria-label="Main navigation">{nav.map(([label, href]) => href.startsWith('/') ? <Link key={href} to={href}>{label}</Link> : <a key={href} href={href}>{label}</a>)}</nav>
        <div className="landing-header-actions">
          <button className="landing-theme" type="button" onClick={toggleTheme} aria-label={isDark ? 'Use light theme' : 'Use dark theme'}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <Link className="landing-header-cta" to={portalHref}>{portalLabel}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <button className="landing-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="landing-mobile-nav" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {menuOpen && <nav id="landing-mobile-nav" className="landing-mobile-nav" aria-label="Mobile navigation">
        {nav.map(([label, href]) => href.startsWith('/') ? <Link key={href} to={href} onClick={() => setMenuOpen(false)}>{label}</Link> : <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        <Link to={portalHref} onClick={() => setMenuOpen(false)} className="landing-mobile-cta">{portalLabel}<ArrowRight size={17} /></Link>
        <button type="button" onClick={toggleTheme}>{isDark ? 'Use light theme' : 'Use dark theme'}</button>
      </nav>}
    </header>
    <main id="main-content">
      <section className="landing-hero" aria-labelledby="landing-title"><div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <h1 id="landing-title">One school day.<br /><em>Everyone in step.</em></h1>
          <p>MRLC brings teaching, assessment, student support and school operations together for the Mon Refugee Learning Centre GED School in Malaysia.</p>
          <div className="landing-hero-actions"><Link to={portalHref} className="landing-button landing-button-primary">{portalLabel}<ArrowRight size={18} /></Link><Link to="/language-quest" className="landing-button landing-button-secondary">Explore Learning Quest<ChevronRight size={18} /></Link></div>
          <div className="landing-hero-foot"><span>For students</span><span>For families</span><span>For educators</span></div>
        </div>
        <div className="landing-hero-stage">
          {heroPhoto && <img className="landing-hero-photo" src={heroPhoto} alt={schoolName + ' learning community'} onError={() => setPhotoFailed(true)} />}
          <div className="landing-daybook" aria-label="Illustrative view of connected school work">
            <div className="landing-daybook-top"><span><b>MRLC</b> school day</span><span>Illustrative view</span></div>
            <div className="landing-daybook-intro"><span>Today, together</span><strong>One place for the next step.</strong></div>
            <div className="landing-daybook-rows">
              <div><span className="landing-daybook-icon"><BookOpen size={19} /></span><span><strong>Teaching</strong><small>Classes and resources, ready to use</small></span><Check size={17} /></div>
              <div><span className="landing-daybook-icon">A</span><span><strong>Attendance</strong><small>A shared view for timely follow-up</small></span><Check size={17} /></div>
              <div><span className="landing-daybook-icon">G</span><span><strong>GED practice</strong><small>Questions, review and progress</small></span><Check size={17} /></div>
            </div>
            <div className="landing-daybook-bottom"><span>Learning continues beyond the classroom</span><ArrowRight size={17} /></div>
          </div>
        </div>
      </div></section>

      <section id="platform" className="landing-platform" aria-labelledby="platform-title"><div className="landing-section-inner">
        <div className="landing-section-heading"><h2 id="platform-title">The whole school, connected.</h2><p>From the first register to a finished report, the work stays linked to the learner it supports.</p></div>
        <div className="landing-work-list">{work.map(([title, detail]) => <article key={title}><h3>{title}</h3><p>{detail}</p></article>)}</div>
        <p className="landing-platform-note">Role-based access gives each person the school information they need.</p>
      </div></section>

      <section className="landing-people" aria-labelledby="people-title"><div className="landing-section-inner landing-people-grid">
        <div><h2 id="people-title">A clearer next step for every person.</h2><p>One school platform, shaped around the different work of learning, caring and teaching.</p></div>
        <div className="landing-people-list"><div><strong>Students</strong><p>Find classwork, resources, assessments and feedback.</p></div><div><strong>Families</strong><p>Follow linked learners' attendance, progress, fees and school updates.</p></div><div><strong>Educators</strong><p>Plan lessons, mark work and see where support is needed.</p></div></div>
      </div></section>

      <section id="learning-quest" className="landing-quest" aria-labelledby="quest-title"><div className="landing-section-inner landing-quest-grid">
        <div className="landing-quest-art"><span>Learn<br />as you go.</span><img src="/games/word-connect/pip-study.png" alt="Pip reading a book" width="1188" height="1259" loading="lazy" /></div>
        <div className="landing-quest-copy"><h2 id="quest-title">Learning has room to play.</h2><p>Learning Quest lets people browse published courses and practise with short lessons, word games and guided challenges. A separate learner account saves public learning progress.</p><Link to="/language-quest" className="landing-button landing-button-primary">Explore Learning Quest<ArrowRight size={18} /></Link></div>
      </div></section>

      <section id="whats-new" className="landing-updates" aria-labelledby="updates-title"><div className="landing-section-inner landing-updates-grid">
        <div><h2 id="updates-title">What’s new at MRLC LMS.</h2><p>Recent work in the school platform, with the newest changes first.</p></div>
        <div className="landing-update-list">{updates.map(([date, title, detail]) => <article key={title}><time>{date}</time><div><h3>{title}</h3><p>{detail}</p></div></article>)}</div>
      </div></section>

      <section id="about" className="landing-about" aria-labelledby="about-title"><div className="landing-section-inner landing-about-grid"><h2 id="about-title">A school before a system.</h2><div><p>Mon Refugee Learning Centre is a GED school serving refugee learners in Malaysia. MRLC LMS supports the people and daily work behind that mission, with learning, dignity and opportunity at its centre.</p><span>Mon Refugee Learning Centre · Malaysia</span></div></div></section>

      <section className="landing-close" aria-labelledby="close-title"><div className="landing-section-inner landing-close-grid"><div><h2 id="close-title">Ready for the school day?</h2><p>Open your MRLC workspace, or revisit the school behind it.</p></div><div><Link to={portalHref} className="landing-button landing-button-gold">{portalLabel}<ArrowRight size={18} /></Link><a href="#about" className="landing-close-link">About MRLC <ArrowRight size={17} /></a></div></div></section>
    </main>
    <footer className="landing-footer"><div className="landing-section-inner"><PublicBrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} /><p>Education · Dignity · Opportunity</p></div></footer>
  </div>;
}
