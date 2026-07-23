import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Clock3,
  Edit3,
  LockKeyhole,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiSend } from "../../lib/api";
import {
  GAME_KEYS,
  GAME_LABELS,
  type GamePolicyKey,
  type GamePolicyScope,
} from "../../../shared/gameControls";

interface StudentOption {
  id: string;
  studentCode: string;
  user: { firstName: string; lastName: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
  students: StudentOption[];
}

interface Policy {
  id: string;
  scope: GamePolicyScope;
  scopeKey: string;
  gameKey: GamePolicyKey;
  enabled: boolean;
  blocked: boolean;
  dailyLimitMinutes: number | null;
  sessionLimitMinutes: number | null;
  cooldownMinutes: number;
  allowedDays: number[];
  allowedStartMinute: number | null;
  allowedEndMinute: number | null;
  note: string | null;
  managedByRole: "ADMIN" | "TEACHER";
  classId: string | null;
  studentId: string | null;
  class: { id: string; name: string } | null;
  student: StudentOption | null;
  updatedAt: string;
}

interface ManagerPayload {
  role: "ADMIN" | "TEACHER";
  classes: ClassOption[];
  policies: Policy[];
}

interface PolicyForm {
  scope: GamePolicyScope;
  classId: string;
  studentId: string;
  gameKey: GamePolicyKey;
  enabled: boolean;
  blocked: boolean;
  dailyLimitMinutes: string;
  sessionLimitMinutes: string;
  cooldownMinutes: string;
  scheduleEnabled: boolean;
  allowedDays: number[];
  startTime: string;
  endTime: string;
  note: string;
}

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function emptyForm(role: "ADMIN" | "TEACHER" = "TEACHER"): PolicyForm {
  return {
    scope: role === "ADMIN" ? "GLOBAL" : "CLASS",
    classId: "",
    studentId: "",
    gameKey: "ALL",
    enabled: true,
    blocked: false,
    dailyLimitMinutes: "30",
    sessionLimitMinutes: "15",
    cooldownMinutes: "10",
    scheduleEnabled: false,
    allowedDays: [1, 2, 3, 4, 5],
    startTime: "15:00",
    endTime: "20:00",
    note: "",
  };
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(value: number | null): string {
  if (value == null) return "15:00";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function studentName(student: StudentOption | null | undefined): string {
  if (!student) return "Unknown student";
  const name = `${student.user?.firstName || ""} ${student.user?.lastName || ""}`.trim();
  return name || student.studentCode;
}

function targetLabel(policy: Policy): string {
  if (policy.scope === "GLOBAL") return "All students";
  if (policy.scope === "CLASS") return policy.class?.name || "Class";
  return studentName(policy.student);
}

function gameLabel(gameKey: GamePolicyKey): string {
  return gameKey === "ALL" ? "All recreational games" : GAME_LABELS[gameKey];
}

function limitSummary(policy: Policy): string[] {
  const details: string[] = [];
  if (policy.blocked) details.push("Blocked");
  if (policy.dailyLimitMinutes) details.push(`${policy.dailyLimitMinutes} min/day`);
  if (policy.sessionLimitMinutes) details.push(`${policy.sessionLimitMinutes} min/session`);
  if (policy.cooldownMinutes) details.push(`${policy.cooldownMinutes} min break`);
  if (policy.allowedStartMinute != null && policy.allowedEndMinute != null) {
    details.push(`${timeFromMinutes(policy.allowedStartMinute)}–${timeFromMinutes(policy.allowedEndMinute)}`);
  }
  return details.length ? details : ["Monitoring only"];
}

export default function GameControls() {
  const [data, setData] = useState<ManagerPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PolicyForm>(() => emptyForm());

  const load = async () => {
    try {
      const payload = await apiGet<ManagerPayload>("/api/game-controls/manage");
      setData(payload);
      setForm((current) => current.classId || current.studentId
        ? current
        : {
            ...emptyForm(payload.role),
            classId: payload.classes[0]?.id || "",
          });
    } catch (error: any) {
      toast.error(error?.message || "Could not load game controls");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedClass = useMemo(
    () => data?.classes.find((item) => item.id === form.classId) ?? null,
    [data?.classes, form.classId],
  );

  const reset = () => {
    const next = emptyForm(data?.role || "TEACHER");
    next.classId = data?.classes[0]?.id || "";
    setForm(next);
    setEditingId(null);
  };

  const edit = (policy: Policy) => {
    const classId = policy.classId
      || data?.classes.find((item) => item.students.some((student) => student.id === policy.studentId))?.id
      || "";
    setEditingId(policy.id);
    setForm({
      scope: policy.scope,
      classId,
      studentId: policy.studentId || "",
      gameKey: policy.gameKey,
      enabled: policy.enabled,
      blocked: policy.blocked,
      dailyLimitMinutes: policy.dailyLimitMinutes?.toString() || "",
      sessionLimitMinutes: policy.sessionLimitMinutes?.toString() || "",
      cooldownMinutes: policy.cooldownMinutes?.toString() || "0",
      scheduleEnabled: policy.allowedStartMinute != null && policy.allowedEndMinute != null,
      allowedDays: policy.allowedDays,
      startTime: timeFromMinutes(policy.allowedStartMinute),
      endTime: timeFromMinutes(policy.allowedEndMinute),
      note: policy.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const targetId = form.scope === "CLASS"
      ? form.classId
      : form.scope === "STUDENT"
        ? form.studentId
        : null;
    if (form.scope !== "GLOBAL" && !targetId) {
      toast.error(`Choose a ${form.scope === "CLASS" ? "class" : "student"} first`);
      return;
    }
    if (!form.blocked && !form.dailyLimitMinutes && !form.sessionLimitMinutes && !form.scheduleEnabled) {
      toast.error("Set a block, time limit, or allowed schedule");
      return;
    }
    setSaving(true);
    try {
      await apiSend("/api/game-controls/policies", "POST", {
        scope: form.scope,
        targetId,
        gameKey: form.gameKey,
        enabled: form.enabled,
        blocked: form.blocked,
        dailyLimitMinutes: form.dailyLimitMinutes ? Number(form.dailyLimitMinutes) : null,
        sessionLimitMinutes: form.sessionLimitMinutes ? Number(form.sessionLimitMinutes) : null,
        cooldownMinutes: form.cooldownMinutes ? Number(form.cooldownMinutes) : 0,
        allowedDays: form.scheduleEnabled ? form.allowedDays : [],
        allowedStartMinute: form.scheduleEnabled ? minutesFromTime(form.startTime) : null,
        allowedEndMinute: form.scheduleEnabled ? minutesFromTime(form.endTime) : null,
        note: form.note || null,
      });
      toast.success(editingId ? "Game control updated" : "Game control added");
      reset();
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save game controls");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (policy: Policy) => {
    if (!window.confirm(`Remove the ${gameLabel(policy.gameKey)} control for ${targetLabel(policy)}?`)) return;
    try {
      await apiSend(`/api/game-controls/policies/${policy.id}`, "DELETE");
      toast.success("Game control removed");
      if (editingId === policy.id) reset();
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not remove game controls");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-300/30">
              <ShieldCheck className="size-6 text-violet-200" />
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Game-time parental controls</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 sm:text-base">
              Set enforceable limits for all students, a class, or one student. The most restrictive
              matching rule wins, so school-wide safeguards cannot be weakened by a narrower rule.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/10">
              <p className="text-2xl font-black">{data?.policies.filter((policy) => policy.enabled).length || 0}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Active rules</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/10">
              <p className="text-2xl font-black">{data?.classes.length || 0}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Your classes</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)]">
        <Card className="h-fit border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editingId ? <Edit3 className="size-5 text-violet-600" /> : <Plus className="size-5 text-violet-600" />}
              {editingId ? "Edit control" : "Add a control"}
            </CardTitle>
            <CardDescription>Blank time fields mean unlimited. Blocking always overrides timers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Who does this apply to?</Label>
                <Select
                  value={form.scope}
                  onValueChange={(value) => setForm((current) => ({
                    ...current,
                    scope: value as GamePolicyScope,
                    studentId: "",
                  }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {data?.role === "ADMIN" && <SelectItem value="GLOBAL">All students</SelectItem>}
                    <SelectItem value="CLASS">A class</SelectItem>
                    <SelectItem value="STUDENT">One student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Game</Label>
                <Select
                  value={form.gameKey}
                  onValueChange={(value) => setForm((current) => ({ ...current, gameKey: value as GamePolicyKey }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All recreational games</SelectItem>
                    {GAME_KEYS.map((gameKey) => (
                      <SelectItem key={gameKey} value={gameKey}>{GAME_LABELS[gameKey]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.scope !== "GLOBAL" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select
                    value={form.classId}
                    onValueChange={(classId) => setForm((current) => ({ ...current, classId, studentId: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                    <SelectContent>
                      {data?.classes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.name} · {item.level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.scope === "STUDENT" && (
                  <div className="space-y-2">
                    <Label>Student</Label>
                    <Select
                      value={form.studentId}
                      onValueChange={(studentId) => setForm((current) => ({ ...current, studentId }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
                      <SelectContent>
                        {selectedClass?.students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {studentName(student)} · {student.studentCode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
              <div>
                <Label htmlFor="block-games" className="flex items-center gap-2 text-base font-black text-red-800 dark:text-red-300">
                  <Ban className="size-4" /> Block completely
                </Label>
                <p className="mt-1 text-xs leading-5 text-red-700/80 dark:text-red-300/70">
                  Students cannot open or continue the selected game.
                </p>
              </div>
              <Switch
                id="block-games"
                checked={form.blocked}
                onCheckedChange={(blocked) => setForm((current) => ({ ...current, blocked }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="daily-limit">Minutes per day</Label>
                <Input
                  id="daily-limit"
                  type="number"
                  min={1}
                  max={1440}
                  placeholder="Unlimited"
                  value={form.dailyLimitMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, dailyLimitMinutes: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-limit">Minutes per session</Label>
                <Input
                  id="session-limit"
                  type="number"
                  min={1}
                  max={360}
                  placeholder="Unlimited"
                  value={form.sessionLimitMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, sessionLimitMinutes: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cooldown">Break between sessions</Label>
                <Input
                  id="cooldown"
                  type="number"
                  min={0}
                  max={1440}
                  value={form.cooldownMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, cooldownMinutes: event.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="schedule-toggle" className="text-base font-black">Allowed-time schedule</Label>
                  <p className="mt-1 text-xs text-slate-500">Outside this window, games are locked automatically.</p>
                </div>
                <Switch
                  id="schedule-toggle"
                  checked={form.scheduleEnabled}
                  onCheckedChange={(scheduleEnabled) => setForm((current) => ({ ...current, scheduleEnabled }))}
                />
              </div>
              {form.scheduleEnabled && (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => {
                      const selected = form.allowedDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setForm((current) => ({
                            ...current,
                            allowedDays: selected
                              ? current.allowedDays.filter((value) => value !== day.value)
                              : [...current.allowedDays, day.value],
                          }))}
                          className={`min-h-10 min-w-12 rounded-xl border px-3 text-xs font-black transition ${
                            selected
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="allowed-from">Games open</Label>
                      <Input
                        id="allowed-from"
                        type="time"
                        value={form.startTime}
                        onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowed-until">Games close</Label>
                      <Input
                        id="allowed-until"
                        type="time"
                        value={form.endTime}
                        onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="control-note">Reason or note (optional)</Label>
              <Textarea
                id="control-note"
                maxLength={500}
                placeholder="Example: Games are available after homework and reading time."
                value={form.note}
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {editingId && (
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="mr-2 size-4" /> Cancel edit
                </Button>
              )}
              <Button onClick={save} disabled={saving} className="bg-violet-600 text-white hover:bg-violet-700">
                <Save className="mr-2 size-4" />
                {saving ? "Saving…" : editingId ? "Update control" : "Save control"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Current controls</h2>
            <p className="mt-1 text-sm text-slate-500">All applicable rules are combined; stricter limits take priority.</p>
          </div>
          {!data?.policies.length ? (
            <Card className="border-dashed">
              <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                <ShieldCheck className="size-10 text-slate-300" />
                <p className="mt-4 font-black text-slate-700 dark:text-slate-200">No game controls yet</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Add a balanced daily limit to start reducing screen time.</p>
              </CardContent>
            </Card>
          ) : (
            data.policies.map((policy) => {
              const locked = data.role === "TEACHER" && policy.managedByRole === "ADMIN";
              return (
                <Card key={policy.id} className={!policy.enabled ? "opacity-60" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={policy.blocked ? "destructive" : "secondary"}>
                            {policy.blocked ? "Blocked" : "Limited"}
                          </Badge>
                          <Badge variant="outline">{policy.scope.toLowerCase()}</Badge>
                          {locked && (
                            <Badge variant="outline" className="gap-1 text-amber-700">
                              <LockKeyhole className="size-3" /> Admin locked
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-3 truncate text-lg font-black text-slate-900 dark:text-white">
                          {gameLabel(policy.gameKey)}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                          <Users className="size-4" /> {targetLabel(policy)}
                        </p>
                      </div>
                      {!locked && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" aria-label="Edit control" onClick={() => edit(policy)}>
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Remove control"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => void remove(policy)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {limitSummary(policy).map((detail) => (
                        <span key={detail} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          <Clock3 className="size-3.5" /> {detail}
                        </span>
                      ))}
                    </div>
                    {policy.note && (
                      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                        {policy.note}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
