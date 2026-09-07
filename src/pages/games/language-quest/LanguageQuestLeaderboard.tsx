import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft, BookOpen, ChevronRight, Clock3, Eye, Flame, Globe2, Heart,
  Layers3, Medal, Shield, Sparkles, Star, UserCheck, UserPlus, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { apiGet, apiSend, qs } from '@/src/lib/api';
import { languageQuestRewardCardById } from '@/shared/languageQuestRewards';
import type { LanguageQuestLeaderboardScope, LanguageQuestLeague } from '@/shared/languageQuestLeaderboard';
import type { LanguageQuestRelationship } from '@/shared/languageQuestSocial';

interface LeaderCourse {
  id: string;
  title: string;
  language: string;
  imageEmoji: string;
  accentColor: string;
}

interface LeaderboardLeader {
  rank: number;
  userId: string;
  name: string;
  avatarId: string;
  points: number;
  currentStreak: number;
  relationship?: LanguageQuestRelationship;
  activeCourse?: LeaderCourse | null;
}

interface LeaderboardPayload {
  currentUserId: string;
  currentUserRank: number | null;
  scope: LanguageQuestLeaderboardScope;
  selection: { label: string; metricLabel: string; periodStart: string | null };
  filters: {
    courses: { id: string; title: string; category: string; imageEmoji: string }[];
    categories: string[];
    classrooms: { id: string; name: string; focusCourseTitle: string | null }[];
  };
  league: LanguageQuestLeague | null;
  monthlyShowcase: {
    rank: number;
    userId: string;
    name: string;
    avatarId: string;
    monthXp: number;
    currentCardId: string | null;
    monthKey: string;
  }[];
  leaders: LeaderboardLeader[];
}

interface LeaderboardQuery {
  scope: LanguageQuestLeaderboardScope;
  courseId: string;
  category: string;
  classroomId: string;
}

const scopes: { value: LanguageQuestLeaderboardScope; label: string; icon: typeof Globe2 }[] = [
  { value: 'global', label: 'School', icon: Globe2 },
  { value: 'league', label: 'My league', icon: Shield },
  { value: 'course', label: 'Course', icon: BookOpen },
  { value: 'category', label: 'Category', icon: Layers3 },
  { value: 'classroom', label: 'Classroom', icon: Users },
];

const rankLabel = (rank: number) => rank <= 3 ? ['Gold', 'Silver', 'Bronze'][rank - 1] : `Rank ${rank}`;

function relationshipAction(relationship: LanguageQuestRelationship) {
  if (relationship === 'INCOMING') return { label: 'Accept', icon: UserPlus, tone: 'lq-board-friend-action is-accept' };
  if (relationship === 'OUTGOING') return { label: 'Request sent', icon: Clock3, tone: 'lq-board-friend-action is-pending' };
  if (relationship === 'FRIENDS') return { label: 'Friends', icon: Heart, tone: 'lq-board-friend-action is-friend' };
  return { label: 'Add friend', icon: UserPlus, tone: 'lq-board-friend-action' };
}

export default function LanguageQuestLeaderboard() {
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<LeaderboardQuery>({ scope: 'global', courseId: '', category: '', classroomId: '' });
  const [relationshipState, setRelationshipState] = useState<Record<string, LanguageQuestRelationship>>({});
  const [friendBusyId, setFriendBusyId] = useState('');

  useEffect(() => {
    setLoading(true);
    apiGet<LeaderboardPayload>(`/api/language-quest/leaderboard${qs({
      scope: query.scope,
      courseId: query.scope === 'course' ? query.courseId : null,
      category: query.scope === 'category' ? query.category : null,
      classroomId: query.scope === 'classroom' ? query.classroomId : null,
    })}`)
      .then((payload) => {
        setData(payload);
        setRelationshipState(Object.fromEntries(
          payload.leaders.map((leader) => [
            leader.userId,
            leader.userId === payload.currentUserId ? 'SELF' : (leader.relationship || 'NONE'),
          ]),
        ));
      })
      .catch((error: any) => toast.error(error?.message || 'Could not load the leaderboard'))
      .finally(() => setLoading(false));
  }, [query]);

  const friendCourses = useMemo(() => data?.leaders.filter((leader) => (
    relationshipState[leader.userId] === 'FRIENDS' && leader.activeCourse
  )) ?? [], [data, relationshipState]);

  const updateFriend = async (leader: LeaderboardLeader) => {
    const relationship = relationshipState[leader.userId] || 'NONE';
    if (relationship === 'FRIENDS' || relationship === 'SELF') return;
    setFriendBusyId(leader.userId);
    try {
      if (relationship === 'OUTGOING') {
        await apiSend(`/api/language-quest/follow/${leader.userId}`, 'DELETE');
        setRelationshipState((current) => ({ ...current, [leader.userId]: 'NONE' }));
        toast.success(`Friend request to ${leader.name} cancelled`);
      } else {
        const result = await apiSend<{ relationship: LanguageQuestRelationship }>(
          `/api/language-quest/follow/${leader.userId}`,
          'POST',
        );
        setRelationshipState((current) => ({ ...current, [leader.userId]: result.relationship }));
        toast.success(result.relationship === 'FRIENDS'
          ? `${leader.name} is now your friend`
          : `Friend request sent to ${leader.name}`);
        if (result.relationship === 'FRIENDS') {
          setQuery((current) => ({ ...current }));
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not update this friend request');
    } finally {
      setFriendBusyId('');
    }
  };

  const changeScope = (scope: LanguageQuestLeaderboardScope) => {
    setQuery((current) => ({
      ...current,
      scope,
      courseId: scope === 'course' ? (current.courseId || data?.filters.courses[0]?.id || '') : current.courseId,
      category: scope === 'category' ? (current.category || data?.filters.categories[0] || '') : current.category,
      classroomId: scope === 'classroom' ? (current.classroomId || data?.filters.classrooms[0]?.id || '') : current.classroomId,
    }));
  };

  if (!data) return <div className="grid min-h-[420px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" /></div>;

  return (
    <div className="lq-social-page mx-auto max-w-6xl pb-12">
      <Button variant="ghost" className="-ml-2 mb-4" render={<Link to="/games/language-quest" />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Learning Quest
      </Button>

      <section className="lq-board-hero">
        <div className="relative z-10 max-w-2xl">
          <p className="lq-kicker">The learning league</p>
          <h1>Climb together. Learn your own way.</h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-6 sm:text-base">
            Compare real learning XP, meet classmates, and open a friend’s profile to see what they are studying now.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold">
            <span><strong className="text-2xl">{data.currentUserRank ? `#${data.currentUserRank}` : '—'}</strong><br />your place</span>
            <span><strong className="text-2xl">{data.leaders.length}</strong><br />learners shown</span>
            <span><strong className="text-2xl">{friendCourses.length}</strong><br />friends studying</span>
          </div>
        </div>
        <img src="/icons/LanguageQuests_Graphics/Owl School 12.svg" alt="Language Quest owl holding a trophy" className="lq-board-hero-owl" />
      </section>

      <section className="lq-board-controls" aria-label="Leaderboard view">
        <div className="lq-board-scope-rail" role="tablist" aria-label="Choose leaderboard scope">
          {scopes.map(({ value, label, icon: Icon }) => {
            const selected = query.scope === value;
            const unavailable = value === 'classroom' && data.filters.classrooms.length === 0;
            return (
              <button key={value} type="button" role="tab" aria-selected={selected} disabled={unavailable} className={selected ? 'is-active' : ''} onClick={() => changeScope(value)}>
                <Icon aria-hidden="true" /> {label}
              </button>
            );
          })}
        </div>

        <div className="lq-board-filter-proof">
          <div><span>Current view</span><strong>{data.selection.label}</strong><small>{data.selection.metricLabel}</small></div>
          {query.scope === 'course' && (
            <label>Course<select value={query.courseId || data.filters.courses[0]?.id || ''} onChange={(event) => setQuery((current) => ({ ...current, courseId: event.target.value }))}>{data.filters.courses.map((course) => <option key={course.id} value={course.id}>{course.imageEmoji} {course.title}</option>)}</select></label>
          )}
          {query.scope === 'category' && (
            <label>Category<select value={query.category || data.filters.categories[0] || ''} onChange={(event) => setQuery((current) => ({ ...current, category: event.target.value }))}>{data.filters.categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          )}
          {query.scope === 'classroom' && (
            <label>Classroom<select value={query.classroomId || data.filters.classrooms[0]?.id || ''} onChange={(event) => setQuery((current) => ({ ...current, classroomId: event.target.value }))}>{data.filters.classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}{classroom.focusCourseTitle ? ` · ${classroom.focusCourseTitle}` : ''}</option>)}</select></label>
          )}
        </div>
      </section>

      {data.league && (
        <section className="lq-league-strip">
          <span className="lq-league-mark" aria-hidden="true">{data.league.emoji}</span>
          <div className="min-w-0 flex-1"><p className="lq-kicker">Your 30-day pace</p><h2>{data.league.title}</h2><p>Compete with learners building at a similar recent rhythm.</p></div>
          <Badge>{data.league.maxXp === null ? `${data.league.minXp}+ XP` : `${data.league.minXp}–${data.league.maxXp} XP`}</Badge>
        </section>
      )}

      {data.scope === 'global' && data.monthlyShowcase.length > 0 && (
        <section className="lq-showcase-strip">
          <div className="lq-showcase-intro"><Sparkles aria-hidden="true" /><div><span>Monthly spotlight</span><strong>Three learners on a roll</strong></div></div>
          {data.monthlyShowcase.map((learner) => {
            const card = languageQuestRewardCardById(learner.currentCardId);
            return (
              <Link key={learner.userId} to={`/games/language-quest/profile/${learner.userId}`} className="lq-showcase-person">
                <span>{card?.emoji || '🌟'}</span>
                <LanguageQuestAvatar avatarId={learner.avatarId} name={learner.name} className="h-10 w-10 text-xl" />
                <span className="min-w-0"><strong>{learner.name}</strong><small>#{learner.rank} · {learner.monthXp} XP</small></span>
              </Link>
            );
          })}
        </section>
      )}

      <div className="lq-board-layout">
        <section className="lq-board-sheet" aria-labelledby="leaderboard-heading">
          <header>
            <div><p className="lq-kicker">Live standings</p><h2 id="leaderboard-heading">{data.selection.label}</h2></div>
            {loading && <span className="lq-board-updating">Updating…</span>}
          </header>
          {data.leaders.length === 0 ? (
            <div className="lq-board-empty"><Medal /><strong>No scores here yet</strong><p>Finish a matching lesson to claim the first place.</p></div>
          ) : (
            <ol className={loading ? 'is-loading' : ''}>
              {data.leaders.map((leader) => {
                const mine = leader.userId === data.currentUserId;
                const relationship = relationshipState[leader.userId] || (mine ? 'SELF' : 'NONE');
                const action = relationshipAction(relationship);
                const ActionIcon = action.icon;
                return (
                  <li key={leader.userId} className={mine ? 'is-me' : ''}>
                    <div className={`lq-board-rank rank-${Math.min(leader.rank, 4)}`} aria-label={rankLabel(leader.rank)}>
                      {leader.rank <= 3 ? <Medal aria-hidden="true" /> : leader.rank}
                    </div>
                    <LanguageQuestAvatar avatarId={leader.avatarId} name={leader.name} className="h-12 w-12 shrink-0 text-2xl" />
                    <div className="lq-board-person">
                      <div><strong>{leader.name}</strong>{mine && <Badge>You</Badge>}{relationship === 'FRIENDS' && <Badge className="is-friend"><Heart /> Friend</Badge>}</div>
                      {leader.activeCourse ? <p><span style={{ backgroundColor: `${leader.activeCourse.accentColor}22` }}>{leader.activeCourse.imageEmoji}</span> Studying {leader.activeCourse.title}</p> : <p>{relationship === 'FRIENDS' ? 'Choosing their next course' : 'Open profile to connect'}</p>}
                    </div>
                    <div className="lq-board-stat"><Flame aria-hidden="true" /><strong>{leader.currentStreak}</strong><span>day streak</span></div>
                    <div className="lq-board-xp"><Star aria-hidden="true" /><strong>{leader.points}</strong><span>XP</span></div>
                    {!mine && (
                      <div className="lq-board-row-actions">
                        <Button variant="ghost" size="icon" title={`View ${leader.name}'s profile`} aria-label={`View ${leader.name}'s profile`} render={<Link to={`/games/language-quest/profile/${leader.userId}`} />} nativeButton={false}><Eye /></Button>
                        {data.scope === 'global' && (
                          <button type="button" className={action.tone} disabled={friendBusyId === leader.userId || relationship === 'FRIENDS'} onClick={() => updateFriend(leader)}>
                            <ActionIcon aria-hidden="true" /> <span>{action.label}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside className="lq-friend-course-board">
          <div className="lq-friend-course-heading"><Heart aria-hidden="true" /><div><span>Friend activity</span><h2>Learning beside you</h2></div></div>
          <p>Friendship is mutual. Accept a request or add someone; once connected, you can see the course they are studying.</p>
          {friendCourses.length === 0 ? (
            <div className="lq-friend-course-empty"><Users /><strong>Your learning circle starts here.</strong><span>Open a learner profile or add a friend from the school ranking.</span></div>
          ) : (
            <div className="lq-friend-course-list">
              {friendCourses.slice(0, 5).map((friend) => (
                <Link key={friend.userId} to={`/games/language-quest/profile/${friend.userId}`}>
                  <LanguageQuestAvatar avatarId={friend.avatarId} name={friend.name} className="h-10 w-10 text-xl" />
                  <span className="min-w-0"><strong>{friend.name}</strong><small>{friend.activeCourse?.imageEmoji} {friend.activeCourse?.title}</small></span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
          <div className="lq-friend-privacy"><UserCheck /><span><strong>Course privacy</strong>Your current course is visible only to accepted friends.</span></div>
        </aside>
      </div>
    </div>
  );
}
