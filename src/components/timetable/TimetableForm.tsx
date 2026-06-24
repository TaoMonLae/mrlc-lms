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
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, User, BookOpen, CalendarDays } from 'lucide-react';
import { TimetableEntry, DayOfWeek } from '@/src/pages/timetable/TimetablePage';

type Option = { id: string; name: string };

const SUBJECT_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];
const colorForSubject = (subjectId: string) => {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) hash = (hash * 31 + subjectId.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
};

const timetableSchema = z.object({
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  teacherId: z.string().optional(),
  substituteTeacherId: z.string().optional(),
  academicYear: z.string().min(1, 'Academic year is required'),
  term: z.string().min(1, 'Term is required'),
  dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  room: z.string().min(1, 'Room is required'),
  scheduleType: z.enum(['CLASS', 'HOLIDAY', 'SPECIAL_EVENT', 'EXAM', 'MEETING']),
  recurrence: z.enum(['ONCE', 'WEEKLY', 'BIWEEKLY']),
  effectiveFrom: z.string().optional(),
  effectiveUntil: z.string().optional(),
  eventDate: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (['CLASS', 'EXAM'].includes(data.scheduleType)) {
    if (!data.classId) ctx.addIssue({ code: 'custom', path: ['classId'], message: 'Class is required' });
    if (!data.subjectId) ctx.addIssue({ code: 'custom', path: ['subjectId'], message: 'Subject is required' });
    if (!data.teacherId) ctx.addIssue({ code: 'custom', path: ['teacherId'], message: 'Teacher is required' });
  }
});

type TimetableFormValues = z.infer<typeof timetableSchema>;

interface TimetableFormProps {
  initialData?: TimetableEntry;
  onSubmit: (data: TimetableFormValues) => void;
  isLoading?: boolean;
}

export function TimetableForm({ initialData, onSubmit, isLoading }: TimetableFormProps) {
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
      classId: initialData?.classId || '',
      subjectId: initialData?.subjectId || '',
      teacherId: initialData?.teacherId || '',
      substituteTeacherId: (initialData as any)?.substituteTeacherId || '',
      academicYear: (initialData as any)?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      term: (initialData as any)?.term || 'Term 1',
      dayOfWeek: initialData?.dayOfWeek || 'Monday',
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      room: initialData?.room || '',
      scheduleType: (initialData as any)?.scheduleType || 'CLASS',
      recurrence: (initialData as any)?.recurrence || 'WEEKLY',
      effectiveFrom: (initialData as any)?.effectiveFrom?.slice(0, 10) || '',
      effectiveUntil: (initialData as any)?.effectiveUntil?.slice(0, 10) || '',
      eventDate: (initialData as any)?.eventDate?.slice(0, 10) || '',
      notes: initialData?.notes || '',
    },
  });

  const handleEnrichedSubmit = (values: TimetableFormValues) => {
    onSubmit({
      ...values,
      className: classOptions.find(c => c.id === values.classId)?.name,
      subjectName: subjectOptions.find(s => s.id === values.subjectId)?.name,
      teacherName: teacherOptions.find(t => t.id === values.teacherId)?.name,
      substituteTeacherName: teacherOptions.find(t => t.id === values.substituteTeacherId)?.name,
      subjectColor: values.subjectId ? colorForSubject(values.subjectId) : 'bg-amber-500',
    } as any);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleEnrichedSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Assignment Settings */}
          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-b border-slate-200 dark:border-surface-raised">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-aubergine-600" />
                  Primary Assignment
                </h3>
              </div>
              <CardContent className="pt-6 space-y-4">
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
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-b border-slate-200 dark:border-surface-raised">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-aubergine-600" />
                  Location & Notes
                </h3>
              </div>
              <CardContent className="pt-6 space-y-4">
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
              </CardContent>
            </Card>
          </div>

          {/* Time Settings */}
          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-b border-slate-200 dark:border-surface-raised">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-aubergine-600" />
                  Schedule Timing
                </h3>
              </div>
              <CardContent className="pt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of the Week</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Monday">Monday</SelectItem>
                          <SelectItem value="Tuesday">Tuesday</SelectItem>
                          <SelectItem value="Wednesday">Wednesday</SelectItem>
                          <SelectItem value="Thursday">Thursday</SelectItem>
                          <SelectItem value="Friday">Friday</SelectItem>
                          <SelectItem value="Saturday">Saturday</SelectItem>
                          <SelectItem value="Sunday">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-aubergine-50 dark:bg-aubergine-900/20 p-4 rounded-lg flex gap-3 text-[11px] text-aubergine-700 dark:text-aubergine-400">
                  <Clock className="h-4 w-4 shrink-0" />
                  <p>Check for scheduling conflicts before publishing. The system will alert you if the room or teacher is already occupied at this time.</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : initialData ? 'Update Schedule' : 'Create Schedule Slot'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-11 border-slate-200 dark:border-surface-raised" 
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
