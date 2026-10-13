import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, Download, ExternalLink, Laptop, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../components/theme-provider';
import PublicBrandMark from '../components/PublicBrandMark';
import { useSettings } from '../providers/SettingsProvider';
import './landing.css';
import './kiosk-downloads.css';

const releaseUrl = 'https://github.com/TaoMonLae/mrlc-lms/releases/tag/kiosk-v0.2.0-beta.1';
const downloadBase = 'https://github.com/TaoMonLae/mrlc-lms/releases/download/kiosk-v0.2.0-beta.1';

const installers = [
  {
    platform: 'Windows',
    device: 'Windows 10 or 11 · x64',
    format: 'EXE installer',
    file: 'MRLC-LMS-Kiosk-0.2.0-beta.1-win-x64.exe',
    icon: Monitor,
  },
  {
    platform: 'Mac · Apple Silicon',
    device: 'M1, M2, M3, M4 or newer',
    format: 'DMG installer',
    file: 'MRLC-LMS-Kiosk-0.2.0-beta.1-mac-arm64.dmg',
    icon: Laptop,
  },
  {
    platform: 'Mac · Intel',
    device: 'Mac with an Intel processor',
    format: 'DMG installer',
    file: 'MRLC-LMS-Kiosk-0.2.0-beta.1-mac-x64.dmg',
    icon: Laptop,
  },
] as const;

export default function KioskDownloads() {
  const { theme, setTheme } = useTheme();
  const { schoolProfile, brandingSettings } = useSettings();
  const schoolName = schoolProfile.name || 'Mon Refugee Learning Centre';
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return <div className="landing kiosk-downloads">
    <a className="landing-skip" href="#main-content">Skip to content</a>
    <header className="landing-header">
      <div className="landing-header-inner kiosk-header-inner">
        <Link to="/" className="landing-home" aria-label={schoolName + ' home'}><PublicBrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} /></Link>
        <div className="kiosk-header-actions">
          <Link to="/" className="kiosk-back"><ArrowLeft size={17} aria-hidden="true" /> School home</Link>
          <button className="landing-theme" type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Use light theme' : 'Use dark theme'}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>
    </header>

    <main id="main-content">
      <section className="kiosk-intro" aria-labelledby="kiosk-title">
        <div className="landing-section-inner kiosk-intro-grid">
          <div>
            <h1 id="kiosk-title">A focused school session, on this computer.</h1>
            <p>Install the MRLC Kiosk companion on a Windows or Mac computer. It opens the school LMS, then enters full-screen kiosk mode when a student’s assigned focus session begins.</p>
            <a className="kiosk-intro-link" href="#installers">Choose your installer <ArrowRight size={19} aria-hidden="true" /></a>
          </div>
          <aside className="kiosk-pilot-note" aria-label="Beta release information">
            <span className="kiosk-status">Unsigned beta</span>
            <h2>For supervised testing with school staff.</h2>
            <p>These beta installers are unsigned and are not the signed school release. Windows SmartScreen or macOS Gatekeeper may warn or block installation. Ask school IT before installing on a managed device.</p>
            <div><span>Beta release</span><strong>Version 0.2.0-beta.1</strong></div>
          </aside>
        </div>
      </section>

      <section id="installers" className="kiosk-installers" aria-labelledby="installers-title">
        <div className="landing-section-inner">
          <div className="kiosk-section-heading"><h2 id="installers-title">Choose your computer.</h2><p>Pick the operating system and processor on the device where the student will work.</p></div>
          <div className="kiosk-installer-list">
            {installers.map(({ platform, device, format, file, icon: Icon }) => <article className="kiosk-installer" key={platform}>
              <div className="kiosk-installer-icon"><Icon size={27} strokeWidth={1.7} aria-hidden="true" /></div>
              <div className="kiosk-installer-copy"><h3>{platform}</h3><p>{device}</p><small>{format}</small></div>
              <a href={`${downloadBase}/${file}`} className="landing-button landing-button-primary kiosk-download-button" aria-label={`Download ${platform} beta installer from GitHub Releases`}>
                <Download size={19} aria-hidden="true" />Download beta
              </a>
            </article>)}
          </div>
          <p className="kiosk-download-help">These files are hosted on GitHub Releases. <a href={`${downloadBase}/SHA256SUMS.txt`}>Check the SHA-256 file <ExternalLink size={14} aria-hidden="true" /></a> before installing. The beta does not update itself; install a newer version when school IT provides one.</p>
        </div>
      </section>

      <section className="kiosk-setup" aria-labelledby="setup-title"><div className="landing-section-inner kiosk-setup-grid">
        <div><h2 id="setup-title">From installer to session.</h2><p>Keep a teacher or administrator available during the beta so they can monitor and release the session when needed.</p></div>
        <ol>
          <li><span>1</span><div><h3>Install the companion</h3><p>Open the EXE on Windows, or open the DMG and drag the app into Applications on Mac.</p></div></li>
          <li><span>2</span><div><h3>Sign in as a student</h3><p>Launch MRLC LMS Kiosk and use a school student account. The window can close normally before a focus session starts.</p></div></li>
          <li><span>3</span><div><h3>Begin the assigned session</h3><p>When the LMS confirms an active focus session, the app enters kiosk mode. It unlocks after the server confirms staff release or that time has ended. If the connection drops while locked, it stays locked and retries; a device administrator can stop it through operating system controls if staff cannot reach the monitor.</p></div></li>
        </ol>
      </div></section>

      <section className="kiosk-other" aria-labelledby="other-title"><div className="landing-section-inner kiosk-other-grid">
        <div><h2 id="other-title">Using a phone, tablet or Chromebook?</h2><p>There is no desktop kiosk installer for iOS, Android or ChromeOS. Use the MRLC website or installed web app for focus reporting. Those devices can report focus and full-screen changes, but this companion cannot lock them.</p></div>
        <Link to="/login" className="landing-button landing-button-secondary">Open school sign-in <ArrowRight size={18} aria-hidden="true" /></Link>
      </div></section>
    </main>

    <footer className="landing-footer"><div className="landing-section-inner kiosk-footer"><PublicBrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} /><a href={releaseUrl} target="_blank" rel="noopener noreferrer">Beta release notes <ExternalLink size={14} aria-hidden="true" /></a></div></footer>
  </div>;
}
