import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Clock, Flag, X } from 'lucide-react';
import './exam-paper.css';

/** `partial` is a short label (e.g. "1 of 4 placed") for a started but unfinished answer. */
export type PaperQuestion = { id: string; answered: boolean; flagged: boolean; points: number; partial?: string };
type ReviewFilter = 'all' | 'unanswered' | 'flagged';
type Props = {
  title: string; status: string; remaining: number | null; questions: PaperQuestion[]; index: number;
  prompt: ReactNode; passage?: ReactNode; imageUrl?: string | null; children: ReactNode;
  /** Identifies the passage text. The passage keeps its scroll position while this stays the same. */
  passageKey?: string;
  onNavigate: (index: number) => boolean | void | Promise<boolean | void>;
  onFlag: () => void; onSubmit: () => void; onClose?: () => void;
  theme?: string; busy?: boolean; answerDisabled?: boolean; preview?: boolean; tools?: ReactNode; notices?: ReactNode;
};

/** Shared presentation only: persistence and deadline authority stay in the live player. */
export default function ExamPaper(p: Props) {
  const [review, setReview] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [confirming, setConfirming] = useState(false);
  const [passageOpen, setPassageOpen] = useState(false);
  const [longPrompt, setLongPrompt] = useState(false);
  const progress = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLElement>(null);
  const root = useRef<HTMLElement>(null);
  const header = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const passageBox = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const lastPassageKey = useRef(p.passageKey);

  // The passage and question columns are sized so the header, progress bar,
  // columns and Previous/Next footer all fit on one screen. Their heights
  // change with the title length, notices and screen width.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const sync = () => {
      const style = root.current?.style;
      if (!style) return;
      const height = (el: Element | null) => el ? Math.round(el.getBoundingClientRect().height) : 0;
      style.setProperty('--ep-header-h', `${height(header.current)}px`);
      // Everything between the header and the columns (notices + progress bar).
      const layout = root.current?.querySelector('.ep-layout');
      const workspace = root.current?.querySelector('.ep-workspace');
      const above = layout && workspace ? Math.max(0, Math.round(layout.getBoundingClientRect().top - workspace.getBoundingClientRect().top)) : height(progress.current);
      style.setProperty('--ep-above-h', `${above}px`);
      style.setProperty('--ep-footer-h', `${height(footer.current) || 62}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    [header.current, progress.current, footer.current, root.current?.querySelector('.ep-notices')].forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [review]);

  // Long prompts (an essay assignment, a multi-part instruction) read better as
  // body text than as a large heading, and keep the answer box in view.
  useLayoutEffect(() => {
    setLongPrompt((heading.current?.textContent || '').trim().length > 160);
  }, [p.index, p.prompt, review]);

  // A new passage opens at its top; the same passage keeps the reader's place.
  useLayoutEffect(() => {
    if (lastPassageKey.current !== p.passageKey) {
      if (passageBox.current) passageBox.current.scrollTop = 0;
      setPassageOpen(false);
      lastPassageKey.current = p.passageKey;
    }
  }, [p.passageKey]);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (sheet.current) sheet.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
    // With a passage beside the question both columns scroll on their own, so
    // only bring the question into view when it sits below the passage (phones).
    heading.current?.scrollIntoView({ block: 'nearest' });
  }, [p.index, review]);

  useEffect(() => { if (!review) setConfirming(false); }, [review]);

  const answered = p.questions.filter(q => q.answered).length;
  const flagged = p.questions.filter(q => q.flagged).length;
  const unanswered = p.questions.length - answered;
  const q = p.questions[p.index];
  const navigate = async (index: number) => { if (await p.onNavigate(index) !== false) setReview(false); };
  const openReview = (next: ReviewFilter = 'all') => { setFilter(next); setReview(true); };
  const time = p.remaining === null ? 'Untimed' : `${String(Math.floor(p.remaining / 60)).padStart(2, '0')}:${String(p.remaining % 60).padStart(2, '0')}`;
  const timerClass = p.remaining === null ? '' : p.remaining <= 60 ? 'ep-timer-low ep-timer-critical' : p.remaining <= 300 ? 'ep-timer-low' : '';
  const statusOf = (item: PaperQuestion) => item.answered ? 'Answered' : item.partial ? `Partly answered (${item.partial})` : 'Unanswered';
  const reviewItems = p.questions.map((item, i) => ({ item, i })).filter(({ item }) =>
    filter === 'all' ? true : filter === 'flagged' ? item.flagged : !item.answered);
  const submit = () => { if (p.preview) { p.onSubmit(); return; } setConfirming(true); };

  return <section ref={root} className={`exam-paper ${p.theme === 'focus' ? 'ep-focus' : p.theme === 'colorful' ? 'ep-colorful' : ''}`} data-no-i18n>
    <header ref={header} className="ep-header">
      <div className="ep-title"><span className="ep-eyebrow">{p.preview ? 'Student preview' : 'Assessment'}</span><h1>{p.title}</h1><p role="status">{p.status}</p></div>
      <div className={`ep-timer ${timerClass}`} aria-label={`Time remaining: ${time}`}><Clock size={17} /><div><span>Time remaining</span><strong>{time}</strong></div></div>
      {p.onClose && <button className="ep-icon" onClick={p.onClose} aria-label="Close preview"><X size={20} /></button>}
    </header>
    <div className="ep-workspace">
      {p.notices && <div className="ep-notices">{p.notices}</div>}
      <div ref={progress} className="ep-progress"><span><strong>{answered}</strong> of {p.questions.length} answered</span><progress aria-label="Questions answered" max={p.questions.length || 1} value={answered} /><button disabled={p.busy} onClick={() => openReview()}>Review answers{flagged > 0 ? ` · ${flagged} flagged` : ''}</button></div>
      <div className={`ep-layout ${p.passage && !review ? 'ep-with-passage' : ''}`}>
        <aside className="ep-nav"><span className="ep-eyebrow">Questions</span><nav aria-label="Question navigation">{p.questions.map((item, i) => <button key={item.id} disabled={p.busy} onClick={() => void navigate(i)} aria-current={!review && p.index === i ? 'step' : undefined} aria-label={`Question ${i + 1}, ${statusOf(item).toLowerCase()}${item.flagged ? ', flagged' : ''}`} className={`${item.answered ? 'is-answered' : item.partial ? 'is-partial' : ''} ${item.flagged ? 'is-flagged' : ''}`}><span>{i + 1}</span>{item.flagged ? <Flag size={10} /> : item.answered ? <Check size={10} /> : null}</button>)}</nav><p className="ep-legend"><Check size={12} /> Answered <span className="ep-legend-partial" aria-hidden="true" /> Partly <Flag size={12} /> For review</p></aside>
        <div className="ep-document">
          {review ? <article className="ep-sheet ep-review"><span className="ep-eyebrow">Final review</span><h2 ref={heading} tabIndex={-1}>Review your answers</h2>
            <p>{answered} of {p.questions.length} answered · {unanswered} unanswered · {flagged} flagged for review.</p>
            <p>{p.preview ? 'This is a preview. Finishing will not submit an attempt.' : 'You can return to any question before submitting. After submission, your answers cannot be changed.'}</p>
            <div className="ep-review-filter" role="group" aria-label="Show questions">
              {([['all', `All (${p.questions.length})`], ['unanswered', `Unanswered (${unanswered})`], ['flagged', `Flagged (${flagged})`]] as [ReviewFilter, string][]).map(([key, label]) =>
                <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
            </div>
            <div className="ep-review-list">
              {reviewItems.length === 0 && <p className="ep-review-empty">{filter === 'flagged' ? 'No questions are flagged.' : 'Every question has an answer.'}</p>}
              {reviewItems.map(({ item, i }) => <button key={item.id} disabled={p.busy} onClick={() => void navigate(i)}><span>Question {i + 1}</span><span>{item.flagged && <Flag size={14} />}{statusOf(item)}<ArrowRight size={15} /></span></button>)}
            </div>
            {confirming ? <div className="ep-confirm" role="alertdialog" aria-labelledby="ep-confirm-title" aria-describedby="ep-confirm-text">
              <strong id="ep-confirm-title">Submit your exam now?</strong>
              <p id="ep-confirm-text">{unanswered > 0 ? `You have ${unanswered} unanswered ${unanswered === 1 ? 'question' : 'questions'}. ` : ''}{flagged > 0 ? `${flagged} ${flagged === 1 ? 'question is' : 'questions are'} still flagged. ` : ''}You cannot change your answers after you submit.</p>
              <div className="ep-review-actions">
                <button disabled={p.busy} onClick={() => { setConfirming(false); if (unanswered > 0) setFilter('unanswered'); }} autoFocus>{unanswered > 0 ? 'Go back and answer' : 'Go back'}</button>
                <button className="ep-primary" disabled={p.busy} onClick={p.onSubmit}>{p.busy ? 'Please wait…' : 'Yes, submit exam'}</button>
              </div>
            </div> : <div className="ep-review-actions"><button disabled={p.busy} onClick={() => setReview(false)}>Back to question</button><button className="ep-primary" disabled={p.busy} onClick={submit}>{p.busy ? 'Please wait…' : p.preview ? 'Finish preview' : 'Submit exam'}</button></div>}
          </article> : <>
            <div className="ep-question-layout">
              {p.passage && <aside ref={passageBox} className={`ep-passage ${passageOpen ? 'is-open' : ''}`} tabIndex={0} aria-label="Reading passage">
                <div className="ep-passage-head"><span className="ep-eyebrow">Reading passage</span>
                  <button type="button" className="ep-passage-toggle" aria-expanded={passageOpen} onClick={() => setPassageOpen(open => !open)}>{passageOpen ? <><ChevronUp size={15} /> Show less</> : <><ChevronDown size={15} /> Show full passage</>}</button></div>
                <div>{p.passage}</div>
              </aside>}
              <article ref={sheet} className="ep-sheet">
                <div className="ep-question-meta"><span className="ep-eyebrow">Question {p.index + 1} of {p.questions.length}</span><span>{q?.points} {q?.points === 1 ? 'point' : 'points'}</span></div>
                <h2 ref={heading} tabIndex={-1} className={longPrompt ? 'ep-prompt-long' : undefined}>{p.prompt}</h2>
                {p.imageUrl && <img className="ep-image" src={p.imageUrl} alt="Question illustration" />}
                <fieldset className="ep-answer" disabled={p.answerDisabled}><legend className="sr-only">Your answer</legend>{p.children}</fieldset>
                <div className="ep-question-bottom"><span>{q?.answered ? <><Check size={14} /> Answer entered{p.preview ? ' in preview' : ''}</> : q?.partial ? `Partly answered (${q.partial})` : 'Not answered yet'}</span><button disabled={p.busy || p.answerDisabled} aria-pressed={q?.flagged} onClick={p.onFlag}><Flag size={15} />{q?.flagged ? 'Flagged for review' : 'Flag for review'}</button></div>
              </article>
            </div>
            <footer ref={footer} className="ep-footer"><button aria-label="Previous question" disabled={p.index === 0 || p.busy} onClick={() => void navigate(p.index - 1)}><ArrowLeft size={16} /> Previous</button><div className="ep-tools">{p.tools}</div>{p.index < p.questions.length - 1 ? <button className="ep-primary" aria-label="Next question" disabled={p.busy} onClick={() => void navigate(p.index + 1)}>Next <ArrowRight size={16} /></button> : <button className="ep-primary" disabled={p.busy} onClick={() => openReview()}>Review answers <ArrowRight size={16} /></button>}</footer>
          </>}
        </div>
      </div>
    </div>
  </section>;
}
