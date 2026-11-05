import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiSend } from '../lib/api';

export interface InvigilatorStudent {
  studentId: string;
  name: string;
  attemptId: string | null;
  state: string;
  remainingSeconds: number | null;
  lastSavedAt?: string | null;
  lastCheckInAt?: string | null;
  disconnected?: boolean;
  securityWarnings: number;
  ipAddress?: string | null;
}
interface SessionData {
  summary: { notStarted: number; inProgress: number; paused: number; submitted: number; disconnected: number };
  students: InvigilatorStudent[];
}
function parseSession(value: unknown): SessionData {
  const data = value as SessionData | null;
  const counts = ['notStarted', 'inProgress', 'paused', 'submitted', 'disconnected'] as const;
  if (!data?.summary || counts.some(key => !Number.isFinite(data.summary[key]) || data.summary[key] < 0)
    || !Array.isArray(data.students) || data.students.some(student => !student || typeof student.studentId !== 'string'
      || typeof student.name !== 'string' || typeof student.state !== 'string'
      || (student.remainingSeconds != null && (!Number.isFinite(student.remainingSeconds) || student.remainingSeconds < 0)))) {
    throw new Error('Invalid live session response');
  }
  return data;
}
interface Session {
  active: boolean;
  mutating: boolean;
  controller?: AbortController;
  timer?: ReturnType<typeof setTimeout>;
  refresh: () => Promise<void>;
}

/** One read at a time; old pages and reads cannot overwrite a newer action. */
export function useInvigilatorSession(examId: string | undefined) {
  const [data, setData] = useState<SessionData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = useRef<Session | null>(null);

  useEffect(() => {
    const session: Session = { active: true, mutating: false, refresh: async () => {} };
    current.current = session;
    setData(null); setLoadError(''); setBusy(false);
    session.refresh = async () => {
      if (!session.active) return;
      clearTimeout(session.timer);
      session.controller?.abort();
      const controller = new AbortController();
      session.controller = controller;
      setRefreshing(true);
      try {
        const next = parseSession(await apiGet(`/api/exams/${examId}/invigilator`, { signal: controller.signal, timeoutMs: 20000 }));
        if (!controller.signal.aborted && session.active) { setData(next); setLoadError(''); }
      } catch {
        if (!controller.signal.aborted && session.active) setLoadError('Could not refresh the live session. Displayed information may be out of date.');
      } finally {
        if (session.active && session.controller === controller) {
          setRefreshing(false);
          if (!session.mutating) session.timer = setTimeout(() => void session.refresh(), 10000);
        }
      }
    };
    void session.refresh();
    return () => { session.active = false; session.controller?.abort(); clearTimeout(session.timer); };
  }, [examId]);

  const refresh = useCallback(async () => {
    if (!current.current?.mutating) await current.current?.refresh();
  }, []);
  const runAction = useCallback(async (attemptId: string, payload: Record<string, unknown>) => {
    const session = current.current;
    if (!session?.active || session.mutating) return false;
    session.mutating = true;
    setBusy(true);
    clearTimeout(session.timer);
    session.controller?.abort();
    try {
      await apiSend(`/api/attempts/${attemptId}/invigilate`, 'POST', payload);
    } catch (error) {
      if (session.active) throw error;
      return false;
    } finally {
      if (session.active) {
        // Refresh even after a conflict: never offer controls for the old state.
        await session.refresh();
        if (session.active) {
          session.mutating = false;
          setBusy(false);
          session.timer = setTimeout(() => void session.refresh(), 10000);
        }
      }
    }
    return session.active;
  }, []);
  return { data, loadError, refreshing, busy, refresh, runAction };
}
