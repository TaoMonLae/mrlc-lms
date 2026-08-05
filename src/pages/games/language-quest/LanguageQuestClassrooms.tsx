import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  BookOpen,
  BookOpenText,
  CheckCircle2,
  Clipboard,
  Copy,
  ExternalLink,
  Flame,
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { apiGet, apiSend } from '@/src/lib/api';
import {
  languageQuestClassroomChallengeStatus,
  languageQuestClassroomInvitePath,
} from '@/shared/languageQuestClassrooms';

interface FocusCourse {
  id: string;
  title: string;
  imageEmoji: string;
  published?: boolean;
}

interface ClassroomSummary {
  id: string;
  name: string;
  joinCode: string;
  active: boolean;
  memberCount: number;
  teacherName: string;
  focusCourse: FocusCourse | null;
  updatedAt: string;
  canEdit: boolean;
}

interface ClassroomMember {
  userId: string;
  name: string;
  avatarId: string;
  active: boolean;
  joinedAt: string;
  points: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string | null;
  completedChallenges: number;
  focusCompleted: number;
  focusProgressPercent: number;
}

interface ClassroomDetail {
  id: string;
  name: string;
  joinCode: string;
  active: boolean;
  teacherName: string;
  focusCourse: (FocusCourse & { challengeCount: number }) | null;
  challenges: {
    id: string;
    title: string;
    description: string | null;
    targetXp: number;
    rewardLabel: string | null;
    startsAt: string;
    endsAt: string;
    active: boolean;
    progressXp: number;
    progressPercent: number;
    complete: boolean;
  }[];
  members: ClassroomMember[];
}

interface ClassroomPayload {
  courses: FocusCourse[];
  classrooms: ClassroomSummary[];
}

function relativeActivity(value: string | null): string {
  if (!value) return 'No lesson activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No lesson activity yet';
  return `Last practised ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)}`;
}

export default function LanguageQuestClassrooms() {
  const [payload, setPayload] = useState<ClassroomPayload | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<ClassroomDetail | null>(null);
  const [name, setName] = useState('');
  const [focusCourseId, setFocusCourseId] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengeTarget, setChallengeTarget] = useState('300');
  const [challengeDays, setChallengeDays] = useState('7');
  const [challengeReward, setChallengeReward] = useState('');
  const [creatingChallenge, setCreatingChallenge] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [classroomNameDraft, setClassroomNameDraft] = useState('');
  const [updatingClassroom, setUpdatingClassroom] = useState(false);
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterSort, setRosterSort] = useState<'support' | 'name' | 'recent'>('support');
  const [statusNow, setStatusNow] = useState(() => new Date());
  const rosterRequestId = useRef(0);

  const selectedSummary = useMemo(
    () => payload?.classrooms.find((classroom) => classroom.id === selectedId) || null,
    [payload, selectedId],
  );

  const filteredMembers = useMemo(() => {
    const query = rosterQuery.trim().toLocaleLowerCase();
    const members = [...(detail?.members || [])]
      .filter((member) => !query || member.name.toLocaleLowerCase().includes(query));
    members.sort((left, right) => {
      if (rosterSort === 'name') return left.name.localeCompare(right.name);
      if (rosterSort === 'recent') {
        return (right.lastPlayedDate ? new Date(right.lastPlayedDate).getTime() : 0)
          - (left.lastPlayedDate ? new Date(left.lastPlayedDate).getTime() : 0);
      }
      const leftProgress = detail?.focusCourse ? left.focusProgressPercent : left.completedChallenges;
      const rightProgress = detail?.focusCourse ? right.focusProgressPercent : right.completedChallenges;
      return leftProgress - rightProgress || left.name.localeCompare(right.name);
    });
    return members;
  }, [detail?.focusCourse, detail?.members, rosterQuery, rosterSort]);

  const rosterStats = useMemo(() => {
    const members = detail?.members || [];
    const activeLearners = members.filter((member) => member.active).length;
    const averageProgress = members.length && detail?.focusCourse
      ? Math.round(members.reduce((sum, member) => sum + member.focusProgressPercent, 0) / members.length)
      : null;
    const needsSupport = detail?.focusCourse
      ? members.filter((member) => member.focusProgressPercent < 50).length
      : 0;
    return { activeLearners, averageProgress, needsSupport };
  }, [detail]);

  const loadClassrooms = async (preferId?: string) => {
    setLoadError('');
    try {
      const result = await apiGet<ClassroomPayload>('/api/language-quest/classrooms');
      setPayload(result);
      setSelectedId((current) => {
        const next = preferId || current;
        return result.classrooms.some((classroom) => classroom.id === next)
          ? next
          : result.classrooms[0]?.id || '';
      });
    } catch (error: any) {
      const message = error?.message || 'Could not load Language Quest classrooms';
      setLoadError(message);
      toast.error(message);
    }
  };

  useEffect(() => { void loadClassrooms(); }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setStatusNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      rosterRequestId.current += 1;
      setDetail(null);
      return;
    }
    void loadRoster(selectedId);
  }, [selectedId]);

  useEffect(() => {
    setClassroomNameDraft(selectedSummary?.name || '');
    setEditingName(false);
    setRosterQuery('');
  }, [selectedSummary?.id, selectedSummary?.name]);

  const loadRoster = async (classroomId: string) => {
    const requestId = ++rosterRequestId.current;
    setLoadingRoster(true);
    try {
      const result = await apiGet<ClassroomDetail>(`/api/language-quest/classrooms/${classroomId}`);
      if (requestId === rosterRequestId.current) setDetail(result);
      return result;
    } catch (error: any) {
      if (requestId === rosterRequestId.current) {
        setDetail(null);
        toast.error(error?.message || 'Could not load the classroom roster');
      }
      return null;
    } finally {
      if (requestId === rosterRequestId.current) setLoadingRoster(false);
    }
  };

  const createClassroom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const classroom = await apiSend<{ id: string; name: string }>(
        '/api/language-quest/classrooms',
        'POST',
        { name, focusCourseId: focusCourseId || null },
      );
      setName('');
      setFocusCourseId('');
      toast.success(`${classroom.name} created`);
      await loadClassrooms(classroom.id);
    } catch (error: any) {
      toast.error(error?.message || 'Could not create classroom');
    } finally {
      setCreating(false);
    }
  };

  const toggleClassroom = async () => {
    if (!selectedSummary) return;
    setUpdatingClassroom(true);
    try {
      await apiSend(`/api/language-quest/classrooms/${selectedSummary.id}`, 'PATCH', { active: !selectedSummary.active });
      toast.success(selectedSummary.active ? 'Classroom closed' : 'Classroom reopened');
      await Promise.all([
        loadClassrooms(selectedSummary.id),
        loadRoster(selectedSummary.id),
      ]);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update classroom');
    } finally {
      setUpdatingClassroom(false);
    }
  };

  const changeFocus = async (courseId: string) => {
    if (!selectedSummary) return;
    setUpdatingClassroom(true);
    try {
      await apiSend(`/api/language-quest/classrooms/${selectedSummary.id}`, 'PATCH', { focusCourseId: courseId || null });
      toast.success('Focus course updated');
      await Promise.all([
        loadClassrooms(selectedSummary.id),
        loadRoster(selectedSummary.id),
      ]);
    } catch (error: any) {
      toast.error(error?.message || 'Could not update the focus course');
    } finally {
      setUpdatingClassroom(false);
    }
  };

  const saveClassroomName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSummary || !classroomNameDraft.trim() || classroomNameDraft.trim() === selectedSummary.name) {
      setEditingName(false);
      return;
    }
    setUpdatingClassroom(true);
    try {
      await apiSend(`/api/language-quest/classrooms/${selectedSummary.id}`, 'PATCH', {
        name: classroomNameDraft.trim(),
      });
      await Promise.all([
        loadClassrooms(selectedSummary.id),
        loadRoster(selectedSummary.id),
      ]);
      setEditingName(false);
      toast.success('Classroom name updated');
    } catch (error: any) {
      toast.error(error?.message || 'Could not rename the classroom');
    } finally {
      setUpdatingClassroom(false);
    }
  };

  const copyJoinCode = async () => {
    if (!selectedSummary) return;
    try {
      await navigator.clipboard.writeText(selectedSummary.joinCode);
      toast.success('Join code copied');
    } catch {
      toast.info(`Classroom code: ${selectedSummary.joinCode}`);
    }
  };

  const copyInviteLink = async () => {
    if (!selectedSummary) return;
    const inviteUrl = `${window.location.origin}${languageQuestClassroomInvitePath(selectedSummary.joinCode)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success('Classroom invite link copied');
    } catch {
      toast.info(`Invite learners at ${inviteUrl}`);
    }
  };

  const removeMember = async (member: ClassroomMember) => {
    if (!detail || !window.confirm(`Remove ${member.name} from ${detail.name}? Their personal learning progress will not be deleted.`)) return;
    try {
      await apiSend(`/api/language-quest/classrooms/${detail.id}/members/${member.userId}`, 'DELETE');
      setDetail((current) => current
        ? { ...current, members: current.members.filter((item) => item.userId !== member.userId) }
        : current);
      setPayload((current) => current ? {
        ...current,
        classrooms: current.classrooms.map((classroom) => classroom.id === detail.id
          ? { ...classroom, memberCount: Math.max(0, classroom.memberCount - 1) }
          : classroom),
      } : current);
      toast.success(`${member.name} removed from the classroom`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not remove learner');
    }
  };

  const createChallenge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail || !challengeTitle.trim()) return;
    setCreatingChallenge(true);
    try {
      await apiSend(`/api/language-quest/classrooms/${detail.id}/challenges`, 'POST', {
        title: challengeTitle,
        description: challengeDescription,
        targetXp: Number(challengeTarget),
        durationDays: Number(challengeDays),
        rewardLabel: challengeReward,
      });
      setChallengeTitle('');
      setChallengeDescription('');
      setChallengeReward('');
      toast.success('Team challenge started');
      await loadRoster(detail.id);
    } catch (error: any) {
      toast.error(error?.message || 'Could not create the team challenge');
    } finally {
      setCreatingChallenge(false);
    }
  };

  const closeChallenge = async (challengeId: string) => {
    if (!detail) return;
    try {
      await apiSend(
        `/api/language-quest/classrooms/${detail.id}/challenges/${challengeId}`,
        'PATCH',
        { active: false },
      );
      toast.success('Team challenge closed');
      await loadRoster(detail.id);
    } catch (error: any) {
      toast.error(error?.message || 'Could not close the team challenge');
    }
  };

  if (loadError && !payload) {
    return (
      <div className="mx-auto grid min-h-[420px] max-w-lg place-items-center px-4 text-center">
        <div className="rounded-3xl border border-rose-300 bg-rose-50 p-8 shadow-sm dark:border-rose-500/30 dark:bg-rose-950/25">
          <h1 className="text-2xl font-black text-slate-950 dark:text-white">We could not load your classrooms</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
          <Button className="mt-6" onClick={() => { void loadClassrooms(); }}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!payload) {
    return <div className="grid min-h-[420px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
      </Button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-700 via-violet-700 to-fuchsia-700 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Teacher classroom tools</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Language Quest Classrooms</h1>
            <p className="mt-3 text-sm leading-6 text-white/80 sm:text-base">Create a classroom, share its join code, choose a focus course, and quickly see who may need encouragement or extra practice.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/15 px-3 py-2"><Users className="mr-1 inline h-4 w-4" /> Opt-in rosters</span>
            <span className="rounded-full bg-white/15 px-3 py-2"><ShieldCheck className="mr-1 inline h-4 w-4" /> Progress only</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <form onSubmit={createClassroom} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Plus className="h-5 w-5" /></span>
              <div>
                <h2 className="font-black text-slate-950 dark:text-white">New classroom</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">A join code is created automatically.</p>
              </div>
            </div>
            <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Classroom name
              <Input value={name} onChange={(event) => setName(event.target.value.slice(0, 100))} className="mt-2" placeholder="Example: GED English A" />
            </label>
            <label className="mt-4 block text-sm font-bold text-slate-700 dark:text-slate-200">
              Focus course
              <select value={focusCourseId} onChange={(event) => setFocusCourseId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                <option value="">No focus course yet</option>
                {payload.courses.map((course) => <option key={course.id} value={course.id}>{course.imageEmoji} {course.title}</option>)}
              </select>
            </label>
            <Button type="submit" disabled={creating || !name.trim()} className="mt-4 w-full rounded-xl bg-violet-700 font-black text-white hover:bg-violet-800">
              {creating ? 'Creating…' : 'Create classroom'}
            </Button>
          </form>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="font-black text-slate-950 dark:text-white">Your classrooms</h2>
              <p className="mt-1 text-xs text-slate-500">{payload.classrooms.length} total</p>
            </div>
            {payload.classrooms.length === 0 ? (
              <div className="p-8 text-center">
                <GraduationCap className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">Create your first classroom</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {payload.classrooms.map((classroom) => (
                  <button
                    key={classroom.id}
                    type="button"
                    aria-pressed={selectedId === classroom.id}
                    onClick={() => setSelectedId(classroom.id)}
                    className={`w-full px-5 py-4 text-left transition ${selectedId === classroom.id ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950 dark:text-white">{classroom.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{classroom.memberCount} learners • {classroom.teacherName}</p>
                      </div>
                      <Badge variant={classroom.active ? 'default' : 'secondary'}>{classroom.active ? 'Active' : 'Closed'}</Badge>
                    </div>
                    {classroom.focusCourse && <p className="mt-2 truncate text-xs font-semibold text-violet-700 dark:text-violet-300">{classroom.focusCourse.imageEmoji} {classroom.focusCourse.title}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {!selectedSummary ? (
            <div className="grid min-h-[460px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <div>
                <Clipboard className="mx-auto h-12 w-12 text-slate-300" />
                <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Select or create a classroom</h2>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    {editingName ? (
                      <form onSubmit={saveClassroomName} className="flex max-w-xl flex-wrap items-center gap-2">
                        <Input
                          autoFocus
                          value={classroomNameDraft}
                          onChange={(event) => setClassroomNameDraft(event.target.value.slice(0, 100))}
                          maxLength={100}
                          aria-label="Classroom name"
                          className="h-10 min-w-56 flex-1 text-lg font-black"
                        />
                        <Button type="submit" size="sm" disabled={updatingClassroom || !classroomNameDraft.trim()}><Save className="mr-2 h-4 w-4" /> Save</Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => { setEditingName(false); setClassroomNameDraft(selectedSummary.name); }} aria-label="Cancel renaming"><X className="h-4 w-4" /></Button>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{selectedSummary.name}</h2>
                        {selectedSummary.canEdit && (
                          <Button size="icon" variant="ghost" onClick={() => setEditingName(true)} aria-label="Rename classroom"><Pencil className="h-4 w-4" /></Button>
                        )}
                        <Badge variant={selectedSummary.active ? 'default' : 'secondary'}>{selectedSummary.active ? 'Accepting learners' : 'Closed'}</Badge>
                      </div>
                    )}
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Teacher: {selectedSummary.teacherName}</p>
                  </div>
                  {selectedSummary.canEdit && (
                    <Button variant="outline" onClick={toggleClassroom} disabled={updatingClassroom}>
                      {selectedSummary.active ? 'Close classroom' : 'Reopen classroom'}
                    </Button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-600 p-4 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Learner join code</p>
                    <p className="mt-2 font-mono text-2xl font-black tracking-[0.2em]">{selectedSummary.joinCode}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={copyJoinCode} className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white">
                        <Copy className="mr-2 h-4 w-4" /> Copy code
                      </Button>
                      <Button size="sm" variant="outline" onClick={copyInviteLink} disabled={!selectedSummary.active} className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white disabled:text-white/60">
                        <Link2 className="mr-2 h-4 w-4" /> Copy invite link
                      </Button>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-white/70">The invite opens the learner classroom tab with this code ready to join.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    <label>
                      Focus course
                      <select
                        value={selectedSummary.focusCourse?.id || ''}
                        onChange={(event) => changeFocus(event.target.value)}
                        disabled={!selectedSummary.canEdit || updatingClassroom}
                        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">No focus course</option>
                        {selectedSummary.focusCourse && !payload.courses.some((course) => course.id === selectedSummary.focusCourse?.id) && (
                          <option value={selectedSummary.focusCourse.id}>{selectedSummary.focusCourse.imageEmoji} {selectedSummary.focusCourse.title} (assigned draft)</option>
                        )}
                        {payload.courses.map((course) => <option key={course.id} value={course.id}>{course.imageEmoji} {course.title}</option>)}
                      </select>
                    </label>
                    {selectedSummary.focusCourse?.published === false && (
                      <p className="mt-2 rounded-lg bg-amber-100 px-2.5 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">This assigned course is in draft. Joined learners keep access while it is reviewed.</p>
                    )}
                    {selectedSummary.focusCourse ? (
                      <Button variant="outline" size="sm" className="mt-3 w-full" render={<Link to={`/games/language-quest/courses/${selectedSummary.focusCourse.id}`} />} nativeButton={false}>
                        <BookOpen className="mr-2 h-4 w-4" /> Open focus course <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <p className="mt-3 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">Choose a course to give joined learners a direct classroom course link.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-500/20 dark:from-amber-950/20 dark:to-orange-950/15 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white"><Target className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-xl font-black text-slate-950 dark:text-white">Classroom XP challenges</h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Set a cooperative goal. Every learner’s eligible XP contributes—there is no public messaging or individual pressure.</p>
                  </div>
                </div>

                {selectedSummary.canEdit && (
                  <form onSubmit={createChallenge} className="mt-5 grid gap-3 rounded-2xl bg-white p-4 dark:bg-slate-900 md:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Challenge title
                      <Input value={challengeTitle} onChange={(event) => setChallengeTitle(event.target.value.slice(0, 120))} className="mt-1.5" placeholder="Finish strong this week" />
                    </label>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Team reward (optional)
                      <Input value={challengeReward} onChange={(event) => setChallengeReward(event.target.value.slice(0, 80))} className="mt-1.5" placeholder="Homework pass or class cheer" />
                    </label>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 md:col-span-2">
                      Description (optional)
                      <Textarea value={challengeDescription} onChange={(event) => setChallengeDescription(event.target.value.slice(0, 300))} rows={2} className="mt-1.5 resize-none" placeholder="Explain what the class is working toward." />
                    </label>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Target XP
                      <Input type="number" min={30} max={10000} value={challengeTarget} onChange={(event) => setChallengeTarget(event.target.value)} className="mt-1.5" />
                    </label>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Duration
                      <select value={challengeDays} onChange={(event) => setChallengeDays(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                        <option value="3">3 days</option>
                        <option value="7">1 week</option>
                        <option value="14">2 weeks</option>
                        <option value="30">1 month</option>
                      </select>
                    </label>
                    <Button type="submit" disabled={creatingChallenge || !challengeTitle.trim() || !selectedSummary.active} className="md:col-span-2">
                      <Trophy className="mr-2 h-4 w-4" /> {creatingChallenge ? 'Starting…' : 'Start team challenge'}
                    </Button>
                  </form>
                )}

                <div className="mt-4 grid gap-3">
                  {!detail?.challenges.length ? (
                    <p className="rounded-2xl border border-dashed border-amber-300 p-5 text-center text-sm text-slate-500 dark:border-amber-500/25 dark:text-slate-300">No classroom challenges yet.</p>
                  ) : detail.challenges.map((challenge) => {
                    const status = languageQuestClassroomChallengeStatus(challenge, statusNow);
                    const statusLabel = status.charAt(0) + status.slice(1).toLowerCase();
                    return (
                    <article key={challenge.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-slate-950 dark:text-white">{challenge.title}</h3>
                            <Badge variant={status === 'COMPLETED' ? 'default' : status === 'ACTIVE' || status === 'UPCOMING' ? 'outline' : 'secondary'}>
                              {statusLabel}
                            </Badge>
                          </div>
                          {challenge.description && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{challenge.description}</p>}
                          <p className="mt-1 text-xs text-slate-500">{status === 'UPCOMING' ? 'Starts' : 'Ends'} {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(status === 'UPCOMING' ? challenge.startsAt : challenge.endsAt))}</p>
                        </div>
                        {(status === 'ACTIVE' || status === 'UPCOMING') && selectedSummary.canEdit && <Button size="sm" variant="ghost" onClick={() => closeChallenge(challenge.id)}>Close</Button>}
                      </div>
                      <Progress value={challenge.progressPercent} className="mt-3" />
                      <div className="mt-2 flex justify-between gap-3 text-xs font-bold text-slate-500">
                        <span>{challenge.progressXp}/{challenge.targetXp} XP</span>
                        {challenge.rewardLabel && <span className="text-amber-700 dark:text-amber-300">Reward: {challenge.rewardLabel}</span>}
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-black text-slate-950 dark:text-white">Learner roster</h2>
                      <p className="mt-1 text-xs text-slate-500">{detail?.members.length || 0} learners joined with the classroom code</p>
                    </div>
                    <Button size="icon" variant="ghost" disabled={loadingRoster} onClick={() => { if (selectedId) void loadRoster(selectedId); }} aria-label="Refresh roster"><RefreshCw className={`h-4 w-4 ${loadingRoster ? 'animate-spin' : ''}`} /></Button>
                  </div>
                  {!!detail?.members.length && (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Active accounts</p>
                          <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{rosterStats.activeLearners}/{detail.members.length}</p>
                        </div>
                        {detail.focusCourse && (
                          <>
                            <div className="rounded-xl bg-violet-50 px-3 py-2 dark:bg-violet-500/10">
                              <p className="text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300">Average progress</p>
                              <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{rosterStats.averageProgress}%</p>
                            </div>
                            <div className="col-span-2 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-500/10 sm:col-span-1">
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">Below 50%</p>
                              <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{rosterStats.needsSupport}</p>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px]">
                        <label className="relative">
                          <span className="sr-only">Search learners</span>
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input value={rosterQuery} onChange={(event) => setRosterQuery(event.target.value)} className="pl-9" placeholder="Search learners…" />
                        </label>
                        <label>
                          <span className="sr-only">Sort learners</span>
                          <select value={rosterSort} onChange={(event) => setRosterSort(event.target.value as typeof rosterSort)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                            <option value="support">{detail.focusCourse ? 'Needs support first' : 'Fewest practices first'}</option>
                            <option value="name">Name A–Z</option>
                            <option value="recent">Most recent activity</option>
                          </select>
                        </label>
                      </div>
                    </>
                  )}
                </div>
                {loadingRoster ? (
                  <div className="grid min-h-56 place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>
                ) : !detail?.members.length ? (
                  <div className="p-12 text-center">
                    <Users className="mx-auto h-11 w-11 text-slate-300" />
                    <p className="mt-3 font-black text-slate-800 dark:text-white">No learners have joined yet</p>
                    <p className="mt-1 text-sm text-slate-500">Share the join code above. Learners enter it from their Language Quest profile.</p>
                  </div>
                ) : !filteredMembers.length ? (
                  <div className="p-10 text-center">
                    <Search className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-black text-slate-800 dark:text-white">No learners match “{rosterQuery}”</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRosterQuery('')}>Clear search</Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMembers.map((member) => (
                      <article key={member.userId} className="p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                          <LanguageQuestAvatar avatarId={member.avatarId} name={member.name} className="h-12 w-12 text-2xl" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-black text-slate-950 dark:text-white">{member.name}</h3>
                                  {!member.active && <Badge variant="destructive">Inactive</Badge>}
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{relativeActivity(member.lastPlayedDate)}</p>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs font-bold">
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Star className="mr-1 inline h-3 w-3" /> {member.points}</span>
                                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"><Flame className="mr-1 inline h-3 w-3" /> {member.currentStreak} days</span>
                              </div>
                            </div>

                            {detail.focusCourse ? (
                              <div className="mt-4">
                                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-300">
                                  <span>{detail.focusCourse.imageEmoji} {detail.focusCourse.title}</span>
                                  <span>{member.focusCompleted}/{detail.focusCourse.challengeCount} practices</span>
                                </div>
                                <Progress value={member.focusProgressPercent} />
                              </div>
                            ) : (
                              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-500" /> {member.completedChallenges} practices completed across Language Quest</p>
                            )}
                            {detail.focusCourse && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-3"
                                render={<Link to={`/games/language-quest/words?classroomId=${detail.id}&learnerId=${member.userId}`} />}
                                nativeButton={false}
                              >
                                <BookOpenText className="mr-2 h-4 w-4" /> Review learned words
                              </Button>
                            )}
                          </div>
                          {selectedSummary.canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => removeMember(member)} className="shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10" aria-label={`Remove ${member.name}`}><UserMinus className="h-4 w-4" /></Button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
