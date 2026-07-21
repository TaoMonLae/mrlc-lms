"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Check, Clock, Loader2, Search, Swords, Trophy, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { apiGet, apiSend } from "../../../lib/api";
import { useChat } from "../../../providers/ChatProvider";
import { useAuth } from "../../../providers/AuthProvider";
import type { OnlineMatch, OnlinePlayer } from "./ChessGame";

interface Opponent extends OnlinePlayer {
  activeMatchId: string | null;
  activeMatchStatus: "PENDING" | "ACTIVE" | null;
}

// A plain flex-row card, deliberately NOT built on top of <Card> — Card
// defaults to flex-col (it's meant for stacked header/content/footer
// panels), and overriding that from a consumer's className silently loses
// to tailwind-merge unless you also repeat flex-row. That mismatch is why
// these rows used to render avatar+name on one line and the action button
// wrapped underneath instead of beside it.
function PersonRow({
  avatarName,
  avatarSrc,
  online,
  title,
  subtitle,
  subtitleClassName,
  children,
}: {
  avatarName?: string | null;
  avatarSrc?: string | null;
  online?: boolean;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  subtitleClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#262522] p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <UserAvatar name={avatarName} src={avatarSrc} className="size-10 text-sm" />
          {online !== undefined && <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#262522] ${online ? "bg-emerald-400" : "bg-white/25"}`} />}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className={`truncate text-xs ${subtitleClassName ?? "text-white/45"}`}>{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-white/40">{icon}{children}</h2>;
}

export default function ChessLobbyPage() {
  const navigate = useNavigate();
  const chat = useChat();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";
  const peerWord = isStudent ? "classmate" : "colleague";
  const peerWordPlural = isStudent ? "Classmates" : "Colleagues";

  const [opponents, setOpponents] = React.useState<Opponent[] | null>(null);
  const [groupLabel, setGroupLabel] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [incoming, setIncoming] = React.useState<OnlineMatch[]>([]);
  const [outgoing, setOutgoing] = React.useState<OnlineMatch[]>([]);
  const [active, setActive] = React.useState<OnlineMatch[]>([]);
  const [recent, setRecent] = React.useState<OnlineMatch[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      const [op, ch, mt] = await Promise.all([
        apiGet<{ success: boolean; opponents: Opponent[]; groupLabel: string | null; note?: string }>("/api/games/chess/opponents"),
        apiGet<{ success: boolean; incoming: OnlineMatch[]; outgoing: OnlineMatch[] }>("/api/games/chess/challenges"),
        apiGet<{ success: boolean; active: OnlineMatch[]; recent: OnlineMatch[] }>("/api/games/chess/matches"),
      ]);
      setOpponents(op.opponents);
      setGroupLabel(op.groupLabel);
      setNote(op.note ?? null);
      setIncoming(ch.incoming);
      setOutgoing(ch.outgoing);
      setActive(mt.active);
      setRecent(mt.recent);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Couldn't load the chess lobby");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 6000);
    return () => clearInterval(interval);
  }, [loadAll]);

  React.useEffect(() => {
    const type = chat.lastEvent?.type;
    if (typeof type === "string" && type.startsWith("chess_")) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.lastEvent]);

  const challenge = async (opponentId: string) => {
    setBusyId(opponentId);
    try {
      await apiSend<{ success: boolean; match: OnlineMatch }>("/api/games/chess/challenges", "POST", { opponentId });
      toast.success("Challenge sent!");
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't send challenge");
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (matchId: string) => {
    setBusyId(matchId);
    try {
      await apiSend(`/api/games/chess/matches/${matchId}/accept`, "POST", {});
      navigate(`/games/chess/play?opponent=ONLINE&matchId=${matchId}`);
    } catch (err: any) {
      toast.error(err?.message || "Couldn't accept challenge");
      setBusyId(null);
    }
  };

  const decline = async (matchId: string) => {
    setBusyId(matchId);
    try {
      await apiSend(`/api/games/chess/matches/${matchId}/decline`, "POST", {});
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't decline challenge");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (matchId: string) => {
    setBusyId(matchId);
    try {
      await apiSend(`/api/games/chess/matches/${matchId}/cancel`, "POST", {});
      loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't cancel challenge");
    } finally {
      setBusyId(null);
    }
  };

  const onlineCount = opponents?.filter((o) => chat.isOnline(o.id)).length ?? 0;
  const visibleOpponents = (opponents ?? [])
    .filter((o) => !search.trim() || o.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      const rank = (o: Opponent) => (chat.isOnline(o.id) ? 0 : 1);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });

  return (
    <div className="min-h-screen bg-[#161512] text-white">
      <div className="mx-auto max-w-5xl p-3 sm:p-5 lg:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#759954] text-2xl">♞</div>
            <div>
              <h1 className="text-xl font-bold">Multiplayer lobby</h1>
              <p className="text-xs text-white/45">{groupLabel ? `${groupLabel} · challenge a ${peerWord}` : `Challenge a ${peerWord} to a game`}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/games/chess/leaderboard")} className="bg-[#759954] text-white hover:bg-[#86a962]"><Trophy className="mr-2 size-4" /> Leaderboard</Button>
            <Button variant="outline" onClick={() => navigate("/games/chess")} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">◀ Setup</Button>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-[40vh] place-items-center text-white/50"><Loader2 className="size-6 animate-spin" /></div>
        ) : error ? (
          <Card className="border-white/10 bg-[#262522] p-6 text-center text-white/70">{error}</Card>
        ) : (
          <div className="space-y-6">
            {incoming.length > 0 && (
              <section>
                <SectionHeading icon={<Bell className="size-3.5" />}>Challenges for you</SectionHeading>
                <div className="space-y-2">
                  {incoming.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    return (
                      <PersonRow key={m.id} avatarName={opponent?.name} avatarSrc={opponent?.profilePhotoUrl} title={opponent?.name} subtitle="wants to play chess">
                        <Button size="sm" disabled={busyId === m.id} onClick={() => accept(m.id)} className="bg-[#759954] hover:bg-[#86a962]"><Check className="mr-1 size-3.5" /> Accept</Button>
                        <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => decline(m.id)} className="border-white/15 bg-white/5 text-white hover:bg-red-500/15 hover:text-red-200"><X className="mr-1 size-3.5" /> Decline</Button>
                      </PersonRow>
                    );
                  })}
                </div>
              </section>
            )}

            {active.length > 0 && (
              <section>
                <SectionHeading icon={<Swords className="size-3.5" />}>Your games</SectionHeading>
                <div className="space-y-2">
                  {active.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    const myTurn = m.turnColor === m.myColor;
                    return (
                      <PersonRow key={m.id} avatarName={opponent?.name} avatarSrc={opponent?.profilePhotoUrl} title={opponent?.name} subtitle={`${myTurn ? "Your move" : "Their move"} · move ${Math.floor(m.moves.length / 2) + 1}`} subtitleClassName={myTurn ? "text-[#98b873]" : "text-white/45"}>
                        <Button size="sm" onClick={() => navigate(`/games/chess/play?opponent=ONLINE&matchId=${m.id}`)} className="bg-[#759954] hover:bg-[#86a962]"><Swords className="mr-1 size-3.5" /> Resume</Button>
                      </PersonRow>
                    );
                  })}
                </div>
              </section>
            )}

            {outgoing.length > 0 && (
              <section>
                <SectionHeading icon={<Clock className="size-3.5" />}>Sent challenges</SectionHeading>
                <div className="space-y-2">
                  {outgoing.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    return (
                      <PersonRow key={m.id} avatarName={opponent?.name} avatarSrc={opponent?.profilePhotoUrl} title={opponent?.name} subtitle="waiting for a response…">
                        <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => cancel(m.id)} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
                      </PersonRow>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <SectionHeading icon={<Users className="size-3.5" />}>
                  {peerWordPlural}{opponents && opponents.length > 0 ? <span className="normal-case text-white/30"> · {onlineCount} online</span> : null}
                </SectionHeading>
                {opponents && opponents.length > 4 && (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${peerWord}s…`} className="h-8 w-48 border-white/10 bg-white/5 pl-8 text-xs text-white placeholder:text-white/30" />
                  </div>
                )}
              </div>
              {note ? (
                <Card className="border-white/10 bg-[#262522] p-4 text-sm text-white/60">{note}</Card>
              ) : !opponents?.length ? (
                <Card className="border-white/10 bg-[#262522] p-4 text-sm text-white/60">No {peerWord}s found to challenge yet.</Card>
              ) : !visibleOpponents.length ? (
                <Card className="border-white/10 bg-[#262522] p-4 text-sm text-white/60">No {peerWord}s match "{search}".</Card>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleOpponents.map((c) => {
                    const online = chat.isOnline(c.id);
                    return (
                      <PersonRow key={c.id} avatarName={c.name} avatarSrc={c.profilePhotoUrl} online={online} title={c.name} subtitle={`${online ? "Online" : "Offline"}${!isStudent && c.groupLabel ? ` · ${c.groupLabel}` : ""}`}>
                        {c.activeMatchId ? (
                          c.activeMatchStatus === "ACTIVE" ? (
                            <Button size="sm" onClick={() => navigate(`/games/chess/play?opponent=ONLINE&matchId=${c.activeMatchId}`)} className="bg-[#759954] hover:bg-[#86a962]">Resume</Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled className="border-white/15 bg-white/5 text-white/50">Pending</Button>
                          )
                        ) : (
                          <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => challenge(c.id)} className="border-white/15 bg-white/5 text-white hover:border-[#98b873]/50 hover:bg-[#759954]/15 hover:text-white">
                            {busyId === c.id ? <Loader2 className="size-3.5 animate-spin" /> : "Challenge"}
                          </Button>
                        )}
                      </PersonRow>
                    );
                  })}
                </div>
              )}
            </section>

            {recent.length > 0 && (
              <section>
                <SectionHeading icon={<Trophy className="size-3.5" />}>Recent games</SectionHeading>
                <Card className="gap-0 divide-y divide-white/5 overflow-hidden border-white/10 bg-[#262522] p-0">
                  {recent.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    const winnerColor = m.result === "WHITE_WINS" ? "w" : m.result === "BLACK_WINS" ? "b" : null;
                    const outcome = m.result === "DRAW" ? "Draw" : winnerColor === m.myColor ? "Won" : "Lost";
                    const badgeClass = outcome === "Won" ? "bg-[#759954]/20 text-[#98b873]" : outcome === "Lost" ? "bg-red-500/15 text-red-300" : "bg-white/10 text-white/60";
                    return (
                      <div key={m.id} className="flex flex-row items-center justify-between gap-3 px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <UserAvatar name={opponent?.name} src={opponent?.profilePhotoUrl} className="size-7 shrink-0 text-[10px]" />
                          <span className="truncate text-sm text-white/70">vs {opponent?.name ?? "Unknown"}</span>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>{outcome}</span>
                      </div>
                    );
                  })}
                </Card>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
