import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams, useSearchParams, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import ExamRouteBoundary from './ExamRouteBoundary';
import { useAuth } from '../../providers/AuthProvider';

/** Scoped exam routes must resolve access before mounting forms or loading student responses. */
export default function ExamManagementGate({ children, studentResults = false }: { children: ReactNode; studentResults?: boolean }) {
  const { id, examId } = useParams();
  const [query] = useSearchParams();
  const { user } = useAuth();
  const location = useLocation();
  const target = id ?? examId ?? query.get('examId');
  // The global grading queue is scoped by its API. Students open their own released results.
  const content = !target || (studentResults && user?.role === 'STUDENT') ? children
    : <AccessCheck key={`${user?.id}/${target}`} examId={target}>{children}</AccessCheck>;
  return <ExamRouteBoundary key={`${user?.id}/${location.pathname}`}>{content}</ExamRouteBoundary>;
}

function AccessCheck({ examId, children }: { examId: string; children: ReactNode }) {
  const [access, setAccess] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    apiGet<{ access: string }>(`/api/exams/${encodeURIComponent(examId)}/access`, { signal: controller.signal, timeoutMs: 20000 })
      .then(data => {
        if (!['owner', 'editor', 'admin', 'viewer'].includes(data?.access)) throw new Error('Could not check your exam access. Please try again.');
        if (!controller.signal.aborted) setAccess(data.access);
      })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Could not check your access.'); });
    return () => controller.abort();
  }, [examId, retry]);

  if (error) return <div className="space-y-3 border border-border bg-card p-5" role="alert">
    <p>{error}</p>
    <div className="flex gap-2"><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Retry</Button>
      <Button variant="ghost" nativeButton={false} render={<Link to="/exams" />}>Back to exams</Button></div>
  </div>;
  if (!access) return <p role="status" className="p-5 text-sm text-muted-foreground">Checking exam access…</p>;
  if (access === 'owner' || access === 'editor' || access === 'admin') return children;
  return <Navigate to={`/exams/${encodeURIComponent(examId)}/preview`} replace />;
}
