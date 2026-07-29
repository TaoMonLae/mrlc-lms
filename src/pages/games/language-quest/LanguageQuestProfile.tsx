import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  DoorOpen,
  Flame,
  GraduationCap,
  ShieldCheck,
  Star,
  Trophy,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LANGUAGE_QUEST_AVATARS } from '@/shared/languageQuestAvatars';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { apiGet, apiSend } from '@/src/lib/api';
import { useAuth } from '@/src/providers/AuthProvider';
import type { LanguageQuestProfile as ProgressProfile } from '@/src/types/languageQuest';
import { LanguageQuestRewardCollection } from '@/src/components/games/LanguageQuestRewards';

interface LearnerClassroom {
  id: string;
  name: string;
  active: boolean;
  joinedAt: string;
  teacherName: string;
  focusCourse: { id: string; title: string; imageEmoji: string } | null;
}

interface LearnerProfilePayload {
  id: string;
  name: string;
  email: string;
  isExternalLearner: boolean;
  avatarId: string;
  bio: string;
  profile: ProgressProfile;
  classrooms: LearnerClassroom[];
}

export default function LanguageQuestProfile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<LearnerProfilePayload | null>(null);
  const [avatarId, setAvatarId] = useState('owl');
  const [bio, setBio] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    apiGet<LearnerProfilePayload>('/api/language-quest/profile')
      .then((payload) => {
        setProfile(payload);
        setAvatarId(payload.avatarId);
        setBio(payload.bio);
      })
      .catch((error: any) => {
        const message = error?.message || 'Could not load your learner profile';
        setLoadError(message);
        toast.error(message);
      });
  };

  useEffect(load, []);

  useEffect(() => {
    if (!profile || window.location.hash !== '#quest-cards') return;
    window.requestAnimationFrame(() => {
      document.getElementById('quest-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await apiSend<{ avatarId: string; bio: string }>(
        '/api/language-quest/profile',
        'PATCH',
        { avatarId, bio },
      );
      setProfile((current) => current ? { ...current, avatarId: result.avatarId, bio: result.bio } : current);
      updateUser({ languageQuestAvatar: result.avatarId });
      toast.success('Learner profile saved');
    } catch (error: any) {
      toast.error(error?.message || 'Could not save your learner profile');
    } finally {
      setSaving(false);
    }
  };

  const joinClassroom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const classroom = await apiSend<{ name: string; teacherName: string }>(
        '/api/language-quest/profile/classrooms',
        'POST',
        { joinCode },
      );
      setJoinCode('');
      toast.success(`Joined ${classroom.name} with ${classroom.teacherName}`);
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Could not join that classroom');
    } finally {
      setJoining(false);
    }
  };

  const leaveClassroom = async (classroom: LearnerClassroom) => {
    if (!window.confirm(`Leave ${classroom.name}? Your learning progress will stay in your account.`)) return;
    try {
      await apiSend(`/api/language-quest/profile/classrooms/${classroom.id}`, 'DELETE');
      setProfile((current) => current
        ? { ...current, classrooms: current.classrooms.filter((item) => item.id !== classroom.id) }
        : current);
      toast.success(`Left ${classroom.name}`);
    } catch (error: any) {
      toast.error(error?.message || 'Could not leave that classroom');
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto grid min-h-[420px] max-w-lg place-items-center px-4 text-center">
        <div className="rounded-3xl border border-rose-300 bg-rose-50 p-8 shadow-sm dark:border-rose-500/30 dark:bg-rose-950/25">
          <h1 className="text-2xl font-black text-slate-950 dark:text-white">We could not load your profile</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
          <Button className="mt-6" onClick={load}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="grid min-h-[420px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;
  }

  const changed = avatarId !== profile.avatarId || bio !== profile.bio;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
      </Button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-800 via-fuchsia-700 to-sky-600 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <LanguageQuestAvatar avatarId={avatarId} name={profile.name} className="h-24 w-24 text-5xl sm:h-28 sm:w-28 sm:text-6xl" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Learner profile</p>
            <h1 className="mt-2 truncate text-3xl font-black sm:text-4xl">{profile.name}</h1>
            <p className="mt-1 truncate text-sm text-white/75">{profile.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="border-amber-200/25 bg-amber-300/20 text-white hover:bg-amber-300/20"><Trophy className="h-3 w-3" /> Level {profile.profile.rewards.level} • {profile.profile.rewards.title}</Badge>
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15"><Star className="h-3 w-3" /> {profile.profile.points} XP</Badge>
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15"><Flame className="h-3 w-3" /> {profile.profile.currentStreak}-day streak</Badge>
              {profile.isExternalLearner && <Badge className="border-emerald-200/25 bg-emerald-300/20 text-white hover:bg-emerald-300/20"><ShieldCheck className="h-3 w-3" /> Learning-only account</Badge>}
            </div>
          </div>
        </div>
      </section>

      <LanguageQuestRewardCollection rewards={profile.profile.rewards} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><UserRound className="h-5 w-5" /></span>
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">Choose your Language Quest avatar</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Pick a friendly built-in character. Language Quest does not accept profile-photo uploads.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {LANGUAGE_QUEST_AVATARS.map((avatar) => {
            const selected = avatarId === avatar.id;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setAvatarId(avatar.id)}
                aria-pressed={selected}
                className={`relative rounded-2xl border p-3 text-center transition hover:-translate-y-1 hover:shadow-lg ${selected ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200 dark:bg-violet-500/10 dark:ring-violet-500/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}
              >
                <LanguageQuestAvatar avatarId={avatar.id} className="mx-auto h-14 w-14 text-3xl" />
                <span className="mt-2 block text-[11px] font-bold leading-4 text-slate-700 dark:text-slate-200">{avatar.label}</span>
                {selected && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-600 text-white"><Check className="h-3 w-3" /></span>}
              </button>
            );
          })}
        </div>

        <label className="mt-6 block text-sm font-bold text-slate-700 dark:text-slate-200">
          About my learning
          <Textarea
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, 240))}
            rows={3}
            className="mt-2 resize-none"
            placeholder="Example: I am learning English for school and everyday conversations."
          />
          <span className="mt-1 block text-right text-xs font-medium text-slate-400">{bio.length}/240</span>
        </label>

        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={!changed || saving} className="rounded-xl bg-violet-700 font-black text-white hover:bg-violet-800">
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-sky-200 bg-sky-50/80 p-5 shadow-sm dark:border-sky-500/20 dark:bg-sky-950/25 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-600 text-white"><GraduationCap className="h-5 w-5" /></span>
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">My classrooms</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">A teacher can share an eight-character code. Joining lets that teacher see your Language Quest points, streak, activity date, and progress in the class focus course.</p>
          </div>
        </div>

        <form onSubmit={joinClassroom} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="language-quest-class-code">Classroom join code</label>
          <div className="relative flex-1">
            <Copy className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600" />
            <Input
              id="language-quest-class-code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              maxLength={8}
              className="h-12 pl-10 font-mono text-base font-black uppercase tracking-[0.2em]"
              placeholder="JOINCODE"
            />
          </div>
          <Button type="submit" disabled={joining || joinCode.length < 6} className="h-12 rounded-xl bg-sky-600 font-black text-white hover:bg-sky-700">
            {joining ? 'Joining…' : 'Join classroom'}
          </Button>
        </form>

        <div className="mt-5 grid gap-3">
          {profile.classrooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sky-300 bg-white/60 p-7 text-center dark:border-sky-500/30 dark:bg-slate-900/50">
              <BookOpen className="mx-auto h-8 w-8 text-sky-400" />
              <p className="mt-2 font-bold text-slate-800 dark:text-white">You have not joined a classroom yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You can still learn independently.</p>
            </div>
          ) : profile.classrooms.map((classroom) => (
            <article key={classroom.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-sky-200 bg-white p-4 dark:border-sky-500/20 dark:bg-slate-900 sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-slate-950 dark:text-white">{classroom.name}</h3>
                  <Badge variant={classroom.active ? 'default' : 'secondary'}>{classroom.active ? 'Active' : 'Closed'}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Teacher: {classroom.teacherName}</p>
                {classroom.focusCourse && <p className="mt-1 text-sm font-semibold text-violet-700 dark:text-violet-300">{classroom.focusCourse.imageEmoji} Focus: {classroom.focusCourse.title}</p>}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => leaveClassroom(classroom)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10">
                <DoorOpen className="mr-2 h-4 w-4" /> Leave
              </Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
