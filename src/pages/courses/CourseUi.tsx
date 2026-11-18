import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, BookOpen, CheckCircle2, ChevronRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { COURSE_STATUS_LABELS, courseTotals, type CourseDraft } from '../../../shared/courses';
import './courses.css';

export const courseSelect = 'course-select';
export function CourseErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="course-error"><AlertCircle size={18} aria-hidden="true" /><div><p>{message}</p>{retry && <Button variant="outline" className="mt-3" onClick={retry}>Try again</Button>}</div></div>;
}
export function CourseStatus({ status }: { status: string }) {
  return <span className={`course-status ${status === 'IN_REVIEW' ? 'course-status-review' : status === 'PUBLISHED' ? 'course-status-published' : ''}`}>{COURSE_STATUS_LABELS[status] ?? status}</span>;
}
/** Adapted from the installed licensed React Bits Pro dashboard-11: one brief,
 * reduced-motion-aware container entrance, flat connected summary, live numbers. */
export function CourseIntro({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children?: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.header className="course-intro" initial={reduced ? false : { opacity: .85, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
    <div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="course-actions">{actions}</div>}{children}
  </motion.header>;
}
export function CourseFacts({ draft }: { draft: CourseDraft }) {
  const total = courseTotals(draft);
  return <div className="course-facts"><span><BookOpen size={15} aria-hidden="true" />{total.modules} modules · {total.lessons} lessons</span><span><Clock3 size={15} aria-hidden="true" />{total.minutes} min planned</span><span>{draft.level} · {draft.language}</span></div>;
}
export function CourseProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total ? Math.round(completed / total * 100) : 0;
  return <div><div className="course-progress-label"><span>{completed} of {total} lessons complete</span><span>{percent}%</span></div><div className="course-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Course completion"><span style={{ width: `${percent}%` }} /></div></div>;
}
export function CourseBack({ to = '/courses', children = 'Courses' }: { to?: string; children?: ReactNode }) {
  return <Link to={to} className="course-back"><ChevronRight size={14} className="rotate-180" aria-hidden="true" />{children}</Link>;
}
export function CourseCompleteMark({ complete }: { complete: boolean }) {
  return complete ? <CheckCircle2 size={18} className="text-academic-teal shrink-0" aria-label="Completed" /> : <span className="course-open-mark" aria-hidden="true" />;
}
