import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, BookOpen, CalendarDays, Clock3, Flame, Heart, LockKeyhole,
  ShieldCheck, Star, Trophy, UserMinus, UserPlus, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { apiGet, apiSend } from '@/src/lib/api';
import type { LanguageQuestRelationship } from '@/shared/languageQuestSocial';
import type { LanguageQuestProfile } from '@/src/types/languageQuest';

interface PublicProfilePayload {
  id: string;
  name: string;
  avatarId: string;
  bio: string;
  joinedAt: string;
  relationship: LanguageQuestRelationship;
  friendsCount: number;
  profile: LanguageQuestProfile;
  activeCourse: {
    id: string;
    title: string;
    language: string;
    category: string;
    imageEmoji: string;
    accentColor: string;
  } | null;
  courseVisible: boolean;
}

function joinedLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Learning Quest member'
    : 'Joined ' + new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function actionCopy(relationship: LanguageQuestRelationship) {
  if (relationship === 'INCOMING') return { label: 'Accept friend request', icon: UserPlus };
  if (relationship === 'OUTGOING') return { label: 'Cancel friend request', icon: Clock3 };
  if (relationship === 'FRIENDS') return { label: 'Remove friend', icon: UserMinus };
  return { label: 'Add friend', icon: UserPlus };
}

export default function LanguageQuestPublicProfile() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiGet<PublicProfilePayload>('/api/language-quest/profiles/' + userId);
      if (result.relationship === 'SELF') {
        navigate('/games/language-quest/profile', { replace: true });
        return;
      }
      setProfile(result);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load this learner profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [userId]);

  const updateRelationship = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      if (profile.relationship === 'OUTGOING' || profile.relationship === 'FRIENDS') {
        if (profile.relationship === 'FRIENDS' && !window.confirm('Remove ' + profile.name + ' from your friends?')) return;
        await apiSend('/api/language-quest/follow/' + profile.id, 'DELETE');
        setProfile((current) => current ? { ...current, relationship: 'NONE', activeCourse: null, courseVisible: false } : current);
        toast.success(profile.relationship === 'FRIENDS' ? profile.name + ' was removed from your friends' : 'Friend request cancelled');
      } else {
        const result = await apiSend<{ relationship: LanguageQuestRelationship }>(
          '/api/language-quest/follow/' + profile.id,
          'POST',
        );
        const accepted = result.relationship === 'FRIENDS';
        toast.success(accepted ? profile.name + ' is now your friend' : 'Friend request sent to ' + profile.name);
        await load();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not update this friendship');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !profile) return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" /></div>;

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <Users className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-black">Learner not found</h1>
        <p className="mt-2 text-sm text-slate-500">This profile may be inactive or unavailable.</p>
        <Button className="mt-6" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>Back to leaderboard</Button>
      </div>
    );
  }

  const action = actionCopy(profile.relationship);
  const ActionIcon = action.icon;

  return (
    <div className="lq-social-profile mx-auto max-w-5xl pb-12">
      <Button variant="ghost" className="-ml-2 mb-4" render={<Link to="/games/language-quest/leaderboard" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Leaderboard
      </Button>

      <section className="lq-profile-banner">
        <div className="lq-profile-banner-art" aria-hidden="true"><span>HELLO</span><span>မင်္ဂလာပါ</span><span>你好</span></div>
        <LanguageQuestAvatar avatarId={profile.avatarId} name={profile.name} className="lq-profile-avatar h-28 w-28 text-6xl sm:h-36 sm:w-36 sm:text-7xl" />
      </section>

      <section className="lq-profile-identity">
        <div className="min-w-0 flex-1">
          <p className="lq-kicker">Learner profile</p>
          <h1>{profile.name}</h1>
          <p className="lq-profile-joined"><CalendarDays /> {joinedLabel(profile.joinedAt)}</p>
          <p className="lq-profile-bio">{profile.bio || 'Building new skills one lesson at a time.'}</p>
          <div className="lq-profile-social-proof"><Users /><strong>{profile.friendsCount}</strong> friends</div>
        </div>
        <div className="lq-profile-actions">
          {profile.relationship === 'FRIENDS' && <Badge className="lq-profile-friend-badge"><Heart /> Friends</Badge>}
          <button
            type="button"
            className={'lq-profile-friend-button relationship-' + profile.relationship.toLowerCase()}
            disabled={busy}
            onClick={updateRelationship}
          >
            <ActionIcon aria-hidden="true" /> {busy ? 'Updating…' : action.label}
          </button>
        </div>
      </section>

      <section className="lq-profile-stats" aria-label={profile.name + "'s learning statistics"}>
        <div><Flame /><strong>{profile.profile.currentStreak}</strong><span>day streak</span></div>
        <div><Star /><strong>{profile.profile.points}</strong><span>total XP</span></div>
        <div><Trophy /><strong>{profile.profile.rewards.level}</strong><span>{profile.profile.rewards.title}</span></div>
        <div><ShieldCheck /><strong>{profile.profile.bestStreak}</strong><span>best streak</span></div>
      </section>

      <section className="lq-profile-course" style={profile.activeCourse ? { '--friend-course-accent': profile.activeCourse.accentColor } as React.CSSProperties : undefined}>
        <div className="lq-profile-course-copy">
          <p className="lq-kicker">Current course</p>
          {profile.activeCourse ? (
            <>
              <div className="lq-profile-course-title"><span>{profile.activeCourse.imageEmoji}</span><div><h2>{profile.activeCourse.title}</h2><p>{profile.activeCourse.language} · {profile.activeCourse.category}</p></div></div>
              <p className="lq-profile-course-note"><Heart /> Friends can see each other’s current course—never private classroom details or lesson answers.</p>
            </>
          ) : profile.courseVisible ? (
            <><h2>Choosing the next adventure</h2><p>{profile.name} has not selected an active course yet.</p></>
          ) : (
            <div className="lq-profile-course-title is-locked"><span><LockKeyhole /></span><div><h2>Become friends to learn together</h2><p>Once the request is accepted, this space shows the course {profile.name} is currently doing.</p></div></div>
          )}
        </div>
        <div className="lq-profile-course-art" aria-hidden="true">
          {profile.activeCourse ? profile.activeCourse.imageEmoji : <BookOpen />}
        </div>
      </section>
    </div>
  );
}
