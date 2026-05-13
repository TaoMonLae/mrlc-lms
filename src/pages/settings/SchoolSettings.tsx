import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const schoolSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  shortName: z.string().min(2, 'Short name is required'),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(5, 'Phone is required'),
  email: z.string().email('Invalid email'),
  website: z.string().url('Invalid URL').or(z.literal('')),
  academicYear: z.string().min(4, 'Academic year is required'),
  principalName: z.string().min(2, 'Principal name is required'),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schoolSchema>;

const MOCK_SCHOOL_DATA = {
  name: 'Mon Refugee Learning Centre',
  shortName: 'MRLC',
  address: 'Mae Sot, Tak Province, Thailand',
  phone: '',
  email: 'contact@mrlc.edu',
  website: '',
  academicYear: '2025-2026',
  principalName: '',
  description: 'Providing quality GED education to Mon refugee learners.',
};

export default function SchoolSettings() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(schoolSchema),
  });

  useEffect(() => {
    reset(MOCK_SCHOOL_DATA);
  }, [reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log('Saved school settings:', data);
      toast.success('School profile updated successfully');
      reset(data); // reset form with new data to clear isDirty
    } catch (error) {
      toast.error('Failed to update school profile');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">School Profile</h2>
        <p className="text-sm text-slate-500 mt-1">Basic information about the school used across the system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">School Full Name</Label>
          <Input id="name" {...register('name')} placeholder="e.g. Acme International School" />
          {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortName">Short Name / Abbreviation</Label>
          <Input id="shortName" {...register('shortName')} placeholder="e.g. AIS" />
          {errors.shortName && <p className="text-xs text-red-500 font-medium">{errors.shortName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="academicYear">Current Academic Year</Label>
          <Input id="academicYear" {...register('academicYear')} placeholder="e.g. 2025-2026" />
          {errors.academicYear && <p className="text-xs text-red-500 font-medium">{errors.academicYear.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="principalName">Principal / Director Name</Label>
          <Input id="principalName" {...register('principalName')} placeholder="e.g. Dr. Sarah Smith" />
          {errors.principalName && <p className="text-xs text-red-500 font-medium">{errors.principalName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Public Email</Label>
          <Input id="email" type="email" {...register('email')} placeholder="e.g. contact@school.edu" />
          {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" {...register('phone')} placeholder="e.g. +1 (555) 123-4567" />
          {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="website">Website URL</Label>
          <Input id="website" {...register('website')} placeholder="e.g. https://school.edu" />
          {errors.website && <p className="text-xs text-red-500 font-medium">{errors.website.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Physical Address</Label>
          <Textarea id="address" {...register('address')} placeholder="Full physical address" rows={3} />
          {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">School Description (Optional)</Label>
          <Textarea id="description" {...register('description')} placeholder="A brief description of the school's mission or profile" rows={3} />
          {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? 'Saving...' : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
