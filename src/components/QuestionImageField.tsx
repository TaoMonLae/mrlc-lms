import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authHeaders } from '../lib/api';

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

/**
 * Insert / preview / remove an image attached to an exam question.
 * Uploads to /api/exam-media and returns the stored URL via onChange.
 */
export default function QuestionImageField({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/exam-media', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
    } catch (err: any) {
      toast.error(err.message || 'Could not upload image');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Question media" className="max-h-48 rounded-lg border border-slate-200 dark:border-surface-raised" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Remove image"
              className="absolute -top-2 -right-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-surface-raised p-1 shadow-sm hover:bg-rose-50"
            >
              <X className="h-4 w-4 text-rose-500" />
            </button>
          )}
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={pick} disabled={disabled || uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
          {uploading ? 'Uploading…' : 'Insert image'}
        </Button>
      )}
    </div>
  );
}
