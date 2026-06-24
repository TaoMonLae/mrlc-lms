import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, UploadCloud, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSettings } from '../../providers/SettingsProvider';

const brandingSchema = z.object({
  primaryColor: z.string().min(4),
  accentColor: z.string().min(4),
  darkModeDefault: z.boolean(),
  reportHeaderStyle: z.enum(['standard', 'minimal', 'elegant']),
});

type FormValues = z.infer<typeof brandingSchema>;

export default function BrandingSettings() {
  const { schoolProfile, brandingSettings, updateBranding } = useSettings();
  const [logoPreview, setLogoPreview] = useState<string | null>(brandingSettings.logoUrl);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(brandingSettings.signatureUrl);
  const [heroPreview, setHeroPreview] = useState<string | null>(brandingSettings.loginHeroUrl);
  const [uploadingAsset, setUploadingAsset] = useState<'logo' | 'signature' | 'hero' | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: brandingSettings.primaryColor,
      accentColor: brandingSettings.accentColor,
      darkModeDefault: brandingSettings.darkModeDefault,
      reportHeaderStyle: brandingSettings.reportHeaderStyle,
    }
  });

  // Re-sync once persisted branding loads from the server.
  useEffect(() => {
    reset({
      primaryColor: brandingSettings.primaryColor,
      accentColor: brandingSettings.accentColor,
      darkModeDefault: brandingSettings.darkModeDefault,
      reportHeaderStyle: brandingSettings.reportHeaderStyle,
    });
    setLogoPreview(brandingSettings.logoUrl);
    setSignaturePreview(brandingSettings.signatureUrl);
    setHeroPreview(brandingSettings.loginHeroUrl);
  }, [brandingSettings, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await updateBranding({ ...data, logoUrl: logoPreview, signatureUrl: signaturePreview, loginHeroUrl: heroPreview });
      toast.success('Branding settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update branding settings');
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    assetType: 'logo' | 'signature' | 'hero',
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be 5MB or smaller');
      e.target.value = '';
      return;
    }

    // Validate file type for signature (PNG only for transparency)
    const allowedTypes = assetType === 'signature'
      ? ['image/png']
      : ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

    if (!allowedTypes.includes(file.type)) {
      const typeMsg = assetType === 'signature'
        ? 'Signature must be a PNG file for transparency support'
        : 'File must be an image (PNG, JPG, WEBP, GIF, or SVG)';
      toast.error(typeMsg);
      e.target.value = '';
      return;
    }

    // Validate file extension matches type
    const ext = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = assetType === 'signature'
      ? ['png']
      : ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];

    if (!ext || !allowedExtensions.includes(ext)) {
      const extMsg = assetType === 'signature'
        ? 'Signature file must have .png extension'
        : 'Image file must have valid extension (.png, .jpg, .jpeg, .webp, .gif, or .svg)';
      toast.error(extMsg);
      e.target.value = '';
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    if (!token) {
      toast.error('You must be logged in to upload files');
      return;
    }

    const body = new FormData();
    body.append('file', file);
    setUploadingAsset(assetType);

    try {
      const res = await fetch('/api/settings/assets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('You do not have permission to upload files. Admin access required.');
        }
        throw new Error(payload.error || 'Failed to upload image');
      }

      if (!payload.url) {
        throw new Error('Upload succeeded but no file URL was returned from server');
      }

      setter(payload.url);
      toast.success('Image uploaded successfully. Save branding to apply changes.');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingAsset(null);
      e.target.value = '';
    }
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
            <div className="border-2 border-dashed border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col items-center justify-center text-center max-w-sm">
              {logoPreview ? (
                <div className="relative group">
                  <img src={logoPreview} alt="Logo preview" className="h-20 object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setLogoPreview(null)}>Remove</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-surface-raised flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">PNG, JPG, WEBP, GIF, or SVG max 5MB.</p>
                  <Label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="bg-white dark:bg-canvas border border-slate-200 dark:border-surface-raised px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-surface-indigo transition-colors flex items-center">
                      <UploadCloud className="h-4 w-4 mr-2" /> {uploadingAsset === 'logo' ? 'Uploading...' : 'Browse File'}
                    </div>
                  </Label>
                  <input id="logo-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => handleFileUpload(e, setLogoPreview, 'logo')} disabled={uploadingAsset !== null} />
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Official Stamp / Signature (For Reports)</Label>
            <div className="border-2 border-dashed border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col items-center justify-center text-center max-w-sm bg-slate-50 dark:bg-surface-indigo/50">
              {signaturePreview ? (
                <div className="relative group">
                  <img src={signaturePreview} alt="Signature preview" className="h-16 object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setSignaturePreview(null)}>Remove</Button>
                  </div>
                </div>
              ) : (
                <>
                  <Label htmlFor="sig-upload" className="cursor-pointer inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <UploadCloud className="h-4 w-4 mr-2" /> {uploadingAsset === 'signature' ? 'Uploading...' : 'Upload transparent PNG signature'}
                  </Label>
                  <input
                    id="sig-upload"
                    type="file"
                    accept="image/png"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, setSignaturePreview, 'signature')}
                    disabled={uploadingAsset !== null}
                  />
                  <p className="text-xs text-slate-500 mt-2">PNG format required for transparency support</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Login Page Background</Label>
            <div className="border-2 border-dashed border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col items-center justify-center text-center max-w-sm">
              {heroPreview ? (
                <div className="relative group w-full">
                  <img src={heroPreview} alt="Login background preview" className="h-28 w-full object-cover rounded-lg" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setHeroPreview(null)}>Remove</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-surface-raised flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">Shown behind the login screen.</p>
                  <p className="text-xs text-slate-500 mb-4">Use a wide photo (e.g. 1600×900). PNG, JPG or WEBP, max 5MB.</p>
                  <Label htmlFor="hero-upload" className="cursor-pointer">
                    <div className="bg-white dark:bg-canvas border border-slate-200 dark:border-surface-raised px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-surface-indigo transition-colors flex items-center">
                      <UploadCloud className="h-4 w-4 mr-2" /> {uploadingAsset === 'hero' ? 'Uploading...' : 'Browse File'}
                    </div>
                  </Label>
                  <input id="hero-upload" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFileUpload(e, setHeroPreview, 'hero')} disabled={uploadingAsset !== null} />
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
                  className="h-10 w-10 p-1 rounded border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas cursor-pointer"
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
                  className="h-10 w-10 p-1 rounded border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas cursor-pointer"
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
            <div className="flex items-center justify-between border border-slate-200 dark:border-surface-raised rounded-xl p-4">
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
      <div className="pt-6 border-t border-slate-200 dark:border-surface-raised">
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
                 <h4 className="text-xl font-bold font-serif" style={{ color: currentPrimaryColor }}>{schoolProfile.name}</h4>
                 <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-medium">{schoolProfile.description || schoolProfile.shortName}</p>
              </div>
           </div>
           <div className="mt-6 border-t-2 opacity-20" style={{ borderColor: currentPrimaryColor }}></div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-surface-raised flex justify-end">
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
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
