import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiGet, apiSend } from "../../lib/api";
import { PlayCircle, RotateCcw, Lock, Clock } from "lucide-react";

type Avail = {
  id: string;
  title: string;
  durationMinutes: number | null;
  openNow: boolean;
  requiresAccessCode: boolean;
  attemptLimit: number;
  attemptsUsed: number;
  activeAttemptId: string | null;
  availableUntil: string | null;
  availableFrom: string | null;
};

export default function ResumeAttempt() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedExam = params.get("exam");
  const [exams, setExams] = useState<Avail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [startingId, setStartingId] = useState<string | null>(null);
  const startPending = useRef(false);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [startError, setStartError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    apiGet<Avail[]>("/api/exam2/available", { signal: controller.signal })
      .then((d) => {
        if (!controller.signal.aborted) setExams(d || []);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setLoadError(e.message || "Could not load exams. Please retry.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  const start = async (e: Avail) => {
    if (startPending.current) return;
    startPending.current = true;
    setStartingId(e.id);
    try {
      setStartError(null);
      const accessCode = codes[e.id]?.trim();
      if (e.requiresAccessCode && !accessCode) {
        setStartError({ id: e.id, message: 'Enter the access code provided by your teacher.' });
        return;
      }
      const data = await apiSend<{
        attempt?: { id?: string; sessionToken?: string };
      }>(`/api/exam2/${e.id}/start`, "POST", {
        accessCode,
        deviceInfo: {
          ua: navigator.userAgent,
          w: screen.width,
          h: screen.height,
        },
      });
      if (!data?.attempt?.id)
        throw new Error(
          "The server did not return an exam attempt. Please retry.",
        );
      if (data.attempt.sessionToken)
        sessionStorage.setItem(
          `exam_attempt_session_${data.attempt.id}`,
          data.attempt.sessionToken,
        );
      navigate(`/exam2/attempts/${data.attempt.id}/play`);
    } catch (error: any) {
      if (error?.data?.error === 'TIME_EXPIRED' && e.activeAttemptId) {
        navigate(`/exam2/attempts/${e.activeAttemptId}/result`, { replace: true });
        return;
      }
      setStartError({ id: e.id, message: error?.message || 'Could not start exam. Check your connection and retry.' });
    } finally {
      startPending.current = false;
      setStartingId(null);
    }
  };

  if (loading)
    return <div className="py-20 text-center text-slate-500">Loading…</div>;
  const visibleExams = selectedExam
    ? exams.filter((e) => e.id === selectedExam)
    : exams;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Button variant="ghost" render={<Link to="/student/exams" />} nativeButton={false}>Back to examinations</Button>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          My Exams
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your exam details before starting. The timer begins when you select Start exam.
        </p>
      </div>
      {selectedExam && (
        <Button variant="outline" onClick={() => setParams({})}>
          View all exams
        </Button>
      )}
      {loadError ? (
        <div role="alert">
          <p>{loadError}</p>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </Button>
        </div>
      ) : (
        visibleExams.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-10 text-center text-slate-500">
            {selectedExam
              ? "This exam is no longer available to start or resume."
              : "No exams available right now."}
          </div>
        )
      )}
      {!loadError &&
        visibleExams.map((e) => {
          const exhausted =
            e.attemptsUsed >= e.attemptLimit && !e.activeAttemptId;
          return (
            <form key={e.id} onSubmit={event => { event.preventDefault(); if (e.openNow && !exhausted) void start(e); }} className="flex flex-col gap-4 border border-border bg-card rounded-lg p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {e.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                  {e.durationMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {e.durationMinutes}m
                    </span>
                  )}
                  <span>
                    Attempt{" "}
                    {Math.min(
                      e.attemptsUsed + (e.activeAttemptId ? 0 : 1),
                      e.attemptLimit,
                    )}
                    /{e.attemptLimit}
                  </span>
                  {e.requiresAccessCode && (
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Code
                    </span>
                  )}
                </div>
              </div>
              {!e.openNow ? (<Button disabled variant="outline">Not open</Button>) : e.activeAttemptId ? (
                <Button
                  disabled={startingId !== null}
                  type="submit"
                  className="bg-primary text-primary-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />{" "}
                  {startingId === e.id ? "Opening…" : "Resume"}
                </Button>
              ) : exhausted ? (
                <Button disabled variant="outline">
                  No attempts left
                </Button>
              ) : (
                <Button
                  disabled={startingId !== null}
                  type="submit"
                  className="bg-primary text-primary-foreground"
                >
                  <PlayCircle className="h-4 w-4 mr-1" />{" "}
                  {startingId === e.id ? "Opening…" : "Start exam"}
                </Button>
              )}
              </div>
              {(e.availableFrom || e.availableUntil) && <p className="text-sm text-muted-foreground">{e.availableFrom && `Opens ${new Date(e.availableFrom).toLocaleString()}`}{e.availableFrom && e.availableUntil && ' · '}{e.availableUntil && `Closes ${new Date(e.availableUntil).toLocaleString()}`}</p>}
              {e.requiresAccessCode && e.openNow && !exhausted && <div className="space-y-2"><label htmlFor={`code-${e.id}`} className="text-sm font-medium">Access code</label><Input id={`code-${e.id}`} required autoComplete="off" value={codes[e.id] || ''} onChange={event => setCodes(c => ({ ...c, [e.id]: event.target.value }))} aria-describedby={startError?.id === e.id ? `error-${e.id}` : undefined} /><p className="text-xs text-muted-foreground">Use the code provided by your teacher.</p></div>}
              {startError?.id === e.id && <p id={`error-${e.id}`} role="alert" className="text-sm text-destructive">{startError.message}</p>}
            </form>
          );
        })}
    </div>
  );
}
