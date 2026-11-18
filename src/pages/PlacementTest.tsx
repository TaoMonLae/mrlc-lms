import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Loader2, Mail, Moon, PencilLine, Sun, TimerOff } from 'lucide-react';
import { useTheme } from '../components/theme-provider';
import PublicBrandMark from '../components/PublicBrandMark';
import { useSettings } from '../providers/SettingsProvider';
import './landing.css';
import './placement-test.css';

interface PublicOption { value: number; label: string }
interface PublicQuestion { id: string; passageId?: string; prompt: string; options: PublicOption[] }
interface PublicSection { id: string; title: string; shortTitle: string; description: string; questions: PublicQuestion[] }
interface Passage { id: string; title: string; body: string[] }
interface PublicForm {
  version: string;
  form: string;
  timeLimitSeconds: number;
  sections: PublicSection[];
  passages: Passage[];
  writing: { title: string; prompt: string; help: string; maxLength: number };
}
interface Overview {
  version: string;
  isOpen: boolean;
  closedMessage: string | null;
  timeLimitMinutes: number;
  questionCount: number;
  sections: { id: string; title: string; questionCount: number }[];
  highestGradeOptions: { value: string; label: string }[];
}

interface Details { fullName: string; contactNumber: string; email: string; emailConfirm: string; age: string; highestGrade: string; consent: boolean; website: string }

type Step = 'intro' | 'test' | 'review' | 'done';

interface Draft {
  details: Details;
  test: PublicForm;
  token: string;
  deadline: number;
  answers: Record<string, number>;
  writing: string;
  step: Step;
  sectionIndex: number;
}

const DRAFT_KEY = 'mrlc-placement-test-attempt';
const FORMS_KEY = 'mrlc-placement-test-forms';
const emptyDetails: Details = { fullName: '', contactNumber: '', email: '', emailConfirm: '', age: '', highestGrade: '', consent: false, website: '' };
const phonePattern = /^[+0-9][0-9\s\-()]{6,22}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function storage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function groupByPassage(questions: PublicQuestion[]) {
  const groups: { passageId?: string; questions: PublicQuestion[] }[] = [];
  for (const question of questions) {
    const last = groups.at(-1);
    if (last && last.passageId === question.passageId) last.questions.push(question);
    else groups.push({ passageId: question.passageId, questions: [question] });
  }
  return groups;
}

export default function PlacementTest() {
  const { resolvedTheme, setTheme } = useTheme();
  const { schoolProfile, brandingSettings } = useSettings();
  const schoolName = schoolProfile.name || 'Mon Refugee Learning Centre';
  const isDark = resolvedTheme === 'dark';
  const saved = useMemo(() => storage<Draft | null>(DRAFT_KEY, null), []);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState('');
  const [details, setDetails] = useState<Details>(saved?.details ?? emptyDetails);
  const [test, setTest] = useState<PublicForm | null>(saved?.test ?? null);
  const [token, setToken] = useState(saved?.token ?? '');
  const [deadline, setDeadline] = useState<number | null>(saved?.deadline ?? null);
  const [answers, setAnswers] = useState<Record<string, number>>(saved?.answers ?? {});
  const [writing, setWriting] = useState(saved?.writing ?? '');
  const [step, setStep] = useState<Step>(saved?.step && saved.step !== 'done' ? saved.step : 'intro');
  const [sectionIndex, setSectionIndex] = useState(saved?.sectionIndex ?? 0);
  const [detailErrors, setDetailErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const announced = useRef(new Set<number>());
  const autoSent = useRef(false);

  const loadOverview = useCallback(async () => {
    setLoadError('');
    try {
      const res = await fetch('/api/public/placement-test');
      if (!res.ok) throw new Error();
      setOverview(await res.json());
    } catch {
      setLoadError('The placement test could not load. Check your internet connection and try again.');
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (!test || !token || !deadline || step === 'done') return;
    store(DRAFT_KEY, { details: { ...details, website: '' }, test, token, deadline, answers, writing, step, sectionIndex } satisfies Draft);
  }, [details, test, token, deadline, answers, writing, step, sectionIndex]);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step, sectionIndex]);

  const timing = deadline !== null && (step === 'test' || step === 'review');
  useEffect(() => {
    if (!timing) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timing]);

  const remaining = deadline ? (deadline - now) / 1000 : Infinity;
  const timeUp = deadline !== null && remaining <= 0 && step !== 'done';
  const lowTime = remaining <= 10 * 60;

  useEffect(() => {
    if (!timing) return;
    for (const minutes of [30, 10, 5, 1]) {
      if (remaining <= minutes * 60 && remaining > minutes * 60 - 5 && !announced.current.has(minutes)) {
        announced.current.add(minutes);
        setAnnouncement(`${minutes === 1 ? 'One minute' : `${minutes} minutes`} left.`);
      }
    }
  }, [remaining, timing]);

  const totalQuestions = test?.sections.reduce((sum, s) => sum + s.questions.length, 0) ?? overview?.questionCount ?? 0;
  const answeredCount = test ? test.sections.reduce((sum, s) => sum + s.questions.filter(q => answers[q.id] !== undefined).length, 0) : 0;
  const passages = useMemo(() => new Map((test?.passages ?? []).map(p => [p.id, p])), [test]);
  const stageCount = (test?.sections.length ?? 4) + 1;
  const onWriting = test ? sectionIndex >= test.sections.length : false;
  const minutes = overview?.timeLimitMinutes ?? (test ? test.timeLimitSeconds / 60 : 90);
  const inProgress = Boolean(test && token && deadline);

  const validateDetails = () => {
    const errors: Partial<Record<keyof Details, string>> = {};
    if (details.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
    if (!phonePattern.test(details.contactNumber.trim())) errors.contactNumber = 'Enter a phone number using numbers only, for example 012-345 6789.';
    if (!emailPattern.test(details.email.trim())) errors.email = 'Enter your email address, for example name@gmail.com.';
    else if (details.email.trim().toLowerCase() !== details.emailConfirm.trim().toLowerCase()) errors.emailConfirm = 'The two email addresses are different. Check them carefully.';
    if (details.age.trim() && (!/^\d{1,2}$/.test(details.age.trim()) || Number(details.age) < 10 || Number(details.age) > 70)) errors.age = 'Enter your age in numbers, between 10 and 70.';
    if (!details.consent) errors.consent = 'Please tick this box to continue.';
    setDetailErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const begin = async (event: FormEvent) => {
    event.preventDefault();
    if (inProgress) {
      setStep('test');
      return;
    }
    if (!validateDetails()) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setStarting(true);
    setStartError('');
    try {
      const res = await fetch('/api/public/placement-test/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: details.fullName.trim(), contactNumber: details.contactNumber.trim(), email: details.email.trim(), previousForms: storage<string[]>(FORMS_KEY, []) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The test could not start.');
      const offset = Date.now() - data.serverNow;
      setTest(data.test);
      setToken(data.token);
      setDeadline(data.startedAt + data.timeLimitSeconds * 1000 + offset);
      setAnswers({});
      setWriting('');
      setSectionIndex(0);
      announced.current.clear();
      autoSent.current = false;
      setNow(Date.now());
      setStep('test');
    } catch (error: any) {
      setStartError(error?.message && error.message !== 'Failed to fetch' ? error.message : 'The test could not start. Check your internet connection and try again.');
    } finally {
      setStarting(false);
    }
  };

  const choose = (questionId: string, value: number) => {
    if (timeUp) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submit = useCallback(async () => {
    if (!test || !token) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/public/placement-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          fullName: details.fullName.trim(),
          contactNumber: details.contactNumber.trim(),
          email: details.email.trim(),
          age: details.age.trim(),
          highestGrade: details.highestGrade,
          answers,
          writingSample: writing,
          version: test.version,
          consent: details.consent,
          website: details.website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Your test could not be sent.');
      setReference(data.referenceNo);
      store(FORMS_KEY, [...storage<string[]>(FORMS_KEY, []), test.form].slice(-6));
      store(DRAFT_KEY, null);
      setStep('done');
    } catch (error: any) {
      setStep('review');
      setSubmitError(error?.message && error.message !== 'Failed to fetch' ? error.message : 'Your test could not be sent. Your answers are saved on this device. Check your internet connection and press Send again.');
    } finally {
      setSubmitting(false);
    }
  }, [test, token, details, answers, writing]);

  useEffect(() => {
    if (!timeUp || autoSent.current) return;
    autoSent.current = true;
    setAnnouncement('Time is up. Your answers are being sent.');
    void submit();
  }, [timeUp, step, submit]);

  const discardAttempt = () => {
    if (!window.confirm('Start again? The answers on this device will be removed and the timer will restart with a different set of questions.')) return;
    store(DRAFT_KEY, null);
    setTest(null);
    setToken('');
    setDeadline(null);
    setAnswers({});
    setWriting('');
    setSectionIndex(0);
    setStep('intro');
  };

  const field = (name: keyof Details, label: string, options: { type?: string; required?: boolean; hint?: string; autoComplete?: string; inputMode?: 'tel' | 'email' | 'numeric' | 'text'; disabled?: boolean } = {}) => (
    <div className="pt-field">
      <label htmlFor={`pt-${name}`}>{label}{options.required ? <span className="pt-required"> required</span> : <span className="pt-optional"> optional</span>}</label>
      {options.hint && <p id={`pt-${name}-hint`} className="pt-hint">{options.hint}</p>}
      <input
        id={`pt-${name}`}
        type={options.type ?? 'text'}
        value={details[name] as string}
        onChange={event => setDetails(prev => ({ ...prev, [name]: event.target.value }))}
        autoComplete={options.autoComplete}
        inputMode={options.inputMode}
        required={options.required}
        disabled={options.disabled}
        spellCheck={false}
        aria-invalid={detailErrors[name] ? 'true' : undefined}
        aria-describedby={[options.hint ? `pt-${name}-hint` : '', detailErrors[name] ? `pt-${name}-error` : ''].filter(Boolean).join(' ') || undefined}
      />
      {detailErrors[name] && <p id={`pt-${name}-error`} className="pt-error">{detailErrors[name]}</p>}
    </div>
  );

  const section = test && !onWriting ? test.sections[sectionIndex] : null;
  const timer = timing && <div className={`pt-timer${lowTime ? ' pt-timer-low' : ''}${timeUp ? ' pt-timer-up' : ''}`} role="timer" aria-label={`Time left ${clock(remaining)}`}>
    {timeUp ? <TimerOff size={18} aria-hidden="true" /> : <Clock size={18} aria-hidden="true" />}
    <span className="pt-timer-label">{timeUp ? 'Time is up' : 'Time left'}</span>
    <strong>{clock(remaining)}</strong>
  </div>;

  return <div className="landing placement-test">
    <a className="landing-skip" href="#main-content">Skip to content</a>
    <p className="sr-only" aria-live="assertive">{announcement}</p>
    <header className="landing-header">
      <div className="landing-header-inner pt-header-inner">
        <Link to="/" className="landing-home" aria-label={schoolName + ' home'}><PublicBrandMark logoUrl={brandingSettings.logoUrl} schoolName={schoolName} /></Link>
        <div className="pt-header-actions">
          {timer}
          {!timing && <Link to="/" className="pt-back"><ArrowLeft size={17} aria-hidden="true" /> School home</Link>}
          <button className="landing-theme" type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Use light theme' : 'Use dark theme'}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        </div>
      </div>
      {test && (step === 'test' || step === 'review') && <div className="pt-progress" aria-label="Test progress">
        <div className="pt-progress-inner">
          <ol>
            {test.sections.map((s, i) => {
              const done = s.questions.filter(q => answers[q.id] !== undefined).length;
              return <li key={s.id}><button type="button" aria-current={step === 'test' && sectionIndex === i ? 'step' : undefined} onClick={() => { setStep('test'); setSectionIndex(i); }}><span>{s.shortTitle}</span><small>{done}/{s.questions.length}</small></button></li>;
            })}
            <li><button type="button" aria-current={step === 'test' && onWriting ? 'step' : undefined} onClick={() => { setStep('test'); setSectionIndex(test.sections.length); }}><span>Writing</span><small>{wordCount(writing)} words</small></button></li>
          </ol>
          <p className="pt-progress-count"><strong>{answeredCount}</strong> of {totalQuestions} answered</p>
        </div>
        <div className="pt-progress-bar" aria-hidden="true"><span style={{ width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%` }} /></div>
      </div>}
    </header>

    <main id="main-content" className="pt-main">
      {!overview && !loadError && step === 'intro' && <div className="pt-status" role="status"><Loader2 className="pt-spin" aria-hidden="true" /> Loading the placement test…</div>}
      {loadError && step === 'intro' && <div className="pt-status pt-status-error" role="alert"><AlertTriangle aria-hidden="true" /><p>{loadError}</p><button type="button" className="pt-button pt-button-secondary" onClick={() => void loadOverview()}>Try again</button></div>}

      {overview && step === 'intro' && !overview.isOpen && !inProgress && <div className="pt-section pt-done">
        <div className="pt-card pt-done-card">
          <TimerOff className="pt-done-icon pt-closed-icon" aria-hidden="true" />
          <h1 ref={headingRef} tabIndex={-1}>The placement test is closed</h1>
          <p>{overview.closedMessage || 'New students cannot start the test right now. Please contact the school office.'}</p>
          <Link to="/" className="pt-button pt-button-secondary">Back to school home<ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </div>}

      {overview && step === 'intro' && (overview.isOpen || inProgress) && <div className="pt-intro">
        <section className="pt-intro-copy" aria-labelledby="pt-title">
          <h1 id="pt-title" ref={headingRef} tabIndex={-1}>Placement test for new students</h1>
          <p className="pt-lead">This test helps our teachers choose the right class for you: the GED class, the Pre-GED class, or a foundation class. It is not a pass or fail exam.</p>
          <dl className="pt-facts">
            <div><dt><Clock size={18} aria-hidden="true" /> Time</dt><dd><strong>{minutes} minutes.</strong> The timer starts when you press Start and does not stop. When time runs out, your answers are sent automatically.</dd></div>
            <div><dt><Check size={18} aria-hidden="true" /> Questions</dt><dd>{overview.questionCount} multiple-choice questions: {overview.sections.map(s => `${s.title} (${s.questionCount})`).join(', ')}.</dd></div>
            <div><dt><PencilLine size={18} aria-hidden="true" /> Writing</dt><dd>6 to 10 sentences about yourself, in English.</dd></div>
            <div><dt><Mail size={18} aria-hidden="true" /> Result</dt><dd>We email your result and class placement after a teacher reviews your test.</dd></div>
          </dl>
          <h2>Before you start</h2>
          <ul className="pt-rules">
            <li>Find a quiet place and about {minutes} minutes when you will not be interrupted. Have paper and a pencil for mathematics.</li>
            <li>Work alone. Do not use a calculator, a dictionary, a translator or another person’s help.</li>
            <li>The questions go from easy to hard in each subject. Hard questions are normal. Answer what you can.</li>
            <li>If you do not know an answer, leave it blank. Please do not guess every answer.</li>
            <li>Your answers are saved on this device as you work. If the internet stops, open this page again on the same device. The timer keeps running.</li>
          </ul>
        </section>
        <form className="pt-card pt-details" onSubmit={event => void begin(event)} noValidate aria-labelledby="pt-details-title">
          <h2 id="pt-details-title">{inProgress ? 'Your test is in progress' : 'Your details'}</h2>
          {inProgress
            ? <p className="pt-hint">You started this test on this device. The timer is still running.</p>
            : <p className="pt-hint">You do not need an account. We use these details to send your result and contact you.</p>}
          {field('fullName', 'Full name', { required: true, autoComplete: 'name', hint: 'Write your name as it appears on your UNHCR card or other ID.', disabled: inProgress })}
          {field('contactNumber', 'Phone number', { required: true, type: 'tel', autoComplete: 'tel', inputMode: 'tel', hint: 'A number we can call or message on WhatsApp.', disabled: inProgress })}
          {field('email', 'Email', { required: true, type: 'email', autoComplete: 'email', inputMode: 'email', hint: 'We will send your result to this email.', disabled: inProgress })}
          {!inProgress && field('emailConfirm', 'Type your email again', { required: true, type: 'email', autoComplete: 'off', inputMode: 'email' })}
          <div className="pt-field-row">
            {field('age', 'Age', { inputMode: 'numeric', disabled: inProgress })}
            <div className="pt-field">
              <label htmlFor="pt-highestGrade">Last school grade finished<span className="pt-optional"> optional</span></label>
              <select id="pt-highestGrade" value={details.highestGrade} disabled={inProgress} onChange={event => setDetails(prev => ({ ...prev, highestGrade: event.target.value }))}>
                <option value="">Choose one</option>
                {overview.highestGradeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="pt-honeypot" aria-hidden="true">
            <label htmlFor="pt-website">Leave this empty</label>
            <input id="pt-website" tabIndex={-1} autoComplete="off" value={details.website} onChange={event => setDetails(prev => ({ ...prev, website: event.target.value }))} />
          </div>
          {!inProgress && <>
            <div className="pt-consent">
              <input id="pt-consent" type="checkbox" checked={details.consent} onChange={event => setDetails(prev => ({ ...prev, consent: event.target.checked }))} aria-invalid={detailErrors.consent ? 'true' : undefined} aria-describedby={detailErrors.consent ? 'pt-consent-error' : undefined} />
              <label htmlFor="pt-consent">I agree that MRLC teachers and staff may see my answers and contact me by phone or email about my class placement.</label>
            </div>
            {detailErrors.consent && <p id="pt-consent-error" className="pt-error">{detailErrors.consent}</p>}
          </>}
          {startError && <p className="pt-error pt-submit-error" role="alert"><AlertTriangle size={18} aria-hidden="true" />{startError}</p>}
          <button type="submit" className="pt-button pt-button-primary pt-button-wide" disabled={starting}>
            {starting ? <><Loader2 size={18} className="pt-spin" aria-hidden="true" />Starting…</> : inProgress ? <>Go back to the test<ArrowRight size={18} aria-hidden="true" /></> : <>Start the {minutes}-minute test<ArrowRight size={18} aria-hidden="true" /></>}
          </button>
          {!inProgress && <p className="pt-hint pt-start-note">The timer starts as soon as you press Start.</p>}
          {inProgress && <button type="button" className="pt-link-button" onClick={discardAttempt}>This is not me. Start a new test.</button>}
        </form>
      </div>}

      {test && step === 'test' && section && <div className="pt-section">
        <div className="pt-section-head">
          <h1 ref={headingRef} tabIndex={-1}>{section.title} <span className="pt-part">Part {sectionIndex + 1} of {stageCount}</span></h1>
          <p>{section.description}</p>
        </div>
        {sectionIndex === 0 && <p className="pt-notice"><Clock size={18} aria-hidden="true" />You can move between parts at any time using the tabs at the top. If the timer reaches zero, your answers are sent automatically.</p>}
        {timeUp && <p className="pt-notice pt-notice-warning" role="status"><TimerOff size={18} aria-hidden="true" />Time is up. You can no longer change answers.</p>}
        {groupByPassage(section.questions).map((group, groupIndex) => {
          const passage = group.passageId ? passages.get(group.passageId) : undefined;
          return <div key={`${section.id}-${groupIndex}`} className={passage ? 'pt-group pt-group-passage' : 'pt-group'}>
            {passage && <aside className="pt-passage" aria-label={`Passage: ${passage.title}`}>
              <h2><span className="sr-only">Read this passage: </span>{passage.title}</h2>
              {passage.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            </aside>}
            <div className="pt-questions">
              {group.questions.map(question => {
                const number = section.questions.indexOf(question) + 1;
                return <fieldset key={question.id} className="pt-question" disabled={timeUp}>
                  <legend><span className="pt-qnum">{number}</span><span className="pt-prompt">{question.prompt}</span></legend>
                  <div className="pt-options">
                    {question.options.map((option, i) => {
                      const id = `${question.id}-${option.value}`;
                      return <label key={id} htmlFor={id} className="pt-option">
                        <input id={id} type="radio" name={question.id} checked={answers[question.id] === option.value} onChange={() => choose(question.id, option.value)} />
                        <span className="pt-option-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                        <span className="pt-option-text">{option.label}</span>
                      </label>;
                    })}
                  </div>
                </fieldset>;
              })}
            </div>
          </div>;
        })}
        <nav className="pt-step-nav" aria-label="Test sections">
          <button type="button" className="pt-button pt-button-secondary" onClick={() => sectionIndex === 0 ? setStep('intro') : setSectionIndex(i => i - 1)}><ArrowLeft size={18} aria-hidden="true" />{sectionIndex === 0 ? 'Your details' : test.sections[sectionIndex - 1].shortTitle}</button>
          <button type="button" className="pt-button pt-button-primary" onClick={() => setSectionIndex(i => i + 1)}>{sectionIndex + 1 < test.sections.length ? test.sections[sectionIndex + 1].shortTitle : 'Writing'}<ArrowRight size={18} aria-hidden="true" /></button>
        </nav>
      </div>}

      {test && step === 'test' && onWriting && <div className="pt-section pt-writing">
        <div className="pt-section-head">
          <h1 ref={headingRef} tabIndex={-1}>{test.writing.title} <span className="pt-part">Part {stageCount} of {stageCount}</span></h1>
          <p>{test.writing.help}</p>
        </div>
        <div className="pt-card">
          <label htmlFor="pt-writing" className="pt-writing-prompt">{test.writing.prompt}</label>
          <textarea id="pt-writing" value={writing} maxLength={test.writing.maxLength} rows={12} disabled={timeUp} onChange={event => setWriting(event.target.value)} spellCheck={false} autoCorrect="off" autoCapitalize="sentences" aria-describedby="pt-writing-count" />
          <p id="pt-writing-count" className="pt-hint" aria-live="polite">{wordCount(writing)} words</p>
        </div>
        <nav className="pt-step-nav" aria-label="Test sections">
          <button type="button" className="pt-button pt-button-secondary" onClick={() => setSectionIndex(test.sections.length - 1)}><ArrowLeft size={18} aria-hidden="true" />{test.sections.at(-1)?.shortTitle}</button>
          <button type="button" className="pt-button pt-button-primary" onClick={() => setStep('review')}>Check and send<ArrowRight size={18} aria-hidden="true" /></button>
        </nav>
      </div>}

      {test && step === 'review' && <div className="pt-section pt-review">
        <div className="pt-section-head">
          <h1 ref={headingRef} tabIndex={-1}>{timeUp ? 'Time is up' : 'Check and send'}</h1>
          <p>{timeUp ? 'Your answers could not be sent automatically. Press Send to try again.' : 'After you send, you cannot change your answers.'}</p>
        </div>
        <div className="pt-card">
          <dl className="pt-review-person">
            <div><dt>Name</dt><dd>{details.fullName}</dd></div>
            <div><dt>Phone</dt><dd>{details.contactNumber}</dd></div>
            <div><dt>Email</dt><dd>{details.email}</dd></div>
          </dl>
          <ul className="pt-review-list">
            {test.sections.map((s, i) => {
              const blank = s.questions.length - s.questions.filter(q => answers[q.id] !== undefined).length;
              return <li key={s.id}>
                <span>{s.title}</span>
                <span className={blank ? 'pt-review-gap' : 'pt-review-ok'}>{blank ? `${blank} blank` : <><CheckCircle2 size={16} aria-hidden="true" /> All answered</>}</span>
                <button type="button" className="pt-link-button" onClick={() => { setStep('test'); setSectionIndex(i); }}>Open<span className="sr-only"> {s.title}</span></button>
              </li>;
            })}
            <li>
              <span>Writing</span>
              <span className={wordCount(writing) < 30 ? 'pt-review-gap' : 'pt-review-ok'}>{wordCount(writing) < 30 ? `${wordCount(writing)} words, please write a little more` : <><CheckCircle2 size={16} aria-hidden="true" /> {wordCount(writing)} words</>}</span>
              <button type="button" className="pt-link-button" onClick={() => { setStep('test'); setSectionIndex(test.sections.length); }}>Open<span className="sr-only"> writing</span></button>
            </li>
          </ul>
          {submitError && <p className="pt-error pt-submit-error" role="alert"><AlertTriangle size={18} aria-hidden="true" />{submitError}</p>}
          <div className="pt-step-nav pt-step-nav-flat">
            <button type="button" className="pt-button pt-button-secondary" onClick={() => { setStep('test'); setSectionIndex(test.sections.length); }}><ArrowLeft size={18} aria-hidden="true" />Back</button>
            <button type="button" className="pt-button pt-button-primary" onClick={() => void submit()} disabled={submitting}>{submitting ? <><Loader2 size={18} className="pt-spin" aria-hidden="true" />Sending…</> : <>Send my test<ArrowRight size={18} aria-hidden="true" /></>}</button>
          </div>
        </div>
      </div>}

      {step === 'done' && <div className="pt-section pt-done">
        <div className="pt-card pt-done-card">
          <CheckCircle2 className="pt-done-icon" aria-hidden="true" />
          <h1 ref={headingRef} tabIndex={-1}>Thank you. Your test was sent.</h1>
          <p>Please write down or take a photo of your reference number.</p>
          <p className="pt-reference"><span>Reference number</span><strong>{reference}</strong></p>
          <p>We sent a confirmation to <strong>{details.email}</strong>. If you do not see it, check your spam or junk folder.</p>
          <p>A teacher will review your test and email your result and class placement.</p>
          <Link to="/" className="pt-button pt-button-primary">Back to school home<ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </div>}
    </main>
  </div>;
}
