import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, EyeOff, Languages, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiGet, apiSend } from '@/src/lib/api';

interface ManagedCourse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  language: string;
  imageEmoji: string;
  accentColor: string;
  published: boolean;
  official: boolean;
  updatedAt: string;
  unitCount: number;
  lessonCount: number;
  challengeCount: number;
}

export default function LanguageQuestManage() {
  const [courses, setCourses] = useState<ManagedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<ManagedCourse[]>('/api/language-quest/manage/courses')
      .then((rows) => setCourses(Array.isArray(rows) ? rows : []))
      .catch((error: any) => toast.error(error?.message || 'Could not load your courses'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

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
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Create playful courses and publish them for everyone in the LMS.</p>
        </div>
        <Button render={<Link to="/games/language-quest/manage/new" />} nativeButton={false}>
          <Plus className="mr-2 h-4 w-4" /> New Course
        </Button>
      </div>

      {loading ? (
        <div className="grid min-h-[320px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Create your first course</h2>
          <p className="mt-1 text-sm text-slate-500">Add units, lessons, and quick multiple-choice challenges.</p>
          <Button className="mt-5" render={<Link to="/games/language-quest/manage/new" />} nativeButton={false}><Plus className="mr-2 h-4 w-4" /> New Course</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <article key={course.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
              <div className="h-2" style={{ backgroundColor: course.accentColor }} />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: `${course.accentColor}18` }}>{course.imageEmoji}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={course.published ? 'default' : 'outline'}>
                        {course.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {course.published ? 'Published' : 'Draft'}
                      </Badge>
                      {course.official && <Badge variant="secondary">Official</Badge>}
                    </div>
                    <h2 className="mt-2 truncate text-lg font-bold text-slate-900 dark:text-white">{course.title}</h2>
                    <p className="text-xs text-slate-400">{course.language}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm text-slate-500 dark:text-slate-300">{course.description || 'No description yet.'}</p>
                <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-3 text-center dark:divide-surface-indigo dark:bg-surface-raised/40">
                  <div><p className="font-black text-slate-800 dark:text-white">{course.unitCount}</p><p className="text-[10px] uppercase text-slate-400">Units</p></div>
                  <div><p className="font-black text-slate-800 dark:text-white">{course.lessonCount}</p><p className="text-[10px] uppercase text-slate-400">Lessons</p></div>
                  <div><p className="font-black text-slate-800 dark:text-white">{course.challengeCount}</p><p className="text-[10px] uppercase text-slate-400">Questions</p></div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4 dark:border-surface-raised">
                  <Button size="sm" className="flex-1" render={<Link to={`/games/language-quest/manage/${course.id}`} />} nativeButton={false}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
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
