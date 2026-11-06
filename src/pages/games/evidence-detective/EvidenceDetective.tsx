import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardList, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { apiGet, apiSend } from "../../../lib/api";
import { useAuth } from "../../../providers/AuthProvider";
import "./evidence-detective.css";

type Option = { id: string; text: string };
type Case = {
  id: string; title: string; category: string; source: string;
  paragraphs: { label: string; text: string }[];
  question: string; evidence: Option[]; reasoning: Option[];
};
type Progress = { caseId: string; attempts: number; solved: boolean; solvedAt: string | null };
type Answer = { evidence: string; reasoning: string };
type Review = { answer: Answer; explanation: string };
type CaseData = { cases: Case[]; progress: Progress[]; reviews: Record<string, Review> };
type Verdict = { solved: boolean; alreadySolved?: boolean; attempts: number; hint?: string; explanation?: string; answer?: Answer; saveError?: boolean };

export default function EvidenceDetective() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<CaseData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evidenceId, setEvidenceId] = useState("");
  const [reasoningId, setReasoningId] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const submitLock = useRef(false);
  const caseId = searchParams.get("case");

  const load = () => {
    setLoading(true);
    setLoadError("");
    apiGet<CaseData>("/api/games/evidence-detective")
      .then(setData)
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Could not load cases."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setEvidenceId(""); setReasoningId(""); setVerdict(null); }, [caseId]);

  const currentIndex = data?.cases.findIndex((item) => item.id === caseId) ?? -1;
  const current = currentIndex >= 0 ? data!.cases[currentIndex] : null;
  const progress = useMemo(() => new Map(data?.progress.map((item) => [item.caseId, item]) ?? []), [data]);
  const completed = data?.progress.filter((item) => item.solved).length ?? 0;
  const review = current ? data?.reviews[current.id] : undefined;
  const next = data?.cases.find((item) => !progress.get(item.id)?.solved);
  const nextAfterCurrent = current && data?.cases.slice(currentIndex + 1).find((item) => !progress.get(item.id)?.solved);
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";
  const goTo = (id: string) => navigate(`/games/evidence-detective?case=${encodeURIComponent(id)}`);

  const submit = async () => {
    if (!current || !evidenceId || !reasoningId || submitLock.current || review) return;
    submitLock.current = true;
    setSaving(true);
    setVerdict(null);
    try {
      const result = await apiSend<Verdict>("/api/games/evidence-detective/attempt", "POST", { caseId: current.id, evidenceId, reasoningId });
      setVerdict(result);
      setData((previous) => {
        if (!previous) return previous;
        const updated = previous.progress.filter((item) => item.caseId !== current.id);
        updated.push({ caseId: current.id, attempts: result.attempts, solved: result.solved, solvedAt: result.solved ? new Date().toISOString() : null });
        return {
          ...previous,
          progress: updated,
          reviews: result.solved && result.answer && result.explanation
            ? { ...previous.reviews, [current.id]: { answer: result.answer, explanation: result.explanation } }
            : previous.reviews,
        };
      });
    } catch (error) {
      setVerdict({ solved: false, saveError: true, attempts: progress.get(current.id)?.attempts ?? 0, hint: error instanceof Error ? error.message : "Your answer could not be saved. Please try again." });
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  if (loading) return <main className="ed-page ed-center" role="status">Opening the case files…</main>;
  if (loadError || !data) return <main className="ed-page ed-center"><h1>Case files unavailable</h1><p>{loadError || "Please try again."}</p><button className="ed-button" onClick={load}>Try again</button></main>;

  return <main className="ed-page">
    <nav className="ed-breadcrumb" aria-label="Breadcrumb"><Link to="/games"><ArrowLeft size={16} /> Games</Link><ChevronRight size={15} aria-hidden="true" />{current ? <Link to="/games/evidence-detective">Evidence Detective</Link> : <span>Evidence Detective</span>}</nav>
    <header className="ed-header">
      <div><h1>Evidence Detective</h1><p>Read the source. Find the strongest evidence. Make your case.</p></div>
      <div className="ed-header-actions"><span className="ed-count"><ShieldCheck size={17} /> {completed} of {data.cases.length} solved</span>{isTeacher && <Link className="ed-assign" to="/teacher/homework" state={{ openComposer: true, prefill: { title: "Evidence Detective", instructions: "Complete the Evidence Detective cases at /games/evidence-detective. Then submit a short note describing one claim, the evidence you chose, and why it supports the claim.", attachmentUrl: "" } }}><ClipboardList size={16} /> Assign as homework</Link>}</div>
    </header>

    <div className="ed-progress" role="progressbar" aria-label="Cases solved" aria-valuemin={0} aria-valuemax={data.cases.length} aria-valuenow={completed}><span style={{ transform: `scaleX(${completed / data.cases.length})` }} /></div>
    <nav className="ed-case-nav" aria-label="Case files">{data.cases.map((item, index) => <button key={item.id} disabled={saving} className={`ed-case-tab ${current?.id === item.id ? "active" : ""} ${progress.get(item.id)?.solved ? "solved" : ""}`} onClick={() => goTo(item.id)} aria-current={current?.id === item.id ? "step" : undefined}><span>{progress.get(item.id)?.solved ? <Check size={15} aria-label="Solved" /> : String(index + 1).padStart(2, "0")}</span><b>{item.title}</b></button>)}</nav>

    {!current ? <section className="ed-intro"><div className="ed-intro-copy"><Search size={30} aria-hidden="true" /><h2>Every claim needs a clue.</h2><p>Each case has a short source and two decisions. First, choose the detail that best supports the claim. Then explain the connection. You can try again after a wrong answer, and your progress saves to your account.</p><button className="ed-button" onClick={() => goTo(next?.id ?? data.cases[0].id)}>{completed === data.cases.length ? "Review a case" : completed ? "Continue investigating" : "Open the first case"}<ArrowRight size={17} /></button></div><aside><strong>How to investigate</strong><ol><li>Read the source and the claim.</li><li>Choose the most direct evidence.</li><li>Choose a reason that stays within what the source proves.</li></ol></aside></section> : <div className="ed-workspace" key={current.id}>
      <article className="ed-source"><div className="ed-document-top"><span>{current.source}</span><span>CASE {String(currentIndex + 1).padStart(2, "0")} / {String(data.cases.length).padStart(2, "0")}</span></div><h2>{current.title}</h2><p className="ed-source-lead">Read the source before weighing the evidence.</p><div className="ed-paragraphs">{current.paragraphs.map((paragraph) => <p key={paragraph.label}><span aria-label={`Paragraph ${paragraph.label}`}>{paragraph.label}</span>{paragraph.text}</p>)}</div></article>
      <section className="ed-investigate"><div className="ed-question"><span>{current.category} · Evidence and reasoning</span><h2>{current.question}</h2></div><fieldset disabled={!!review || saving}><legend>1. Select the strongest evidence</legend><div className="ed-options">{current.evidence.map((option) => <label key={option.id} className={`ed-option ${evidenceId === option.id ? "selected" : ""} ${review?.answer.evidence === option.id ? "correct" : ""}`}><input type="radio" name={`evidence-${current.id}`} value={option.id} checked={evidenceId === option.id} onChange={() => { setEvidenceId(option.id); setVerdict(null); }} /><span>{option.text}</span>{review?.answer.evidence === option.id && <Check size={17} aria-label="Correct evidence" />}</label>)}</div></fieldset><fieldset disabled={!!review || saving}><legend>2. Explain why it supports the claim</legend><div className="ed-options">{current.reasoning.map((option) => <label key={option.id} className={`ed-option ${reasoningId === option.id ? "selected" : ""} ${review?.answer.reasoning === option.id ? "correct" : ""}`}><input type="radio" name={`reasoning-${current.id}`} value={option.id} checked={reasoningId === option.id} onChange={() => { setReasoningId(option.id); setVerdict(null); }} /><span>{option.text}</span>{review?.answer.reasoning === option.id && <Check size={17} aria-label="Correct reason" />}</label>)}</div></fieldset>
      {review ? <div className="ed-feedback success" role="status"><strong><ShieldCheck size={18} /> Case solved</strong><p>{review.explanation}</p></div> : verdict && <div className="ed-feedback" role="status"><strong>{verdict.saveError ? "Save failed" : "Keep investigating"}</strong>{!verdict.saveError && <p>That evidence and explanation do not yet make the strongest case together.</p>}<p>{verdict.hint}</p></div>}
      <div className="ed-actions">{review ? <>{nextAfterCurrent ? <button className="ed-button" onClick={() => goTo(nextAfterCurrent.id)}>Next case <ArrowRight size={17} /></button> : <button className="ed-button" onClick={() => navigate("/games/evidence-detective")}>Back to case files <ArrowRight size={17} /></button>}</> : <button className="ed-button" disabled={!evidenceId || !reasoningId || saving} onClick={submit}>{saving ? "Saving answer…" : verdict ? "Try this answer" : "Check my answer"}<ArrowRight size={17} /></button>}{verdict && !review && <button className="ed-text-button" onClick={() => { setEvidenceId(""); setReasoningId(""); setVerdict(null); }}><RotateCcw size={15} /> Clear choices</button>}</div>
      </section></div>}
  </main>;
}
