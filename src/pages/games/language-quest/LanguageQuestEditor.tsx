import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Plus, Save, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '@/src/lib/api';

interface EditorOption {
  _key: string;
  id?: string;
  text: string;
  correct: boolean;
  emoji: string;
  audioText: string;
}

// Course Studio only offers authoring for SELECT/ASSIST today -- CLOZE,
// ODD_ONE_OUT, and REORDER challenges (built by generator scripts) can still
// be loaded here without corrupting them, but this editor has no UI to
// create or change into those types yet.
interface EditorChallenge {
  _key: string;
  id?: string;
  type: 'SELECT' | 'ASSIST' | 'CLOZE' | 'ODD_ONE_OUT' | 'REORDER';
  question: string;
  options: EditorOption[];
}

interface EditorLesson {
  _key: string;
  id?: string;
  title: string;
  description: string;
  challenges: EditorChallenge[];
}

interface EditorUnit {
  _key: string;
  id?: string;
  title: string;
  description: string;
  lessons: EditorLesson[];
}

interface EditorCourse {
  title: string;
  description: string;
  language: string;
  category: string;
  imageEmoji: string;
  accentColor: string;
  published: boolean;
  units: EditorUnit[];
}

const key = () => crypto.randomUUID();
const newOption = (correct = false): EditorOption => ({ _key: key(), text: '', correct, emoji: '', audioText: '' });
const newChallenge = (): EditorChallenge => ({
  _key: key(), type: 'SELECT', question: '',
  options: [newOption(true), newOption(), newOption()],
});
const newLesson = (): EditorLesson => ({ _key: key(), title: '', description: '', challenges: [newChallenge()] });
const newUnit = (): EditorUnit => ({ _key: key(), title: '', description: '', lessons: [newLesson()] });
const emptyCourse = (): EditorCourse => ({
  title: '', description: '', language: 'English', category: 'English Courses',
  imageEmoji: '🌍', accentColor: '#7c3aed', published: false, units: [newUnit()],
});

function hydrateCourse(raw: any): EditorCourse {
  return {
    title: raw?.title || '', description: raw?.description || '', language: raw?.language || '',
    category: raw?.category || 'Other Courses',
    imageEmoji: raw?.imageEmoji || '🌍', accentColor: raw?.accentColor || '#7c3aed', published: Boolean(raw?.published),
    units: (raw?.units || []).map((unit: any) => ({
      _key: key(), id: unit.id, title: unit.title || '', description: unit.description || '',
      lessons: (unit.lessons || []).map((lesson: any) => ({
        _key: key(), id: lesson.id, title: lesson.title || '', description: lesson.description || '',
        challenges: (lesson.challenges || []).map((challenge: any) => ({
          // Preserve whatever type the challenge actually has -- collapsing
          // anything that isn't 'ASSIST' down to 'SELECT' would silently
          // corrupt CLOZE/ODD_ONE_OUT/REORDER challenges the moment this
          // course is opened and saved here, even without touching them.
          _key: key(),
          id: challenge.id,
          type: ['SELECT', 'ASSIST', 'CLOZE', 'ODD_ONE_OUT', 'REORDER'].includes(challenge.type) ? challenge.type : 'SELECT',
          question: challenge.question || '',
          options: (challenge.options || []).map((option: any) => ({
            _key: key(), id: option.id, text: option.text || '', correct: Boolean(option.correct), emoji: option.emoji || '', audioText: option.audioText || '',
          })),
        })),
      })),
    })),
  };
}

function OptionEditor({ option, index, canRemove, onChange, onRemove, onCorrect }: {
  option: EditorOption; index: number; canRemove: boolean;
  onChange: (next: EditorOption) => void; onRemove: () => void; onCorrect: () => void;
}) {
  return (
    <div className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-[44px_1fr_1fr_auto] ${option.correct ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-surface-raised'}`}>
      <button
        type="button"
        onClick={onCorrect}
        className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black ${option.correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-400 dark:border-slate-600'}`}
        aria-label={`Mark option ${index + 1} as correct`}
      >
        {option.correct ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
      </button>
      <div className="flex gap-2">
        <Input className="w-14 shrink-0 text-center text-lg" value={option.emoji} maxLength={16} placeholder="🌟" onChange={(event) => onChange({ ...option, emoji: event.target.value })} aria-label={`Option ${index + 1} emoji`} />
        <Input value={option.text} maxLength={500} placeholder={`Answer option ${index + 1}`} onChange={(event) => onChange({ ...option, text: event.target.value })} aria-label={`Option ${index + 1} text`} />
      </div>
      <div className="relative">
        <Volume2 className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-slate-400" />
        <Input className="pl-8" value={option.audioText} maxLength={500} placeholder="Audio text (optional)" onChange={(event) => onChange({ ...option, audioText: event.target.value })} aria-label={`Option ${index + 1} audio text`} />
      </div>
      <Button type="button" variant="ghost" size="icon" disabled={!canRemove} className="text-rose-500" onClick={onRemove} aria-label={`Remove option ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function ChallengeEditor({ challenge, index, onChange, onRemove }: {
  challenge: EditorChallenge; index: number; onChange: (next: EditorChallenge) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(!challenge.id);
  const updateOption = (optionKey: string, next: EditorOption) => onChange({ ...challenge, options: challenge.options.map((option) => option._key === optionKey ? next : option) });
  const markCorrect = (optionKey: string) => onChange({ ...challenge, options: challenge.options.map((option) => ({ ...option, correct: option._key === optionKey })) });
  const removeOption = (optionKey: string) => {
    const removedWasCorrect = challenge.options.find((option) => option._key === optionKey)?.correct;
    const remaining = challenge.options.filter((option) => option._key !== optionKey);
    onChange({
      ...challenge,
      options: removedWasCorrect && remaining.length && !remaining.some((option) => option.correct)
        ? remaining.map((option, i) => (i === 0 ? { ...option, correct: true } : option))
        : remaining,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-surface-raised dark:bg-surface-raised/20">
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-xs font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" onClick={() => setOpen((value) => !value)}>{index + 1}</button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{challenge.question || `New challenge ${index + 1}`}</p>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Collapse challenge' : 'Expand challenge'}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={onRemove} aria-label="Remove challenge"><Trash2 className="h-4 w-4" /></Button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-surface-raised">
          <div className="space-y-1.5">
            <Label htmlFor={`challenge-${challenge._key}`}>Question</Label>
            <Textarea id={`challenge-${challenge._key}`} value={challenge.question} maxLength={1000} rows={2} placeholder="What should the learner choose?" onChange={(event) => onChange({ ...challenge, question: event.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Answer options</p>
              <p className="text-xs text-slate-400">Select the circle beside the correct answer.</p>
            </div>
            <Button type="button" size="sm" variant="outline" disabled={challenge.options.length >= 6} onClick={() => onChange({ ...challenge, options: [...challenge.options, newOption()] })}><Plus className="mr-1 h-3.5 w-3.5" /> Option</Button>
          </div>
          <div className="space-y-2">
            {challenge.options.map((option, optionIndex) => (
              <OptionEditor key={option._key} option={option} index={optionIndex} canRemove={challenge.options.length > 2} onChange={(next) => updateOption(option._key, next)} onRemove={() => removeOption(option._key)} onCorrect={() => markCorrect(option._key)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonEditor({ lesson, index, onChange, onRemove }: {
  lesson: EditorLesson; index: number; onChange: (next: EditorLesson) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(!lesson.id);
  const updateChallenge = (challengeKey: string, next: EditorChallenge) => onChange({ ...lesson, challenges: lesson.challenges.map((challenge) => challenge._key === challengeKey ? next : challenge) });
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-surface-raised dark:bg-surface-indigo">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-surface-raised dark:text-slate-200">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{lesson.title || `New lesson ${index + 1}`}</p>
          <p className="text-xs text-slate-400">{lesson.challenges.length} challenge{lesson.challenges.length === 1 ? '' : 's'}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen((value) => !value)}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </div>
      {open && (
        <div className="space-y-4 border-t border-slate-100 p-4 dark:border-surface-raised">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Lesson title</Label><Input value={lesson.title} maxLength={160} placeholder="e.g. Friendly greetings" onChange={(event) => onChange({ ...lesson, title: event.target.value })} /></div>
            <div className="space-y-1.5"><Label>Short description</Label><Input value={lesson.description} maxLength={500} placeholder="What learners will practise" onChange={(event) => onChange({ ...lesson, description: event.target.value })} /></div>
          </div>
          <div className="space-y-3">
            {lesson.challenges.map((challenge, challengeIndex) => (
              <ChallengeEditor key={challenge._key} challenge={challenge} index={challengeIndex} onChange={(next) => updateChallenge(challenge._key, next)} onRemove={() => onChange({ ...lesson, challenges: lesson.challenges.filter((item) => item._key !== challenge._key) })} />
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => onChange({ ...lesson, challenges: [...lesson.challenges, newChallenge()] })}><Plus className="mr-2 h-4 w-4" /> Add challenge</Button>
        </div>
      )}
    </div>
  );
}

function UnitEditor({ unit, index, onChange, onRemove }: {
  unit: EditorUnit; index: number; onChange: (next: EditorUnit) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const updateLesson = (lessonKey: string, next: EditorLesson) => onChange({ ...unit, lessons: unit.lessons.map((lesson) => lesson._key === lessonKey ? next : lesson) });
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm dark:border-surface-raised dark:bg-surface-raised/20">
      <header className="flex items-center gap-3 p-4 sm:p-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-600 font-black text-white">{index + 1}</div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold text-slate-900 dark:text-white">{unit.title || `New unit ${index + 1}`}</h2>
          <p className="text-xs text-slate-400">{unit.lessons.length} lesson{unit.lessons.length === 1 ? '' : 's'}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button>
        <Button type="button" variant="ghost" size="icon" className="text-rose-500" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
      </header>
      {open && (
        <div className="space-y-4 border-t border-slate-200 p-4 sm:p-5 dark:border-surface-raised">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Unit title</Label><Input value={unit.title} maxLength={160} placeholder="e.g. Everyday Basics" onChange={(event) => onChange({ ...unit, title: event.target.value })} /></div>
            <div className="space-y-1.5"><Label>Short description</Label><Input value={unit.description} maxLength={500} placeholder="What this unit covers" onChange={(event) => onChange({ ...unit, description: event.target.value })} /></div>
          </div>
          <div className="space-y-3">
            {unit.lessons.map((lesson, lessonIndex) => (
              <LessonEditor key={lesson._key} lesson={lesson} index={lessonIndex} onChange={(next) => updateLesson(lesson._key, next)} onRemove={() => onChange({ ...unit, lessons: unit.lessons.filter((item) => item._key !== lesson._key) })} />
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => onChange({ ...unit, lessons: [...unit.lessons, newLesson()] })}><Plus className="mr-2 h-4 w-4" /> Add lesson</Button>
        </div>
      )}
    </section>
  );
}

export default function LanguageQuestEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [course, setCourse] = useState<EditorCourse>(emptyCourse);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiGet(`/api/language-quest/manage/courses/${id}`)
      .then((payload) => setCourse(hydrateCourse(payload)))
      .catch((error: any) => toast.error(error?.message || 'Could not load the course'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateUnit = (unitKey: string, next: EditorUnit) => setCourse((current) => ({ ...current, units: current.units.map((unit) => unit._key === unitKey ? next : unit) }));

  const save = async () => {
    if (!course.title.trim()) { toast.error('Give the course a title'); return; }
    if (!course.language.trim()) { toast.error('Enter the language being taught'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await apiSend(`/api/language-quest/manage/courses/${id}`, 'PUT', course);
        toast.success(course.published ? 'Course saved and published' : 'Draft saved');
      } else {
        const result = await apiSend<{ id: string }>('/api/language-quest/manage/courses', 'POST', course);
        toast.success(course.published ? 'Course created and published' : 'Course draft created');
        navigate(`/games/language-quest/manage/${result.id}`, { replace: true });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not save the course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link to="/games/language-quest/manage" />} nativeButton={false}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-black text-slate-900 dark:text-white">{isEdit ? 'Edit Course' : 'New Course'}</h1><p className="text-sm text-slate-500">Build from units → lessons → challenges.</p></div>
        </div>
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save course'}</Button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-surface-raised dark:bg-surface-indigo">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_90px_90px]">
          <div className="space-y-1.5"><Label htmlFor="course-title">Course title</Label><Input id="course-title" value={course.title} maxLength={120} placeholder="Everyday English" onChange={(event) => setCourse({ ...course, title: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="course-language">Language</Label><Input id="course-language" value={course.language} maxLength={80} placeholder="English" onChange={(event) => setCourse({ ...course, language: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="course-category">Category</Label><Input id="course-category" value={course.category} maxLength={80} placeholder="English Courses" onChange={(event) => setCourse({ ...course, category: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="course-emoji">Icon</Label><Input id="course-emoji" className="text-center text-xl" value={course.imageEmoji} maxLength={16} onChange={(event) => setCourse({ ...course, imageEmoji: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="course-color">Colour</Label><Input id="course-color" type="color" className="h-8 p-1" value={course.accentColor} onChange={(event) => setCourse({ ...course, accentColor: event.target.value })} /></div>
        </div>
        <div className="mt-4 space-y-1.5"><Label htmlFor="course-description">Description</Label><Textarea id="course-description" value={course.description} maxLength={1000} rows={2} placeholder="What will people learn in this course?" onChange={(event) => setCourse({ ...course, description: event.target.value })} /></div>
        <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-surface-raised dark:bg-surface-raised/30">
          <div><Label htmlFor="course-published" className="text-sm font-semibold">Published for everyone</Label><p className="mt-0.5 text-xs text-slate-500">Draft courses are only visible in Course Studio. Publish after the lessons are ready.</p></div>
          <Switch id="course-published" checked={course.published} onCheckedChange={(checked) => setCourse({ ...course, published: checked })} />
        </div>
      </section>

      <div className="space-y-5">
        {course.units.map((unit, unitIndex) => (
          <UnitEditor key={unit._key} unit={unit} index={unitIndex} onChange={(next) => updateUnit(unit._key, next)} onRemove={() => setCourse((current) => ({ ...current, units: current.units.filter((item) => item._key !== unit._key) }))} />
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full border-2 border-dashed py-6" onClick={() => setCourse((current) => ({ ...current, units: [...current.units, newUnit()] }))}><Plus className="mr-2 h-4 w-4" /> Add unit</Button>

      <div className="fixed bottom-4 right-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-surface-raised dark:bg-surface-indigo/95">
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : course.published ? 'Save & publish' : 'Save draft'}</Button>
      </div>
    </div>
  );
}
