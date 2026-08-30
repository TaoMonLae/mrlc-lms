import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSettings } from '@/src/providers/SettingsProvider';

const schoolSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  shortName: z.string().min(2, 'Short name is required'),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').or(z.literal('')),
  website: z.string().url('Invalid URL').or(z.literal('')),
  academicYear: z.string().min(4, 'Academic year is required'),
  principalName: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schoolSchema>;

export default function SchoolSettings() {
  const { schoolProfile } = useSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(schoolSchema),
  });

  useEffect(() => {
    reset(schoolProfile);
  }, [reset, schoolProfile]);

  const { updateSchoolProfile } = useSettings();

  const onSubmit = async (data: FormValues) => {
    try {
      await updateSchoolProfile(data);
      toast.success('School profile updated successfully');
      reset(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update school profile');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative">
      <div className="border-b border-border px-5 py-6 sm:px-7">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-academic-teal">Identity record</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-foreground">School profile</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">The canonical school details used in reports, public contact points and academic records.</p>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-5 py-6 md:grid-cols-2 sm:px-7">
        <div className="space-y-2">
          <Label htmlFor="name">School full name</Label>
          <Input id="name" {...register('name')} placeholder="Mon Refugee Learning Centre" />
          {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortName">Short name / abbreviation</Label>
          <Input id="shortName" {...register('shortName')} placeholder="MRLC" />
          {errors.shortName && <p className="text-xs text-red-500 font-medium">{errors.shortName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="academicYear">Current academic year</Label>
          <Input id="academicYear" {...register('academicYear')} placeholder="2026–2027" />
          {errors.academicYear && <p className="text-xs text-red-500 font-medium">{errors.academicYear.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="principalName">Principal / director</Label>
          <Input id="principalName" {...register('principalName')} placeholder="Director name" />
          {errors.principalName && <p className="text-xs text-red-500 font-medium">{errors.principalName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Public email</Label>
          <Input id="email" type="email" {...register('email')} placeholder="contact@school.org" />
          {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" {...register('phone')} placeholder="Public contact number" />
          {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="website">Website URL</Label>
          <Input id="website" {...register('website')} placeholder="https://school.org" />
          {errors.website && <p className="text-xs text-red-500 font-medium">{errors.website.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Physical address</Label>
          <Textarea id="address" {...register('address')} placeholder="Full school address" rows={3} />
          {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">School description <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="description" {...register('description')} placeholder="A concise description of the school’s mission and community" rows={3} />
          {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-foreground bg-card/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-xs font-medium text-muted-foreground" role="status">
          {isDirty ? 'Unsaved changes are ready to review.' : 'School profile is up to date.'}
        </p>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Saving…' : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save profile
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
