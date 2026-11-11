import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ArrowLeft, X } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { clearCourseReturn, getCourseReturn } from '../../lib/courseReturn';

export default function CourseReturnNav() {
  const { user } = useAuth(); const location = useLocation(); const [dismissed, setDismissed] = useState(false);
  const path = getCourseReturn(user?.id);
  const supported = /^\/(?:videos\/[^/]+|elibrary\/[^/]+\/read|student\/homework|exam2\/resume|exam2\/attempts\/[^/]+\/result|exams\/[^/]+\/results)$/.test(location.pathname);
  useEffect(() => { setDismissed(false); if (user?.id && !supported && !/^\/exam2\/attempts\/[^/]+\/play$/.test(location.pathname)) clearCourseReturn(user.id); }, [location.pathname, user?.id, supported]);
  if (!path || dismissed || !supported || user?.role !== 'STUDENT') return null;
  return <nav aria-label="Course navigation" className="mb-5 flex items-center justify-between gap-3 border border-border bg-card px-4 py-2 print:hidden"><Link to={path} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground hover:underline"><ArrowLeft className="size-4" aria-hidden="true" />Return to course</Link><button type="button" aria-label="Dismiss course navigation" className="inline-flex size-11 items-center justify-center rounded-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { if (user?.id) clearCourseReturn(user.id); setDismissed(true); }}><X className="size-4" aria-hidden="true" /></button></nav>;
}
