import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, Flag, X } from 'lucide-react';
import './exam-paper.css';

export type PaperQuestion = { id: string; answered: boolean; flagged: boolean; points: number };
type Props = {
  title: string; status: string; remaining: number | null; questions: PaperQuestion[]; index: number;
  prompt: ReactNode; passage?: ReactNode; imageUrl?: string | null; children: ReactNode;
  onNavigate: (index: number) => boolean | void | Promise<boolean | void>;
  onFlag: () => void; onSubmit: () => void; onClose?: () => void;
  theme?: string; busy?: boolean; answerDisabled?: boolean; preview?: boolean; tools?: ReactNode; notices?: ReactNode;
};

/** Shared presentation only: persistence and deadline authority stay in the live player. */
export default function ExamPaper(p: Props) {
  const [review, setReview] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'nearest' });
  }, [p.index, review]);
  const answered = p.questions.filter(q => q.answered).length;
  const flagged = p.questions.filter(q => q.flagged).length;
  const q = p.questions[p.index];
  const navigate = async (index: number) => { if (await p.onNavigate(index) !== false) setReview(false); };
  const time = p.remaining === null ? 'Untimed' : `${String(Math.floor(p.remaining / 60)).padStart(2, '0')}:${String(p.remaining % 60).padStart(2, '0')}`;
  return <section className={`exam-paper ${p.theme === 'focus' ? 'ep-focus' : p.theme === 'colorful' ? 'ep-colorful' : ''}`} data-no-i18n>
    <header className="ep-header">
      <div className="ep-title"><span className="ep-eyebrow">{p.preview ? 'Student preview' : 'Assessment'}</span><h1>{p.title}</h1><p role="status">{p.status}</p></div>
      <div className={`ep-timer ${p.remaining !== null && p.remaining <= 60 ? 'ep-timer-low' : ''}`} aria-label={`Time remaining: ${time}`}><Clock size={17} /><div><span>Time remaining</span><strong>{time}</strong></div></div>
      {p.onClose && <button className="ep-icon" onClick={p.onClose} aria-label="Close preview"><X size={20} /></button>}
    </header>
    <div className="ep-workspace">
      {p.notices && <div className="ep-notices">{p.notices}</div>}
      <div className="ep-progress"><span><strong>{answered}</strong> of {p.questions.length} answered</span><progress aria-label="Questions answered" max={p.questions.length || 1} value={answered} /><button disabled={p.busy} onClick={() => setReview(true)}>Review answers{flagged > 0 ? ` · ${flagged} flagged` : ''}</button></div>
      <div className={`ep-layout ${p.passage && !review ? 'ep-with-passage' : ''}`}>
        <aside className="ep-nav"><span className="ep-eyebrow">Questions</span><nav aria-label="Question navigation">{p.questions.map((item, i) => <button key={item.id} disabled={p.busy} onClick={() => void navigate(i)} aria-current={!review && p.index === i ? 'step' : undefined} aria-label={`Question ${i + 1}, ${item.answered ? 'answered' : 'unanswered'}${item.flagged ? ', flagged' : ''}`} className={`${item.answered ? 'is-answered' : ''} ${item.flagged ? 'is-flagged' : ''}`}><span>{i + 1}</span>{item.flagged ? <Flag size={10} /> : item.answered ? <Check size={10} /> : null}</button>)}</nav><p className="ep-legend"><Check size={12} /> Answered <Flag size={12} /> For review</p></aside>
        <div className="ep-document">
          {review ? <article className="ep-sheet ep-review"><span className="ep-eyebrow">Final review</span><h2 ref={heading} tabIndex={-1}>Review your answers</h2><p>{answered} of {p.questions.length} answered · {flagged} flagged for review.</p><p>{p.preview ? 'This is a preview. Finishing will not submit an attempt.' : 'You can return to any question before submitting. After submission, your answers cannot be changed.'}</p><div className="ep-review-list">{p.questions.map((item, i) => <button key={item.id} disabled={p.busy} onClick={() => void navigate(i)}><span>Question {i + 1}</span><span>{item.flagged && <Flag size={14} />}{item.answered ? 'Answered' : 'Unanswered'}<ArrowRight size={15} /></span></button>)}</div><div className="ep-review-actions"><button disabled={p.busy} onClick={() => setReview(false)}>Back to question</button><button className="ep-primary" disabled={p.busy} onClick={p.onSubmit}>{p.busy ? 'Please wait…' : p.preview ? 'Finish preview' : 'Submit exam'}</button></div></article> : <>
            <div className="ep-question-layout">
              {p.passage && <aside className="ep-passage"><span className="ep-eyebrow">Reading passage</span><div>{p.passage}</div></aside>}
              <article className="ep-sheet">
                <div className="ep-question-meta"><span className="ep-eyebrow">Question {p.index + 1} of {p.questions.length}</span><span>{q?.points} {q?.points === 1 ? 'point' : 'points'}</span></div>
                <h2 ref={heading} tabIndex={-1}>{p.prompt}</h2>
                {p.imageUrl && <img className="ep-image" src={p.imageUrl} alt="Question illustration" />}
                <fieldset className="ep-answer" disabled={p.answerDisabled}><legend className="sr-only">Your answer</legend>{p.children}</fieldset>
                <div className="ep-question-bottom"><span>{q?.answered ? <><Check size={14} /> Answer entered{p.preview ? ' in preview' : ''}</> : 'Not answered yet'}</span><button disabled={p.busy || p.answerDisabled} aria-pressed={q?.flagged} onClick={p.onFlag}><Flag size={15} />{q?.flagged ? 'Flagged for review' : 'Flag for review'}</button></div>
              </article>
            </div>
            <footer className="ep-footer"><button aria-label="Previous question" disabled={p.index === 0 || p.busy} onClick={() => void navigate(p.index - 1)}><ArrowLeft size={16} /> Previous</button><div className="ep-tools">{p.tools}</div>{p.index < p.questions.length - 1 ? <button className="ep-primary" aria-label="Next question" disabled={p.busy} onClick={() => void navigate(p.index + 1)}>Next <ArrowRight size={16} /></button> : <button className="ep-primary" disabled={p.busy} onClick={() => setReview(true)}>Review answers <ArrowRight size={16} /></button>}</footer>
          </>}
        </div>
      </div>
    </div>
  </section>;
}
