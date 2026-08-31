import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Clock, MapPin, User, BookOpen, CalendarDays } from 'lucide-react';
import type { TimetableEntry } from '@/src/lib/timetable';

type Option = { id: string; name: string };

const DAY_VALUES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

// Retained for legacy API compatibility. The redesigned timetable intentionally
// uses one published-record color; schedule type is expressed with text.
const colorForSubject = (_subjectId: string) => 'bg-academic-teal';

const timetableSchema = z.object({
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  substituteTeacherId: z.string().optional(),
  academicYear: z.string().min(1, 'Academic year is required'),
  term: z.string().min(1, 'Term is required'),
  // One entry is created per selected day, so a teacher can add e.g. a daily
  // period in the same time slot across every weekday in a single submit.
  daysOfWeek: z.array(z.enum(DAY_VALUES)).min(1, 'Select at least one day'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  room: z.string().min(1, 'Room is required'),
  scheduleType: z.enum(['CLASS', 'HOLIDAY', 'SPECIAL_EVENT', 'EXAM', 'MEETING']),
  recurrence: z.enum(['ONCE', 'WEEKLY', 'BIWEEKLY']),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
  eventDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'SUBSTITUTED']).optional(),
  cancellationReason: z.string().optional(),
}).superRefine((data, ctx) => {
  if (['CLASS', 'EXAM'].includes(data.scheduleType)) {
    if (!data.classId) ctx.addIssue({ code: 'custom', path: ['classId'], message: 'Class is required' });
    if (!data.subjectId) ctx.addIssue({ code: 'custom', path: ['subjectId'], message: 'Subject is required' });
    if (!data.teacherId) ctx.addIssue({ code: 'custom', path: ['teacherId'], message: 'Teacher is required' });
  }
  if (data.substituteTeacherId && data.substituteTeacherId === data.teacherId) {
    ctx.addIssue({ code: 'custom', path: ['substituteTeacherId'], message: 'Substitute must be a different teacher' });
  }
  if (data.startTime && data.endTime) {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    if (toMin(data.startTime) >= toMin(data.endTime)) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be after start time' });
    }
  }
  
  const isRecurring = data.recurrence === 'WEEKLY' || data.recurrence === 'BIWEEKLY';
  if (isRecurring) {
    if (!data.effectiveFrom) ctx.addIssue({ code: 'custom', path: ['effectiveFrom'], message: 'Effective From date is required' });
    if (!data.effectiveUntil) ctx.addIssue({ code: 'custom', path: ['effectiveUntil'], message: 'Effective Until date is required' });
  } else {
    if (!data.eventDate) ctx.addIssue({ code: 'custom', path: ['eventDate'], message: 'Event date is required for single occurrences' });
  }
});

type TimetableFormValues = z.infer<typeof timetableSchema>;

interface TimetableFormProps {
  initialData?: TimetableEntry;
  onSubmit: (data: TimetableFormValues) => void;
  isLoading?: boolean;
  /** Pre-select a class (e.g. when adding a slot from a Class Profile page). Ignored if initialData is set. */
  defaultClassId?: string;
}

export function TimetableForm({ initialData, onSubmit, isLoading, defaultClassId }: TimetableFormProps) {
  const [classOptions, setClassOptions] = useState<Option[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Option[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<Option[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    const fullName = (u: any) => `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim();
    Promise.all([
      fetch('/api/classes', { headers }).then(r => (r.ok ? r.json() : [])),
      fetch('/api/subjects', { headers }).then(r => (r.ok ? r.json() : [])),
      fetch('/api/teachers', { headers }).then(r => (r.ok ? r.json() : [])),
    ]).then(([classes, subjects, teachers]) => {
      setClassOptions((classes || []).map((c: any) => ({ id: c.id, name: c.name })));
      setSubjectOptions((subjects || []).map((s: any) => ({ id: s.id, name: s.name })));
      setTeacherOptions((teachers || []).map((t: any) => ({ id: t.id, name: fullName(t.user) || t.teacherCode || 'Unknown' })));
    }).catch(() => {});
  }, []);

  const CLASS_OPTIONS = classOptions;
  const SUBJECT_OPTIONS = subjectOptions;
  const TEACHER_OPTIONS = teacherOptions;

  const form = useForm<TimetableFormValues>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      classId: initialData?.classId || defaultClassId || '',
      subjectId: initialData?.subjectId || '',
      teacherId: initialData?.teacherId || '',
      substituteTeacherId: (initialData as any)?.substituteTeacherId || '',
      academicYear: (initialData as any)?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      term: (initialData as any)?.term || 'Term 1',
      daysOfWeek: initialData?.dayOfWeek ? [initialData.dayOfWeek] : ['Monday'],
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      room: initialData?.room || '',
      scheduleType: (initialData as any)?.scheduleType || 'CLASS',
      recurrence: (initialData as any)?.recurrence || 'WEEKLY',
      effectiveFrom: (initialData as any)?.effectiveFrom?.slice(0, 10) || '',
      effectiveUntil: (initialData as any)?.effectiveUntil?.slice(0, 10) || '',
      eventDate: (initialData as any)?.eventDate?.slice(0, 10) || '',
      notes: initialData?.notes || '',
      status: initialData?.status || 'ACTIVE',
      cancellationReason: initialData?.cancellationReason || '',
    },
  });

  const scheduleType = form.watch('scheduleType') || 'CLASS';
  const recurrence = form.watch('recurrence') || 'WEEKLY';
  const status = form.watch('status') || 'ACTIVE';
  const selectedDays = form.watch('daysOfWeek') || [];
  const selectedSubject = form.watch('subjectId');
  const selectedClass = form.watch('classId');
  const selectedTeacher = form.watch('teacherId');
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');
  const room = form.watch('room');

  const isClassOrExam = ['CLASS', 'EXAM'].includes(scheduleType);
  const hasTeacher = ['CLASS', 'EXAM', 'MEETING'].includes(scheduleType);
  const isRecurring = recurrence === 'WEEKLY' || recurrence === 'BIWEEKLY';

  const handleEnrichedSubmit = (values: TimetableFormValues) => {
    const sType = values.scheduleType || 'CLASS';
    const isC = ['CLASS', 'EXAM'].includes(sType);
    const hasT = ['CLASS', 'EXAM', 'MEETING'].includes(sType);
    const isRec = values.recurrence === 'WEEKLY' || values.recurrence === 'BIWEEKLY';

    onSubmit({
      ...values,
      // dayOfWeek kept for single-entry consumers (edit); the parent uses
      // daysOfWeek to create one entry per selected day on create.
      daysOfWeek: values.daysOfWeek,
      dayOfWeek: values.daysOfWeek[0],
      classId: isC ? (values.classId || null) : null,
      subjectId: isC ? (values.subjectId || null) : null,
      teacherId: hasT ? (values.teacherId || null) : null,
      substituteTeacherId: isC ? (values.substituteTeacherId || null) : null,
      className: isC ? (classOptions.find(c => c.id === values.classId)?.name || null) : null,
      subjectName: isC ? (subjectOptions.find(s => s.id === values.subjectId)?.name || null) : null,
      teacherName: hasT ? (teacherOptions.find(t => t.id === values.teacherId)?.name || null) : null,
      substituteTeacherName: isC ? (teacherOptions.find(t => t.id === values.substituteTeacherId)?.name || null) : null,
      subjectColor: isC && values.subjectId ? colorForSubject(values.subjectId) : 'bg-amber-500',
      effectiveFrom: isRec ? (values.effectiveFrom || null) : null,
      effectiveUntil: isRec ? (values.effectiveUntil || null) : null,
      eventDate: !isRec ? (values.eventDate || null) : null,
      cancellationReason: values.status === 'CANCELLED' ? (values.cancellationReason || null) : null,
    } as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleEnrichedSubmit)} className="timetable-form space-y-5">
        <section className="grid border border-foreground bg-card lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
          <div className="border-b border-foreground px-5 py-5 lg:border-b-0 lg:border-r">
            <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-academic-teal">Schedule record</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em]">{initialData ? 'Revise the field entry' : 'Build the field entry'}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Complete the teaching assignment and timing. The slot proof updates as you work.</p>
          </div>
          <div className="bg-academic-navy-deep px-5 py-5 text-white">
            <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#6dd4cb]">Slot proof</p>
            <p className="mt-3 text-lg font-semibold">{subjectOptions.find((option) => option.id === selectedSubject)?.name || scheduleType.replaceAll('_', ' ')}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div><dt className="text-white/55">When</dt><dd className="mt-1 font-mono tabular-nums">{startTime || '—'}–{endTime || '—'}</dd></div>
              <div><dt className="text-white/55">Where</dt><dd className="mt-1 truncate">{room || 'Not set'}</dd></div>
              <div><dt className="text-white/55">Class</dt><dd className="mt-1 truncate">{classOptions.find((option) => option.id === selectedClass)?.name || 'Not set'}</dd></div>
              <div><dt className="text-white/55">Teacher</dt><dd className="mt-1 truncate">{teacherOptions.find((option) => option.id === selectedTeacher)?.name || 'Not set'}</dd></div>
            </dl>
            <p className="mt-4 border-t border-white/25 pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-white/65">{selectedDays.length ? selectedDays.join(' · ') : 'No day selected'}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Assignment Settings */}
          <div className="space-y-6">
            {(isClassOrExam || hasTeacher) && (
              <section className="overflow-hidden border border-foreground bg-card">
                <div className="border-b border-foreground bg-academic-navy-deep px-4 py-3 text-white">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-[#6dd4cb]" />
                    Primary Assignment
                  </h3>
                </div>
                <div className="space-y-5 p-5">
                  {isClassOrExam && (
                    <FormField
                      control={form.control}
                      name="classId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <BookOpen className="h-3 w-3" /> Class
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a class" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CLASS_OPTIONS.map((option) => (
                                <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {isClassOrExam && (
                    <FormField
                      control={form.control}
                      name="subjectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <CalendarDays className="h-3 w-3" /> Subject
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SUBJECT_OPTIONS.map((option) => (
                                <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {hasTeacher && (
                    <FormField
                      control={form.control}
                      name="teacherId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-3 w-3" /> Teacher
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Assign a teacher" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TEACHER_OPTIONS.map((option) => (
                                <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {isClassOrExam && (
                    <FormField
                      control={form.control}
                      name="substituteTeacherId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Substitute Teacher</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Optional substitute" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TEACHER_OPTIONS.map((option) => (
                                <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </section>
            )}

            <section className="overflow-hidden border border-foreground bg-card">
              <div className="border-b border-foreground bg-muted/35 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-academic-teal" />
                  Location & Notes
                </h3>
              </div>
              <div className="space-y-5 p-5">
                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room / Lab Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Room 302 or Lab 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="academicYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Academic Year</FormLabel>
                        <FormControl><Input placeholder="2026-2027" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term</FormLabel>
                        <FormControl><Input placeholder="Term 1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any specific instructions for this slot..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </div>

          {/* Time Settings */}
          <div className="space-y-6">
            <section className="overflow-hidden border border-foreground bg-card">
              <div className="border-b border-foreground bg-muted/35 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-academic-teal" />
                  Schedule Timing
                </h3>
              </div>
              <div className="space-y-6 p-5">
                <FormField
                  control={form.control}
                  name="daysOfWeek"
                  render={({ field }) => {
                    const selected: string[] = field.value || [];
                    const toggle = (day: string) => {
                      if (initialData) { field.onChange([day]); return; } // editing one entry = single day
                      field.onChange(
                        selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day]
                      );
                    };
                    const quick =
                      "border-b border-foreground/35 px-1 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground hover:border-academic-teal hover:text-academic-teal";
                    return (
                      <FormItem>
                        <div className="flex items-center justify-between gap-2">
                          <FormLabel>{initialData ? 'Day of the Week' : 'Days of the Week'}</FormLabel>
                          {!initialData && (
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" className={quick} onClick={() => field.onChange([...WEEKDAYS])}>Weekdays</button>
                              <button type="button" className={quick} onClick={() => field.onChange([...DAY_VALUES])}>Every day</button>
                              {selected.length > 0 && (
                                <button type="button" className={quick} onClick={() => field.onChange([])}>Clear</button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                          {DAY_VALUES.map((day) => {
                            const on = selected.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggle(day)}
                                className={`border px-2 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition ${
                                  on
                                    ? 'border-academic-gold bg-academic-gold text-academic-navy-deep'
                                    : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
                                }`}
                              >
                                {day.slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                        {!initialData && (
                          <FormDescription>
                            {selected.length > 1
                              ? `Creates ${selected.length} weekly slots — one per selected day, at the same time.`
                              : 'Tip: pick several days (or “Weekdays”) to repeat this slot at the same time.'}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "CLASS"}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="CLASS">Class period</SelectItem>
                            <SelectItem value="EXAM">Exam</SelectItem>
                            <SelectItem value="MEETING">Meeting</SelectItem>
                            <SelectItem value="HOLIDAY">School holiday</SelectItem>
                            <SelectItem value="SPECIAL_EVENT">Special event</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recurrence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "WEEKLY"}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="ONCE">One time</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isRecurring && (
                    <FormField
                      control={form.control}
                      name="effectiveFrom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective From</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {isRecurring && (
                    <FormField
                      control={form.control}
                      name="effectiveUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective Until</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {!isRecurring && (
                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Event Date</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex gap-3 border-l-4 border-academic-teal bg-accent/35 p-4 text-[11px] text-accent-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-academic-teal" />
                  <p>The server checks teacher and room conflicts when you publish. A conflicting day is skipped and reported with its evidence.</p>
                </div>
              </div>
            </section>

            {initialData && (
              <section className="overflow-hidden border border-foreground bg-card">
                <div className="border-b border-foreground bg-muted/35 px-4 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-academic-coral" />
                    Status & Cancellation
                  </h3>
                </div>
                <div className="space-y-5 p-5">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "ACTIVE"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="SUBSTITUTED">Substituted</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {status === 'CANCELLED' && (
                    <FormField
                      control={form.control}
                      name="cancellationReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cancellation Reason</FormLabel>
                          <FormControl>
                            <Input placeholder="Reason for cancellation..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </section>
            )}

            <div className="grid gap-2 border border-foreground bg-card p-3 sm:grid-cols-[1fr_auto]">
              <Button 
                type="submit" 
                className="h-11 w-full rounded-none"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : initialData ? 'Update Schedule' : 'Create Schedule Slot'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="h-11 w-full rounded-none border-foreground sm:w-auto"
                disabled={isLoading}
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
