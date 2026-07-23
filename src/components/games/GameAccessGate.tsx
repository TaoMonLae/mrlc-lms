import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Clock3, GraduationCap, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiGet, apiSend, authHeaders } from "../../lib/api";
import { useAuth } from "../../providers/AuthProvider";
import { GAME_LABELS, type GameAccessDecision, type GameKey } from "../../../shared/gameControls";

type AccessPayload = GameAccessDecision & {
  exempt: boolean;
  managed: boolean;
};

interface GameAccessGateProps {
  gameKey: GameKey;
  consumeTime?: boolean;
  children: ReactNode;
}

const REQUEST_TIMEOUT_MS = 8_000;

function allowedAccess(exempt: boolean, managed: boolean): AccessPayload {
  return {
    allowed: true,
    code: "ALLOWED",
    reason: null,
    dailyLimitMinutes: null,
    sessionLimitMinutes: null,
    cooldownMinutes: 0,
    dailyUsedSeconds: 0,
    sessionUsedSeconds: 0,
    remainingDailySeconds: null,
    remainingSessionSeconds: null,
    remainingSeconds: null,
    nextAllowedAt: null,
    exempt,
    managed,
  };
}

function accessFromApiError(error: unknown): AccessPayload | null {
  if (!(error instanceof ApiError)) return null;
  const candidate = error.data?.access;
  return candidate && typeof candidate === "object" && typeof candidate.allowed === "boolean"
    ? candidate as AccessPayload
    : null;
}

function retryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status === 408 || error.status === 429 || error.status >= 500;
}

async function controlledRequest<T>(
  request: (signal: AbortSignal) => Promise<T>,
  attempts = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await request(controller.signal);
    } catch (error) {
      lastError = error;
      if (!retryable(error) || attempt === attempts - 1) break;
      await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
    } finally {
      window.clearTimeout(timeout);
    }
  }
  if (lastError instanceof DOMException && lastError.name === "AbortError") {
    throw new Error("The game-control check timed out.");
  }
  throw lastError;
}

function formatRemaining(seconds: number | null): string {
  if (seconds == null) return "No time limit";
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function GameControlUnavailable({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-xl dark:border-amber-900/60 dark:bg-slate-950 sm:p-9">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <WifiOff className="size-8" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
          Game access could not be checked
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          The game is paused until the student screen-time rules can be verified.
        </p>
        <Button className="mt-6 font-bold" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Try again
        </Button>
      </section>
    </main>
  );
}

function RestrictedGame({ gameKey, access }: { gameKey: GameKey; access: AccessPayload }) {
  const isBreak = access.code === "COOLDOWN";
  const title = access.code === "BLOCKED"
    ? `${GAME_LABELS[gameKey]} is blocked`
    : access.code === "OUTSIDE_SCHEDULE"
      ? "Games are closed right now"
      : isBreak
        ? "Time for a screen break"
        : "Game time is finished";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-10 text-center text-white">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <ShieldAlert className="size-8" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-black sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium text-white/85 sm:text-base">
            {access.reason || "A teacher or administrator has limited access to this game."}
          </p>
        </div>
        <div className="space-y-5 p-6 sm:p-8">
          {(access.dailyLimitMinutes || access.sessionLimitMinutes) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {access.dailyLimitMinutes && (
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Daily allowance</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    {access.dailyLimitMinutes} minutes
                  </p>
                </div>
              )}
              {access.sessionLimitMinutes && (
                <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Each session</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    {access.sessionLimitMinutes} minutes
                  </p>
                </div>
              )}
            </div>
          )}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Use this break to stretch, rest your eyes, or continue with a learning activity.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button render={<Link to="/student/dashboard" />} className="font-bold">
              <GraduationCap className="mr-2 size-4" />
              Back to learning
            </Button>
            <Button variant="outline" render={<Link to="/games/language-quest" />}>
              Open Language Quest
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

export function GameAccessGate({
  gameKey,
  consumeTime = false,
  children,
}: GameAccessGateProps) {
  const { user } = useAuth();
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [fullscreenTarget, setFullscreenTarget] = useState<HTMLElement | null>(null);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const syncFullscreenTarget = () => {
      setFullscreenTarget(document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : null);
    };
    document.addEventListener("fullscreenchange", syncFullscreenTarget);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenTarget);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAccess(null);
    setRemainingSeconds(null);
    setTechnicalError(null);
    sessionIdRef.current = null;

    const open = async () => {
      // Screen-time restrictions apply only to students. Staff should never
      // depend on the controls API merely to render a game.
      if (user && user.role !== "STUDENT") {
        if (!cancelled) {
          setAccess(allowedAccess(true, false));
          setLoading(false);
        }
        return;
      }
      try {
        const checked = await controlledRequest(
          (signal) => apiGet<AccessPayload>(
            `/api/game-controls/access?gameKey=${gameKey}`,
            { signal },
          ),
        );
        if (cancelled) return;
        if (!checked.allowed || !consumeTime || checked.exempt || !checked.managed) {
          setAccess(checked);
          setRemainingSeconds(checked.remainingSeconds);
          setLoading(false);
          return;
        }
        const started = await controlledRequest(
          (signal) => apiSend<{ sessionId: string | null; access: AccessPayload }>(
            "/api/game-controls/sessions/start",
            "POST",
            { gameKey },
            { signal },
          ),
        );
        if (cancelled) {
          if (started.sessionId) {
            void fetch(`/api/game-controls/sessions/${started.sessionId}/end`, {
              method: "POST",
              headers: authHeaders(),
              keepalive: true,
            });
          }
          return;
        }
        sessionIdRef.current = started.sessionId;
        setAccess(started.access);
        setRemainingSeconds(started.access.remainingSeconds);
      } catch (error: unknown) {
        if (!cancelled) {
          const denied = accessFromApiError(error);
          if (denied) {
            setAccess(denied);
            setRemainingSeconds(denied.remainingSeconds);
          } else {
            setTechnicalError(
              error instanceof Error ? error.message : "Game access could not be verified.",
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void open();
    return () => {
      cancelled = true;
      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;
      if (sessionId) {
        void fetch(`/api/game-controls/sessions/${sessionId}/end`, {
          method: "POST",
          headers: authHeaders(),
          keepalive: true,
        });
      }
    };
  }, [consumeTime, gameKey, retryKey, user?.id, user?.role]);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !access?.allowed || technicalError) return;
    const interval = window.setInterval(async () => {
      try {
        const result = await controlledRequest(
          (signal) => apiSend<{ access: AccessPayload }>(
            `/api/game-controls/sessions/${sessionId}/heartbeat`,
            "POST",
            {},
            { signal },
          ),
        );
        if (!mountedRef.current) return;
        setAccess(result.access);
        setRemainingSeconds(result.access.remainingSeconds);
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        const denied = accessFromApiError(error);
        if (denied) {
          sessionIdRef.current = null;
          setAccess(denied);
          setRemainingSeconds(denied.remainingSeconds);
          return;
        }
        setTechnicalError(
          error instanceof Error ? error.message : "The controlled game session could not be verified.",
        );
      }
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [access?.allowed, gameKey, technicalError]);

  useEffect(() => {
    if (!consumeTime || !access?.allowed || access.exempt || remainingSeconds == null) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current == null) return null;
        if (current <= 1) {
          setAccess((value) => value
            ? {
                ...value,
                allowed: false,
                code: value.remainingDailySeconds != null
                  && value.remainingDailySeconds <= (value.remainingSessionSeconds ?? Number.POSITIVE_INFINITY)
                  ? "DAILY_LIMIT"
                  : "SESSION_LIMIT",
                reason: value.remainingDailySeconds != null
                  && value.remainingDailySeconds <= (value.remainingSessionSeconds ?? Number.POSITIVE_INFINITY)
                  ? "Your game time for today has been used."
                  : "This play session has reached its time limit.",
                remainingSeconds: 0,
              }
            : value);
          return 0;
        }
        return current - 1;
      });
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [access?.allowed, access?.exempt, consumeTime]);

  const timerLabel = useMemo(() => formatRemaining(remainingSeconds), [remainingSeconds]);
  const timer = consumeTime && !access?.exempt && access?.managed
    ? (
        <div className="fixed right-3 top-20 z-[2147483647] flex items-center gap-2 rounded-full border border-violet-300 bg-slate-950/95 px-3 py-2 text-xs font-black text-white shadow-xl backdrop-blur sm:right-5">
          <Clock3 className="size-4 text-violet-300" aria-hidden="true" />
          <span aria-label={`Game time remaining ${timerLabel}`}>{timerLabel}</span>
        </div>
      )
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="size-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        <p className="font-semibold text-slate-500">Checking game-time controls…</p>
      </div>
    );
  }
  if (technicalError) {
    return (
      <GameControlUnavailable
        message={technicalError}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    );
  }
  if (!access?.allowed) return <RestrictedGame gameKey={gameKey} access={access!} />;

  return (
    <div className="relative min-w-0">
      {fullscreenTarget && timer ? createPortal(timer, fullscreenTarget) : timer}
      {children}
    </div>
  );
}

export default GameAccessGate;
