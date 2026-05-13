import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, UploadCloud, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const brandingSchema = z.object({
  primaryColor: z.string().min(4),
  accentColor: z.string().min(4),
  darkModeDefault: z.boolean(),
  reportHeaderStyle: z.enum(['standard', 'minimal', 'elegant']),
});

type FormValues = z.infer<typeof brandingSchema>;

export default function BrandingSettings() {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: '#ea580c', // orange-600
      accentColor: '#3b82f6', // blue-500
      darkModeDefault: false,
      reportHeaderStyle: 'standard',
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log('Saved branding settings:', data);
      toast.success('Branding settings updated successfully');
    } catch (error) {
      toast.error('Failed to update branding settings');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setter(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const currentPrimaryColor = watch('primaryColor');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Branding & Output</h2>
        <p className="text-sm text-slate-500 mt-1">Configure how the LMS and generated documents look.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Logos & Assets */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Logos & Assets</h3>
          
          <div className="space-y-3">
            <Label>School Logo (Display & PDF)</Label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center max-w-sm">
              {logoPreview ? (
                <div className="relative group">
                  <img src={logoPreview} alt="Logo preview" className="h-20 object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setLogoPreview(null)}>Remove</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">PNG, JPG or SVG max 2MB.</p>
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center">
                      <UploadCloud className="h-4 w-4 mr-2" /> Browse File
                    </div>
                  </Label>
                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, setLogoPreview)} />
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Official Stamp / Signature (For Reports)</Label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center max-w-sm bg-slate-50 dark:bg-slate-900/50">
              {signaturePreview ? (
                <div className="relative group">
                  <img src={signaturePreview} alt="Signature preview" className="h-16 object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSignaturePreview(null)}>Remove</Button>
                  </div>
                </div>
              ) : (
                <>
                  <Label htmlFor="sig-upload" className="cursor-pointer inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <UploadCloud className="h-4 w-4 mr-2" /> Upload transparent PNG signature
                  </Label>
                  <input id="sig-upload" type="file" accept="image/png" className="hidden" onChange={(e) => handleFileUpload(e, setSignaturePreview)} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Colors & Styling */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Colors & Appearance</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  {...register('primaryColor')}
                  className="h-10 w-10 p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer"
                />
                <code className="text-xs text-slate-500 uppercase">{currentPrimaryColor}</code>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  {...register('accentColor')}
                  className="h-10 w-10 p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 cursor-pointer"
                />
                <code className="text-xs text-slate-500 uppercase">{watch('accentColor')}</code>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Report Header Style</Label>
            <Select value={watch('reportHeaderStyle')} onValueChange={(v: any) => setValue('reportHeaderStyle', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (Logo left, text right)</SelectItem>
                <SelectItem value="minimal">Minimal (Logo center, small text)</SelectItem>
                <SelectItem value="elegant">Elegant (Logo above text, centered)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div>
                <Label className="text-base">Dark Mode Default</Label>
                <p className="text-xs text-slate-500 mt-0.5">Enable dark mode by default for new users</p>
              </div>
              <Switch 
                checked={watch('darkModeDefault')} 
                onCheckedChange={(checked) => setValue('darkModeDefault', checked, { shouldDirty: true })} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* Preview Card */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Header Preview</h3>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 overflow-hidden max-w-2xl">
           <div className={`flex ${
             watch('reportHeaderStyle') === 'standard' ? 'flex-row items-center gap-6' : 
             watch('reportHeaderStyle') === 'minimal' ? 'flex-col items-center text-center gap-4' : 
             'flex-col items-center text-center gap-6'
           }`}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="h-16 w-16 bg-slate-100 rounded-md flex items-center justify-center">
                   <ImageIcon className="h-6 w-6 text-slate-300" />
                </div>
              )}
              <div className={`${watch('reportHeaderStyle') !== 'standard' ? 'items-center' : ''}`}>
                 <h4 className="text-xl font-bold font-serif" style={{ color: currentPrimaryColor }}>Acme International School</h4>
                 <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">Excellence in Education</p>
              </div>
           </div>
           <div className="mt-6 border-t-2 opacity-20" style={{ borderColor: currentPrimaryColor }}></div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Branding
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
