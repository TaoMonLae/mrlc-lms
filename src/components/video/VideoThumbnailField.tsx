import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const ALLOWED_THUMBNAIL_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const isValidThumbnailUrl = (value: string): boolean => {
  if (!value) return true;
  if (/^\/uploads\/videos\/[a-zA-Z0-9._-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export async function uploadVideoThumbnail(file: File): Promise<string> {
  const body = new FormData();
  body.append('thumbnail', file);
  const res = await fetch('/api/videos/thumbnails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not upload thumbnail');
  return data.url;
}

export async function discardTemporaryVideoAsset(url: string): Promise<void> {
  await fetch(`/api/videos/files?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
  }).catch(() => {});
}

type Props = {
  value: string;
  file: File | null;
  error?: string;
  onUrlChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
};

export function VideoThumbnailField({ value, file, error, onUrlChange, onFileChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    if (!ALLOWED_THUMBNAIL_TYPES.has(selected.type)) {
      toast.error('Choose a JPG, PNG, or WEBP image');
      return;
    }
    if (selected.size > MAX_THUMBNAIL_BYTES) {
      toast.error('Thumbnail images must be 5 MB or smaller');
      return;
    }
    onFileChange(selected);
  };

  const preview = previewUrl || value;

  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="thumbnailUrl">Thumbnail (Optional)</Label>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <div className="aspect-video overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
          {preview ? (
            <img src={preview} alt="Video thumbnail preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">No thumbnail</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Input
            id="thumbnailUrl"
            value={value}
            onChange={(event) => {
              onUrlChange(event.target.value);
              if (event.target.value) onFileChange(null);
            }}
            placeholder="https://..."
          />
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={chooseFile} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" />
              {file ? 'Choose another image' : 'Upload image'}
            </Button>
            {(file || value) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { onFileChange(null); onUrlChange(''); }}>
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-slate-400">JPG, PNG, or WEBP up to 5 MB. Images are optimized for video cards.</p>
          {error && <p className="text-xs font-medium text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
