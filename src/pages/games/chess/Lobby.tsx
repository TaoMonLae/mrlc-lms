"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Loader2, Swords, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { apiGet, apiSend } from "../../../lib/api";
import { useChat } from "../../../providers/ChatProvider";
import { useAuth } from "../../../providers/AuthProvider";
import type { OnlineMatch, OnlinePlayer } from "./ChessGame";

interface Classmate extends OnlinePlayer {
  activeMatchId: string | null;
  activeMatchStatus: "PENDING" | "ACTIVE" | null;
  isChallenger: boolean | null;
}

export default function ChessLobbyPage() {
  const navigate = useNavigate();
  const chat = useChat();
  const { user } = useAuth();
  const [classmates, setClassmates] = React.useState<Classmate[] | null>(null);
  const [className, setClassName] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [incoming, setIncoming] = React.useState<OnlineMatch[]>([]);
  const [outgoing, setOutgoing] = React.useState<OnlineMatch[]>([]);
  const [active, setActive] = React.useState<OnlineMatch[]>([]);
  const [recent, setRecent] = React.useState<OnlineMatch[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      const [cm, ch, mt] = await Promise.all([
        apiGet<{ success: boolean; classmates: Classmate[]; className: string | null; note?: string }>("/api/games/chess/classmates"),
        apiGet<{ success: boolean; incoming: OnlineMatch[]; outgoing: OnlineMatch[] }>("/api/games/chess/challenges"),
        apiGet<{ success: boolean; active: OnlineMatch[]; recent: OnlineMatch[] }>("/api/games/chess/matches"),
      ]);
      setClassmates(cm.classmates);
      setClassName(cm.className);
      setNote(cm.note ?? null);
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

  const challenge = async (studentId: string) => {
    setBusyId(studentId);
    try {
      await apiSend<{ success: boolean; match: OnlineMatch }>("/api/games/chess/challenges", "POST", { opponentStudentId: studentId });
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

  if (user && user.role !== "STUDENT" && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#161512] p-6 text-center text-white">
        <div className="mx-auto max-w-md pt-24">
          <p className="mb-4 text-white/70">Online multiplayer is available for students. Everyone can still play against the computer or pass-and-play locally.</p>
          <Button onClick={() => navigate("/games/chess")} className="bg-[#759954] hover:bg-[#86a962]">Back to Chess</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161512] text-white">
      <div className="mx-auto max-w-5xl p-3 sm:p-5 lg:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#759954] text-2xl">♞</div>
            <div>
              <h1 className="text-xl font-bold">Multiplayer lobby</h1>
              <p className="text-xs text-white/45">{className ? `${className} · challenge a classmate` : "Challenge a classmate to a game"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/games/chess/leaderboard")} className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"><Trophy className="mr-2 size-4" /> Leaderboard</Button>
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
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">Challenges for you</h2>
                <div className="space-y-2">
                  {incoming.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    return (
                      <Card key={m.id} className="flex items-center justify-between gap-3 border-white/10 bg-[#262522] p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={opponent?.name} src={opponent?.profilePhotoUrl} className="size-10 text-sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{opponent?.name}</p>
                            <p className="text-xs text-white/45">wants to play chess</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" disabled={busyId === m.id} onClick={() => accept(m.id)} className="bg-[#759954] hover:bg-[#86a962]"><Check className="mr-1 size-3.5" /> Accept</Button>
                          <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => decline(m.id)} className="border-white/15 bg-white/5 text-white hover:bg-red-500/15 hover:text-red-200"><X className="mr-1 size-3.5" /> Decline</Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {active.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">Your games</h2>
                <div className="space-y-2">
                  {active.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    const myTurn = m.turnColor === m.myColor;
                    return (
                      <Card key={m.id} className="flex items-center justify-between gap-3 border-white/10 bg-[#262522] p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={opponent?.name} src={opponent?.profilePhotoUrl} className="size-10 text-sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{opponent?.name}</p>
                            <p className={`text-xs ${myTurn ? "text-[#98b873]" : "text-white/45"}`}>{myTurn ? "Your move" : "Their move"} · move {Math.floor(m.moves.length / 2) + 1}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/games/chess/play?opponent=ONLINE&matchId=${m.id}`)} className="shrink-0 bg-[#759954] hover:bg-[#86a962]"><Swords className="mr-1 size-3.5" /> Resume</Button>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {outgoing.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">Sent challenges</h2>
                <div className="space-y-2">
                  {outgoing.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    return (
                      <Card key={m.id} className="flex items-center justify-between gap-3 border-white/10 bg-[#262522] p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={opponent?.name} src={opponent?.profilePhotoUrl} className="size-10 text-sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{opponent?.name}</p>
                            <p className="text-xs text-white/45">waiting for a response…</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" disabled={busyId === m.id} onClick={() => cancel(m.id)} className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">Cancel</Button>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">Classmates</h2>
              {note ? (
                <Card className="border-white/10 bg-[#262522] p-4 text-sm text-white/60">{note}</Card>
              ) : !classmates?.length ? (
                <Card className="border-white/10 bg-[#262522] p-4 text-sm text-white/60">No classmates found to challenge yet.</Card>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {classmates.map((c) => {
                    const online = c.userId ? chat.isOnline(c.userId) : false;
                    return (
                      <Card key={c.studentId} className="flex items-center justify-between gap-3 border-white/10 bg-[#262522] p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative shrink-0">
                            <UserAvatar name={c.name} src={c.profilePhotoUrl} className="size-10 text-sm" />
                            <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#262522] ${online ? "bg-emerald-400" : "bg-white/25"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{c.name}</p>
                            <p className="text-xs text-white/45">{online ? "Online" : "Offline"}</p>
                          </div>
                        </div>
                        {c.activeMatchId ? (
                          c.activeMatchStatus === "ACTIVE" ? (
                            <Button size="sm" onClick={() => navigate(`/games/chess/play?opponent=ONLINE&matchId=${c.activeMatchId}`)} className="shrink-0 bg-[#759954] hover:bg-[#86a962]">Resume</Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled className="shrink-0 border-white/15 bg-white/5 text-white/50">Pending</Button>
                          )
                        ) : (
                          <Button size="sm" variant="outline" disabled={busyId === c.studentId} onClick={() => challenge(c.studentId)} className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                            {busyId === c.studentId ? <Loader2 className="size-3.5 animate-spin" /> : "Challenge"}
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {recent.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/40">Recent games</h2>
                <div className="space-y-1.5">
                  {recent.map((m) => {
                    const opponent = m.myColor === "w" ? m.black : m.white;
                    const winnerColor = m.result === "WHITE_WINS" ? "w" : m.result === "BLACK_WINS" ? "b" : null;
                    const outcome = m.result === "DRAW" ? "Draw" : winnerColor === m.myColor ? "Won" : "Lost";
                    const color = outcome === "Won" ? "text-[#98b873]" : outcome === "Lost" ? "text-red-300" : "text-white/50";
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[.02] px-3 py-2 text-sm">
                        <span className="truncate text-white/70">vs {opponent?.name ?? "Unknown"}</span>
                        <span className={`font-semibold ${color}`}>{outcome}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
