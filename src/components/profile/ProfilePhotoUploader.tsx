import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ProfilePhotoUploaderProps = {
  currentUrl?: string | null;
  fallbackText?: string;
  targetType?: 'user' | 'student' | 'teacher';
  targetId?: string | null;
  onUploaded?: (url: string) => void;
  className?: string;
  imageClassName?: string;
  buttonLabel?: string;
};

export function ProfilePhotoUploader({
  currentUrl,
  fallbackText = 'U',
  targetType = 'user',
  targetId,
  onUploaded,
  className = '',
  imageClassName = 'h-24 w-24 rounded-full',
  buttonLabel = 'Change Photo',
}: ProfilePhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || '');

  React.useEffect(() => {
    setPreviewUrl(currentUrl || '');
  }, [currentUrl]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile picture must be 5 MB or smaller');
      event.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Profile picture must be an image file');
      event.target.value = '';
      return;
    }

    const token = sessionStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetType', targetType);
    if (targetId) formData.append('targetId', targetId);

    setUploading(true);
    try {
      const res = await fetch('/api/profile-photo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Failed to upload profile picture');
      if (!payload.url) throw new Error('Upload succeeded but no photo URL was returned');
      setPreviewUrl(payload.url);
      onUploaded?.(payload.url);
      toast.success('Profile picture updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className={`${imageClassName} overflow-hidden bg-slate-100 dark:bg-surface-raised border border-slate-200 dark:border-surface-raised flex items-center justify-center text-slate-500 font-bold`}>
        {previewUrl ? (
          <img src={previewUrl} alt="Profile" className="h-full w-full object-cover" />
        ) : fallbackText ? (
          <span>{fallbackText.slice(0, 2).toUpperCase()}</span>
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-400" />
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Camera className="mr-2 h-4 w-4" />
        {uploading ? 'Uploading...' : buttonLabel}
      </Button>
    </div>
  );
}
