import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarDays, ChefHat, GripVertical, Plus, RotateCcw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { rosterDateKeys } from '../../../shared/cookingDutyBoard';
import { studentCouncilRoleLabel } from '../../../shared/studentCouncil';

export interface CookingBoardStudent {
  id: string;
  studentCode: string;
  preferredName?: string | null;
  boardingType?: string | null;
  studentCouncilRole?: string | null;
  status?: string | null;
  user?: { firstName: string; lastName: string };
}

export interface CookingBoardDefinition {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  requiredStudents?: number;
}

export interface CookingBoardAssignment {
  id: string;
  scheduledDate: string;
  status: string;
  dutyDefinition: CookingBoardDefinition;
  student: CookingBoardStudent;
}

interface CookingDutyDividerProps {
  rosterId: string;
  startDate: string;
  endDate: string;
  rosterStatus: string;
  students: CookingBoardStudent[];
  definitions: CookingBoardDefinition[];
  assignments: CookingBoardAssignment[];
  canManage: boolean;
  onChanged: () => void | Promise<void>;
}

type DragPayload =
  | { kind: 'student'; studentId: string }
  | { kind: 'assignment'; assignmentId: string };

const DRAG_MIME = 'application/x-mrlc-cooking-duty';
const dateKey = (value: string) => value.slice(0, 10);

function studentLabel(student: CookingBoardStudent) {
  if (student.preferredName) return student.preferredName;
  const name = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim();
  return name || student.studentCode;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-MY', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00.000Z`));
}

export default function CookingDutyDivider({
  rosterId,
  startDate,
  endDate,
  rosterStatus,
  students,
  definitions,
  assignments,
  canManage,
  onChanged,
}: CookingDutyDividerProps) {
  const reduceMotion = useReducedMotion();
  const cookingDefinitions = useMemo(() => definitions.filter((definition) => definition.type === 'COOKING' && definition.isActive), [definitions]);
  const [definitionId, setDefinitionId] = useState('');
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cookingDefinitions.some((definition) => definition.id === definitionId)) {
      setDefinitionId(cookingDefinitions[0]?.id || '');
    }
  }, [cookingDefinitions, definitionId]);

  const dates = useMemo(() => rosterDateKeys(startDate, endDate), [startDate, endDate]);
  const boardingStudents = useMemo(() => students
    .filter((student) => student.boardingType === 'BOARDING' && student.status !== 'DROPPED')
    .sort((a, b) => studentLabel(a).localeCompare(studentLabel(b))), [students]);
  const definition = cookingDefinitions.find((item) => item.id === definitionId);
  const boardAssignments = assignments.filter((assignment) => assignment.dutyDefinition.id === definitionId);
  const editable = canManage && rosterStatus === 'DRAFT' && Boolean(definitionId);

  const parseDrag = (event: React.DragEvent): DragPayload | null => {
    const raw = event.dataTransfer.getData(DRAG_MIME);
    if (!raw) return dragPayload;
    try { return JSON.parse(raw) as DragPayload; } catch { return null; }
  };

  const request = async (url: string, options: RequestInit) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('auth_token')}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not update the cooking duty board');
    return body;
  };

  const refresh = async () => {
    await onChanged();
    setDragPayload(null);
    setDropTarget(null);
  };

  const assignStudent = async (studentId: string, scheduledDate: string) => {
    if (!editable || !definition) return;
    const existing = boardAssignments.some((assignment) => assignment.student.id === studentId && dateKey(assignment.scheduledDate) === scheduledDate);
    if (existing) {
      toast.info('This student is already assigned to cooking on that date');
      return;
    }
    const assignedOnDate = boardAssignments.filter((assignment) => dateKey(assignment.scheduledDate) === scheduledDate).length;
    if (assignedOnDate >= Math.max(1, definition.requiredStudents || 1)) {
      toast.error('This cooking team is already full for that date');
      return;
    }
    setSaving(true);
    try {
      await request('/api/duty-assignments', {
        method: 'POST',
        body: JSON.stringify({ rosterId, dutyDefinitionId: definition.id, studentId, scheduledDate }),
      });
      setSelectedStudentId(null);
      toast.success('Student added to the cooking team');
      await refresh();
    } catch (error: any) {
      toast.error(error.message || 'Could not add the student');
    } finally {
      setSaving(false);
    }
  };

  const moveAssignment = async (assignmentId: string, scheduledDate: string) => {
    const assignment = boardAssignments.find((item) => item.id === assignmentId);
    if (!editable || !assignment || dateKey(assignment.scheduledDate) === scheduledDate) return;
    if (boardAssignments.some((item) => item.id !== assignmentId && item.student.id === assignment.student.id && dateKey(item.scheduledDate) === scheduledDate)) {
      toast.info('This student already has cooking duty on that date');
      return;
    }
    const assignedOnDate = boardAssignments.filter((item) => item.id !== assignmentId && dateKey(item.scheduledDate) === scheduledDate).length;
    if (assignedOnDate >= Math.max(1, definition?.requiredStudents || 1)) {
      toast.error('This cooking team is already full for that date');
      return;
    }
    setSaving(true);
    try {
      await request(`/api/duty-assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ scheduledDate }),
      });
      toast.success('Cooking duty moved');
      await refresh();
    } catch (error: any) {
      toast.error(error.message || 'Could not move the assignment');
    } finally {
      setSaving(false);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!editable) return;
    setSaving(true);
    try {
      await request(`/api/duty-assignments/${assignmentId}`, { method: 'DELETE' });
      toast.success('Student returned to the available pool');
      await refresh();
    } catch (error: any) {
      toast.error(error.message || 'Could not remove the assignment');
    } finally {
      setSaving(false);
    }
  };

  const dropOnDate = async (event: React.DragEvent, scheduledDate: string) => {
    event.preventDefault();
    const payload = parseDrag(event);
    if (!payload) return;
    if (payload.kind === 'student') await assignStudent(payload.studentId, scheduledDate);
    else await moveAssignment(payload.assignmentId, scheduledDate);
  };

  const startDrag = (event: React.DragEvent, payload: DragPayload) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    setDragPayload(payload);
  };

  const moveBy = (assignment: CookingBoardAssignment, offset: number) => {
    const index = dates.indexOf(dateKey(assignment.scheduledDate));
    const target = dates[index + offset];
    if (target) void moveAssignment(assignment.id, target);
  };

  return (
    <Card className="overflow-hidden rounded-none border-slate-300 dark:border-surface-raised">
      <CardHeader className="border-b border-border bg-slate-50/70 dark:bg-surface-raised/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><ChefHat className="h-5 w-5 text-academic-teal" /> Cooking Duty Divider</CardTitle>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Drag a boarding student into a date, move assigned cards between dates, or return a card to the pool. Changes save immediately.</p>
          </div>
          {cookingDefinitions.length > 0 && (
            <div className="w-full space-y-2 lg:w-72">
              <Label>Cooking duty</Label>
              <Select value={definitionId} onValueChange={setDefinitionId} disabled={saving}>
                <SelectTrigger className="w-full bg-card"><SelectValue placeholder="Choose cooking duty" /></SelectTrigger>
                <SelectContent>{cookingDefinitions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {cookingDefinitions.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <ChefHat className="mx-auto h-9 w-9 text-muted-foreground/60" />
            <p className="mt-3 font-medium">Create an active cooking duty first</p>
            <p className="mt-1 text-sm text-muted-foreground">The divider uses duty definitions whose type is Cooking.</p>
          </div>
        ) : (
          <div className="grid min-h-[430px] lg:grid-cols-[260px_minmax(0,1fr)]">
            <section
              className={`border-b border-border bg-card p-4 transition-colors duration-150 lg:border-b-0 lg:border-r ${dropTarget === 'pool' ? 'bg-academic-teal/5 ring-2 ring-inset ring-academic-teal/40' : ''}`}
              aria-label="Available boarding students"
              onDragOver={(event) => { if (editable && dragPayload?.kind === 'assignment') { event.preventDefault(); setDropTarget('pool'); } }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(event) => {
                event.preventDefault();
                const payload = parseDrag(event);
                if (payload?.kind === 'assignment') void removeAssignment(payload.assignmentId);
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4" /> Student pool</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Boarding students · reusable for each date</p>
                </div>
                <Badge variant="outline">{boardingStudents.length}</Badge>
              </div>
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {boardingStudents.map((student) => {
                  const role = studentCouncilRoleLabel(student.studentCouncilRole);
                  const selected = selectedStudentId === student.id;
                  return (
                    <motion.button
                      layout
                      key={student.id}
                      type="button"
                      draggable={editable}
                      disabled={!editable || saving}
                      aria-pressed={selected}
                      onClick={() => setSelectedStudentId((current) => current === student.id ? null : student.id)}
                      onDragStart={(event) => startDrag(event as unknown as React.DragEvent, { kind: 'student', studentId: student.id })}
                      onDragEnd={() => { setDragPayload(null); setDropTarget(null); }}
                      whileHover={reduceMotion ? undefined : { y: -2 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16 }}
                      className={`w-full border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-teal ${selected ? 'border-academic-teal bg-academic-teal/10' : 'border-border bg-background hover:border-academic-teal/40'} disabled:cursor-default disabled:opacity-80`}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{studentLabel(student)}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{student.studentCode}</p>
                          {role && <Badge variant="outline" className="mt-2 max-w-full border-academic-teal/30 bg-academic-teal/10 text-[10px] text-academic-teal">{role}</Badge>}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                {boardingStudents.length === 0 && <p className="border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">No active boarding students found.</p>}
              </div>
              {editable && <p className="mt-3 text-xs text-muted-foreground">Tip: click a student, then use “Assign selected” in a date lane if dragging is unavailable.</p>}
            </section>

            <section className="min-w-0 bg-muted/20 p-4" aria-label="Cooking duty dates">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" /> Roster dates</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Capacity follows the selected duty’s required-student count.</p>
                </div>
                {!editable && <Badge variant="outline">Read only</Badge>}
              </div>
              <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-3">
                {dates.map((day, dateIndex) => {
                  const dayAssignments = boardAssignments.filter((assignment) => dateKey(assignment.scheduledDate) === day);
                  const capacity = Math.max(1, definition?.requiredStudents || 1);
                  const full = dayAssignments.length >= capacity;
                  return (
                    <div
                      key={day}
                      onDragOver={(event) => { if (editable && !full) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(day); } }}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(event) => void dropOnDate(event, day)}
                      className={`min-h-[320px] border bg-card transition-[border-color,background-color,transform] duration-150 ${dropTarget === day ? 'border-academic-teal bg-academic-teal/5 ring-2 ring-academic-teal/20' : 'border-border'} ${full ? 'border-t-4 border-t-emerald-500' : 'border-t-4 border-t-academic-gold'}`}
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3">
                        <div><p className="font-semibold">{dateLabel(day)}</p><p className="mt-0.5 text-xs text-muted-foreground">{day}</p></div>
                        <Badge variant="outline" className={full ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}>{dayAssignments.length}/{capacity}</Badge>
                      </div>
                      <div className="space-y-2 p-3">
                        <AnimatePresence initial={false}>
                          {dayAssignments.map((assignment) => {
                            const role = studentCouncilRoleLabel(assignment.student.studentCouncilRole);
                            return (
                              <motion.article
                                layout
                                key={assignment.id}
                                draggable={editable}
                                onDragStart={(event) => startDrag(event as unknown as React.DragEvent, { kind: 'assignment', assignmentId: assignment.id })}
                                onDragEnd={() => { setDragPayload(null); setDropTarget(null); }}
                                initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                                whileHover={editable && !reduceMotion ? { y: -2 } : undefined}
                                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                                className="border border-border bg-background p-3 shadow-sm focus-within:ring-2 focus-within:ring-academic-teal"
                              >
                                <div className="flex items-start gap-2">
                                  <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{studentLabel(assignment.student)}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{assignment.student.studentCode}</p>
                                    {role && <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-academic-teal">{role}</p>}
                                  </div>
                                </div>
                                {editable && (
                                  <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border pt-2">
                                    <Button type="button" variant="ghost" size="sm" className="h-8 px-1" disabled={saving || dateIndex === 0} onClick={() => moveBy(assignment, -1)} aria-label={`Move ${studentLabel(assignment.student)} one day earlier`}><ArrowLeft className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-8 px-1 text-rose-600" disabled={saving} onClick={() => void removeAssignment(assignment.id)} aria-label={`Remove ${studentLabel(assignment.student)} from cooking duty`}><RotateCcw className="h-3.5 w-3.5" /></Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-8 px-1" disabled={saving || dateIndex === dates.length - 1} onClick={() => moveBy(assignment, 1)} aria-label={`Move ${studentLabel(assignment.student)} one day later`}><ArrowRight className="h-3.5 w-3.5" /></Button>
                                  </div>
                                )}
                              </motion.article>
                            );
                          })}
                        </AnimatePresence>
                        {dayAssignments.length === 0 && <div className="border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">Drop a student here</div>}
                        {editable && selectedStudentId && !full && (
                          <Button type="button" variant="outline" size="sm" className="w-full" disabled={saving} onClick={() => void assignStudent(selectedStudentId, day)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Assign selected
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
