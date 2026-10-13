import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowRight, Check, Clock3, ExternalLink, HeartPulse, ShieldAlert, WifiOff } from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { apiGet, apiSend } from '../lib/api';
import PublicBrandMark from '../components/PublicBrandMark';
import './focus-app.css';

type FocusSession = {
  id: string;
  endsAt: string;
  status: 'ACTIVE' | 'RELEASED' | 'COMPLETED';
  releaseRequestedAt: string | null;
};

function useFocusManifest() {
  useEffect(() => {
    const manifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const appleTitle = document.head.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    const previousManifest = manifest?.getAttribute('href');
    const previousTitle = appleTitle?.content;
    if (manifest) manifest.href = '/focus.webmanifest';
    if (appleTitle) appleTitle.content = 'MRLC Focus';
    return () => {
      if (manifest && previousManifest) manifest.href = previousManifest;
      if (appleTitle && previousTitle) appleTitle.content = previousTitle;
    };
  }, []);
}

function timeLeft(endsAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function FocusApp() {
  useFocusManifest();
  const location = useLocation();
  const { user, isLoading, isSessionVerified, retrySessionValidation } = useAuth();
  const { schoolProfile, brandingSettings } = useSettings();
  const eligible = user?.role === 'STUDENT' && !user.isExternalLearner && !user.mustChangePassword && isSessionVerified;
  const [session, setSession] = useState<FocusSession | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const activeUserId = useRef(user?.id);
  activeUserId.current = user?.id;
  const schoolName = schoolProfile.name || 'Mon Refugee Learning Centre';
  const active = session?.status === 'ACTIVE' && new Date(session.endsAt).getTime() > now;

  const load = useCallback(async () => {
    const requestedFor = user?.id;
    try {
      const next = await apiGet<FocusSession | null>('/api/focus/session');
      if (activeUserId.current !== requestedFor) return;
      setSession(next);
      setError('');
    } catch {
      if (activeUserId.current !== requestedFor) return;
      setError('Cannot reach the school server. Reconnect to see the current session.');
    }
  }, [user?.id]);

  useEffect(() => {
    if (!eligible) { setSession(null); setError(''); return; }
    setSession(null);
    setError('');
    void load();
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    const poll = window.setInterval(() => void load(), 15_000);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(clock); window.clearInterval(poll); };
  }, [eligible, user?.id, load]);

  const requestRelease = async () => {
    setBusy(true);
    try {
      setSession(await apiSend<FocusSession>('/api/focus/release-request', 'POST'));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request release. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="focus-app">
    <a className="focus-skip" href="#focus-main">Skip to focus session</a>
    <header className="focus-header">
      <Link to="/" aria-label={`${schoolName} home`}><PublicBrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} /></Link>
      <span className="focus-beta">Focus beta</span>
    </header>

    <main id="focus-main" className="focus-main">
      <div className="focus-eyebrow"><HeartPulse size={16} aria-hidden="true" /> Student focus companion</div>
      <h1>Make space for learning.</h1>
      <p className="focus-lede">Keep the school LMS open during your assigned session. Your teacher can see when this app loses focus and can respond to a release request.</p>

      <section className="focus-session-card" aria-label="Focus session status">
        {isLoading ? <><p className="focus-card-label">Checking account</p><h2>Just a moment…</h2><p>We are restoring your school session.</p></>
          : !user ? <><p className="focus-card-label">Start here</p><h2>Sign in to focus.</h2><p>Use your school student account to begin or resume your assigned session.</p><Link className="focus-primary" to="/login" state={{ from: location }}>Sign in to MRLC <ArrowRight size={18} aria-hidden="true" /></Link></>
          : user.mustChangePassword ? <><p className="focus-card-label">Account step required</p><h2>Change your password first.</h2><p>Your focus session will be available after your school password is updated.</p><Link className="focus-primary" to="/change-password">Change password <ArrowRight size={18} aria-hidden="true" /></Link></>
          : user.role !== 'STUDENT' || user.isExternalLearner ? <><p className="focus-card-label">School students only</p><h2>This companion is for student accounts.</h2><p>Teachers and administrators can follow sessions from Focus Monitor.</p><Link className="focus-primary" to="/dashboard">Open school dashboard <ArrowRight size={18} aria-hidden="true" /></Link></>
          : !isSessionVerified ? <><p className="focus-card-label">Connection needed</p><h2>Verify your session.</h2><p>Reconnect so the school can confirm your account and focus status.</p><button className="focus-primary" type="button" onClick={retrySessionValidation}>Retry verification <ArrowRight size={18} aria-hidden="true" /></button></>
          : active ? <>
            <p className="focus-card-label"><span className="focus-live-dot" /> Assigned session active</p>
            <h2 className="focus-timer" aria-label={`${timeLeft(session.endsAt, now)} remaining`}>{timeLeft(session.endsAt, now)}</h2>
            <p>Time remaining. Keep learning in the LMS; your teacher can adjust the end time.</p>
            <div className="focus-card-actions"><Link className="focus-primary" to="/student/dashboard">Open learning dashboard <ArrowRight size={18} aria-hidden="true" /></Link><button className="focus-secondary" type="button" disabled={busy || Boolean(session.releaseRequestedAt)} onClick={() => void requestRelease()}>{session.releaseRequestedAt ? 'Release requested' : busy ? 'Sending request…' : 'Request release'}</button></div>
            {session.releaseRequestedAt && <p className="focus-confirm"><Check size={16} aria-hidden="true" /> Your teacher has been notified. Stay in the LMS while you wait.</p>}
          </> : session ? <><p className="focus-card-label">Session ended</p><h2>You're finished for now.</h2><p>Your teacher released the session or its assigned time ended.</p><Link className="focus-primary" to="/student/dashboard">Open learning dashboard <ArrowRight size={18} aria-hidden="true" /></Link></>
          : <><p className="focus-card-label">Preparing session</p><h2>Checking your assignment.</h2><p>Your school student session should appear shortly. Keep this page open.</p><button className="focus-secondary" type="button" onClick={() => void load()}>Check again</button></>}
        {error && <p role="alert" className="focus-error"><WifiOff size={17} aria-hidden="true" /> {error}</p>}
      </section>

      <div className="focus-info-grid">
        <section className="focus-info-card"><Clock3 size={21} aria-hidden="true" /><h2>Install on your phone</h2><p>On iPhone or iPad, open this page in Safari and choose <strong>Share → Add to Home Screen</strong>. On Android, use your browser's <strong>Install app</strong> or <strong>Add to Home screen</strong> menu. Open the new icon and sign in there.</p></section>
        <section className="focus-info-card"><ShieldAlert size={21} aria-hidden="true" /><h2>Your device stays yours</h2><p>This beta reports focus and connection status. It does not lock your phone, block other apps, or stop you from leaving. A missing connection may appear as a warning to staff.</p></section>
      </div>
      <p className="focus-footnote">For optional device pinning, ask a parent or guardian to configure iOS Guided Access or Android screen pinning. Those settings are controlled on the device, not by MRLC teacher release. <Link to="/kiosk-downloads">Desktop kiosk downloads <ExternalLink size={14} aria-hidden="true" /></Link></p>
    </main>
  </div>;
}
