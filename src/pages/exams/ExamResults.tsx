import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useUser } from '../../lib/permissions';
import { apiGet } from '../../lib/api';

/**
 * Legacy results route, now a redirector into the unified results experience:
 *  - teachers/admins  → /exam2/:id/analytics (results + grading queue)
 *  - students         → their own attempt result (/exam2/attempts/:attemptId/result)
 * The old per-exam grading UI (PUT /api/exam-attempts/:id/grade) is retired in
 * favour of the manual grading queue + rubric grading.
 */
export default function ExamResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    const role = user?.role;
    if (role === 'ADMIN' || role === 'TEACHER') {
      navigate(`/exam2/${id}/analytics`, { replace: true });
      return;
    }
    // Student: resolve their attempt for this exam, then show the gated result.
    apiGet<{ submitted: { id: string; attemptId?: string }[] }>('/api/student/exams')
      .then((d) => {
        const match = (d?.submitted || []).find((e) => e.id === id);
        navigate(match?.attemptId ? `/exam2/attempts/${match.attemptId}/result` : '/exam2/resume', { replace: true });
      })
      .catch(() => navigate('/exam2/resume', { replace: true }));
  }, [id, user, navigate]);

  return (
    <div className="flex items-center justify-center py-32 text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Opening results…
    </div>
  );
}
