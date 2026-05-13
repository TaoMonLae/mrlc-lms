import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UploadCloud, Link as LinkIcon, FileCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const resourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Provide a brief description'),
  type: z.enum(['PDF', 'IMAGE', 'VIDEO', 'LINK', 'DOCUMENT', 'OTHER']),
  visibility: z.enum(['TEACHERS_ONLY', 'STUDENTS', 'ALL']),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  externalUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof resourceSchema>;

export default function LibraryNew() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      type: 'DOCUMENT',
      visibility: 'ALL',
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      if (activeTab === 'upload' && !file) {
        toast.error('Please select a file to upload');
        return;
      }
      if (activeTab === 'link' && !data.externalUrl) {
        toast.error('Please provide a valid link/URL');
        return;
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('New resource data:', data, 'File:', file);
      toast.success('Resource added successfully');
      navigate('/library');
    } catch (error) {
      toast.error('Failed to add resource');
    }
  };

  const resourceType = watch('type');

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/library" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Add New Resource</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Upload files or link external content to the central library.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
           
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'upload' 
                  ? 'border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              onClick={() => setActiveTab('upload')}
            >
              <UploadCloud className="h-4 w-4" /> File Upload
            </button>
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'link' 
                  ? 'border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              onClick={() => {
                setActiveTab('link');
                if (resourceType !== 'LINK' && resourceType !== 'VIDEO') {
                  setValue('type', 'LINK');
                }
              }}
            >
              <LinkIcon className="h-4 w-4" /> External Link
            </button>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Input Method Content */}
            {activeTab === 'upload' ? (
              <div className="space-y-2">
                <Label>Select File *</Label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 mb-2">
                         <FileCheck className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                      <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="mt-2 text-red-500 hover:text-red-600">Remove</Button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-10 w-10 text-slate-400 mb-4" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500 mt-1 mb-4">PDF, PPTX, DOCX, JPG, PNG (Max 50MB)</p>
                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-md justify-center text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                          Browse Files
                        </div>
                      </Label>
                      <input id="file-upload" type="file" className="hidden" onChange={(e) => {
                        if (e.target.files?.[0]) setFile(e.target.files[0]);
                      }} />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="externalUrl">External URL *</Label>
                  <Input id="externalUrl" {...register('externalUrl')} placeholder="https://youtube.com/..." />
                  {errors.externalUrl && <p className="text-xs text-red-500 font-medium">{errors.externalUrl.message}</p>}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm border border-blue-100 dark:border-blue-900">
                  You can paste links to YouTube videos, external articles, or Google Drive files here. Make sure they are accessible to your intended audience.
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <Label htmlFor="title">Resource Title *</Label>
                <Input id="title" {...register('title')} placeholder="e.g. Intro to Biology Worksheet" />
                {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" {...register('description')} placeholder="Briefly describe the contents of this resource..." rows={3} />
                {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Resource Type *</Label>
                  <Select value={resourceType} onValueChange={(val: any) => setValue('type', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOCUMENT">Document (Word, Excel)</SelectItem>
                      <SelectItem value="PDF">PDF File</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                      <SelectItem value="LINK">External Link</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-red-500 font-medium">{errors.type.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Visibility *</Label>
                  <Select value={watch('visibility')} onValueChange={(val: any) => setValue('visibility', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Who can see this?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Everyone</SelectItem>
                      <SelectItem value="STUDENTS">Students Only</SelectItem>
                      <SelectItem value="TEACHERS_ONLY">Teachers Only</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.visibility && <p className="text-xs text-red-500 font-medium">{errors.visibility.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Assign to Class (Optional)</Label>
                  <Select value={watch('classId') || "none"} onValueChange={(val) => setValue('classId', val === "none" ? undefined : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Global Resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Global (All Classes) --</SelectItem>
                      <SelectItem value="c1">Grade 10A</SelectItem>
                      <SelectItem value="c2">Grade 10B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign to Subject (Optional)</Label>
                  <Select value={watch('subjectId') || "none"} onValueChange={(val) => setValue('subjectId', val === "none" ? undefined : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="General Resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- General System --</SelectItem>
                      <SelectItem value="math-10">Mathematics</SelectItem>
                      <SelectItem value="bio-10">Biology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
           <Button type="button" variant="outline" onClick={() => navigate('/library')}>
             Cancel
           </Button>
           <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900" disabled={isSubmitting}>
             {isSubmitting ? 'Uploading...' : (
               <>
                 <Save className="mr-2 h-4 w-4" />
                 Save Resource
               </>
             )}
           </Button>
        </div>
      </form>
    </div>
  );
}
