import React from 'react';
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

const timetableSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  room: z.string().min(1, 'Room is required'),
  notes: z.string().optional(),
});

type TimetableFormValues = z.infer<typeof timetableSchema>;

interface TimetableFormProps {
  initialData?: TimetableEntry;
  onSubmit: (data: TimetableFormValues) => void;
  isLoading?: boolean;
}

export function TimetableForm({ initialData, onSubmit, isLoading }: TimetableFormProps) {
  const form = useForm<TimetableFormValues>({
    resolver: zodResolver(timetableSchema),
    defaultValues: {
      classId: initialData?.classId || '',
      subjectId: initialData?.subjectId || '',
      teacherId: initialData?.teacherId || '',
      dayOfWeek: initialData?.dayOfWeek || 'Monday',
      startTime: initialData?.startTime || '',
      endTime: initialData?.endTime || '',
      room: initialData?.room || '',
      notes: initialData?.notes || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                          <SelectItem value="c1">Grade 10A</SelectItem>
                          <SelectItem value="c2">Grade 10B</SelectItem>
                          <SelectItem value="c3">Grade 11A</SelectItem>
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
                          <SelectItem value="s1">Mathematics</SelectItem>
                          <SelectItem value="s2">Physics</SelectItem>
                          <SelectItem value="s3">English</SelectItem>
                          <SelectItem value="s4">History</SelectItem>
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
                          <SelectItem value="t1">John Smith</SelectItem>
                          <SelectItem value="t2">Sarah Wilson</SelectItem>
                          <SelectItem value="t3">Jane Doe</SelectItem>
                          <SelectItem value="t4">Robert Brown</SelectItem>
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
