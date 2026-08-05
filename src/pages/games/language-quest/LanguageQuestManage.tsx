import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  Languages,
  MessageSquareWarning,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '@/src/lib/api';
import { useAuth } from '@/src/providers/AuthProvider';
import {
  languageQuestReviewStatusLabel,
  type LanguageQuestCourseReviewStatus,
} from '@/shared/languageQuestCourseReview';

interface ManagedCourse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  language: string;
  category: string;
  imageEmoji: string;
  accentColor: string;
  published: boolean;
  official: boolean;
  retired: boolean;
  reviewRequired: boolean;
  reviewStatus: LanguageQuestCourseReviewStatus;
  reviewNote: string | null;
  submittedForReviewAt: string | null;
  reviewedAt: string | null;
  canReview: boolean;
  updatedAt: string;
  unitCount: number;
  lessonCount: number;
  challengeCount: number;
}

function ReviewBadge({ status }: { status: LanguageQuestCourseReviewStatus }) {
  const styles: Record<LanguageQuestCourseReviewStatus, string> = {
    DRAFT: 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
    PENDING: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
    APPROVED: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
    CHANGES_REQUESTED: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
  };
  return (
    <Badge variant="outline" className={styles[status]}>
      {status === 'PENDING' && <Clock3 className="h-3 w-3" />}
      {status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'CHANGES_REQUESTED' && <MessageSquareWarning className="h-3 w-3" />}
      {languageQuestReviewStatusLabel(status)}
    </Badge>
  );
}

export default function LanguageQuestManage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<ManagedCourse[]>('/api/language-quest/manage/courses')
      .then((rows) => setCourses(Array.isArray(rows) ? rows : []))
      .catch((error: any) => toast.error(error?.message || 'Could not load your courses'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const orderedCourses = useMemo(() => [...courses].sort((left, right) => {
    if (left.reviewStatus === 'PENDING' && right.reviewStatus !== 'PENDING') return -1;
    if (right.reviewStatus === 'PENDING' && left.reviewStatus !== 'PENDING') return 1;
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }), [courses]);
  const pendingCount = courses.filter((course) => course.reviewRequired && course.reviewStatus === 'PENDING').length;

  const remove = async (course: ManagedCourse) => {
    if (!window.confirm(`Delete “${course.title}” and all of its learner progress? This cannot be undone.`)) return;
    try {
      await apiSend(`/api/language-quest/manage/courses/${course.id}`, 'DELETE');
      setCourses((current) => current.filter((item) => item.id !== course.id));
      toast.success('Course deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete the course');
    }
  };

  const duplicate = async (course: ManagedCourse) => {
    setDuplicatingId(course.id);
    try {
      const result = await apiSend<{ id: string }>(`/api/language-quest/manage/courses/${course.id}/duplicate`, 'POST');
      toast.success(`Duplicated as "${course.title} (Copy)"`);
      navigate(`/games/language-quest/manage/${result.id}`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not duplicate the course');
    } finally {
      setDuplicatingId(null);
    }
  };

  const review = async (course: ManagedCourse, action: 'APPROVE' | 'REQUEST_CHANGES') => {
    const note = reviewNotes[course.id]?.trim() || '';
    if (action === 'REQUEST_CHANGES' && !note) {
      toast.error('Add a clear note so the teacher knows what to improve');
      return;
    }
    setReviewingId(course.id);
    try {
      await apiSend(`/api/language-quest/manage/courses/${course.id}/review`, 'POST', { action, note });
      toast.success(action === 'APPROVE' ? 'Course approved and published' : 'Feedback sent to the teacher');
      setReviewNotes((current) => ({ ...current, [course.id]: '' }));
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Could not complete the review');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" className="-ml-2 mb-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
            <Languages className="h-6 w-6 text-violet-600" /> Course Studio
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {isAdmin ? 'Create courses and review teacher submissions before they reach learners.' : 'Build rich language courses, then submit them for administrator review.'}
          </p>
        </div>
        <Button render={<Link to="/games/language-quest/manage/new" />} nativeButton={false}>
          <Plus className="mr-2 h-4 w-4" /> New Course
        </Button>
      </div>

      {isAdmin && (
        <section className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${pendingCount ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl ${pendingCount ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Admin review queue</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {pendingCount ? `${pendingCount} teacher ${pendingCount === 1 ? 'course is' : 'courses are'} ready for review.` : 'No teacher courses are waiting for review.'}
              </p>
            </div>
          </div>
          {pendingCount > 0 && <Badge className="bg-amber-600 text-white">{pendingCount} waiting</Badge>}
        </section>
      )}

      {loading ? (
        <div className="grid min-h-[320px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Create your first course</h2>
          <p className="mt-1 text-sm text-slate-500">Add units, lessons, and interactive language challenges.</p>
          <Button className="mt-5" render={<Link to="/games/language-quest/manage/new" />} nativeButton={false}><Plus className="mr-2 h-4 w-4" /> New Course</Button>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedCourses.map((course) => (
            <article key={course.id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-surface-indigo ${course.reviewStatus === 'PENDING' ? 'border-amber-300 ring-2 ring-amber-100 dark:border-amber-500/40 dark:ring-amber-500/10' : 'border-slate-200 dark:border-surface-raised'}`}>
              <div className="h-2" style={{ backgroundColor: course.accentColor }} />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: `${course.accentColor}18` }}>{course.imageEmoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={course.published ? 'default' : 'outline'}>
                        {course.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {course.published ? 'Live' : 'Private'}
                      </Badge>
                      {course.reviewRequired && <ReviewBadge status={course.reviewStatus} />}
                      {course.official && <Badge variant="secondary">Official</Badge>}
                      <Badge variant="outline">{course.category}</Badge>
                    </div>
                    <h2 className="mt-2 truncate text-lg font-bold text-slate-900 dark:text-white">{course.title}</h2>
                    <p className="text-xs text-slate-400">{course.language}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-500 dark:text-slate-300">{course.description || 'No description yet.'}</p>
                {course.reviewRequired && course.reviewStatus === 'CHANGES_REQUESTED' && course.reviewNote && (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    <p className="font-black uppercase tracking-wide">Reviewer feedback</p>
                    <p className="mt-1 whitespace-pre-wrap">{course.reviewNote}</p>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-3 text-center dark:divide-surface-indigo dark:bg-surface-raised/40">
                  <div><p className="font-black text-slate-800 dark:text-white">{course.unitCount}</p><p className="text-[10px] uppercase text-slate-400">Units</p></div>
                  <div><p className="font-black text-slate-800 dark:text-white">{course.lessonCount}</p><p className="text-[10px] uppercase text-slate-400">Lessons</p></div>
                  <div><p className="font-black text-slate-800 dark:text-white">{course.challengeCount}</p><p className="text-[10px] uppercase text-slate-400">Questions</p></div>
                </div>

                {isAdmin && course.reviewRequired && course.reviewStatus === 'PENDING' && (
                  <div className="mt-4 space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-200">Ready for your review</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Open the course to inspect its lessons, then approve it or send focused feedback.</p>
                    </div>
                    <Textarea
                      rows={2}
                      maxLength={1000}
                      value={reviewNotes[course.id] || ''}
                      placeholder="Feedback for the teacher (required when requesting changes)"
                      onChange={(event) => setReviewNotes((current) => ({ ...current, [course.id]: event.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" disabled={reviewingId === course.id} className="border-rose-200 text-rose-700 hover:text-rose-800" onClick={() => review(course, 'REQUEST_CHANGES')}>
                        <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" /> Changes
                      </Button>
                      <Button size="sm" disabled={reviewingId === course.id} className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => review(course, 'APPROVE')}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-surface-raised">
                  <Button size="sm" className="flex-1" render={<Link to={`/games/language-quest/manage/${course.id}`} />} nativeButton={false}><Pencil className="mr-1.5 h-3.5 w-3.5" /> {isAdmin && course.reviewStatus === 'PENDING' ? 'Inspect course' : 'Edit'}</Button>
                  <Button size="sm" variant="outline" disabled={duplicatingId === course.id} onClick={() => duplicate(course)} aria-label={`Duplicate ${course.title}`} title="Duplicate as a new draft">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {!course.official && (
                    <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => remove(course)} aria-label={`Delete ${course.title}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
