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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pin, Users, Calendar, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { Announcement, AnnouncementAudience } from '@/src/pages/announcements/AnnouncementsList';

const announcementSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  body: z.string().min(10, 'Body must be at least 10 characters').max(2000),
  audience: z.enum(['ALL', 'TEACHERS', 'STUDENTS', 'CLASS'] as const),
  classId: z.string().optional(),
  pinned: z.boolean(),
  expiresAt: z.string().optional(),
});

type AnnouncementFormValues = {
  title: string;
  body: string;
  audience: 'ALL' | 'TEACHERS' | 'STUDENTS' | 'CLASS';
  classId?: string;
  pinned: boolean;
  expiresAt?: string;
};

interface AnnouncementFormProps {
  initialData?: Announcement;
  onSubmit: (data: AnnouncementFormValues) => void;
  isLoading?: boolean;
}

export function AnnouncementForm({ initialData, onSubmit, isLoading }: AnnouncementFormProps) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: initialData?.title || '',
      body: initialData?.body || '',
      audience: initialData?.audience || 'ALL',
      classId: initialData?.classId || '',
      pinned: initialData?.pinned || false,
      expiresAt: initialData?.expiresAt?.split('T')[0] || '',
    },
  });

  const watchAudience = form.watch('audience');

  useEffect(() => {
    if (watchAudience !== 'CLASS') return;
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!Array.isArray(data)) return;
        setClasses(data.map((item: any) => ({ id: item.id, name: item.name || item.code || item.id })));
      })
      .catch(() => setClasses([]));
  }, [watchAudience]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 dark:border-surface-raised shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 dark:text-white font-semibold">Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Annual Sports Day 2025" 
                          {...field} 
                          className="h-12 text-lg font-medium ring-offset-aubergine-600 focus-visible:ring-aubergine-600"
                        />
                      </FormControl>
                      <FormDescription>
                        A clear and concise heading for the announcement.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-900 dark:text-white font-semibold">Message Body</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Write your announcement details here..." 
                          className="min-h-[250px] resize-none focus-visible:ring-aubergine-600 text-base leading-relaxed"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Provide all necessary details. You can use multiple paragraphs.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-4 rounded-r-lg flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                <p className="font-bold mb-1 uppercase tracking-wider">Communication Policy</p>
                <p>Announcements are visible to the selected audience immediately upon publishing. Ensure the content follows school guidelines for professional communication.</p>
              </div>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-b border-slate-200 dark:border-surface-raised">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-aubergine-600" />
                  Target Audience
                </h3>
              </div>
              <CardContent className="pt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Broadcast To</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALL">Everyone (Public)</SelectItem>
                          <SelectItem value="TEACHERS">Teachers Only</SelectItem>
                          <SelectItem value="STUDENTS">Students Only</SelectItem>
                          <SelectItem value="CLASS">Specific Class</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchAudience === 'CLASS' && (
                  <FormField
                    control={form.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Class</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes.map((classItem) => (
                              <SelectItem key={classItem.id} value={classItem.id}>{classItem.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
              <div className="bg-slate-50 dark:bg-surface-raised/50 px-4 py-3 border-b border-slate-200 dark:border-surface-raised">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-aubergine-600" />
                  Options & Visibility
                </h3>
              </div>
              <CardContent className="pt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="pinned"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-surface-raised p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm flex items-center gap-2">
                          <Pin className="h-3 w-3" />
                          Pin to Top
                        </FormLabel>
                        <FormDescription className="text-[10px]">
                          Always appears at the top of lists.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-aubergine-600"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Expiry Date (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Announcement will be archived after this date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  initialData ? 'Update Announcement' : 'Publish Announcement'
                )}
              </Button>
              <Button type="button" variant="outline" className="w-full h-11 border-slate-200 dark:border-surface-raised" disabled={isLoading}>
                Cancel
              </Button>
            </div>
            
            <div className="pt-4 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600 text-[10px] uppercase font-bold tracking-widest">
              <ShieldCheck className="h-3 w-3" />
              Secure School Broadcast
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
