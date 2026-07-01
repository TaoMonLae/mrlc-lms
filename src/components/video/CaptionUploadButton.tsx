import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/** Uploads a .vtt/.srt subtitle file and returns its served URL via onUploaded. */
export function CaptionUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'vtt' && ext !== 'srt') { toast.error('Please choose a .vtt or .srt file'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('captions', file);
      const res = await fetch('/api/videos/captions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onUploaded(data.url);
      toast.success('Captions uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Could not upload captions');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".vtt,.srt" className="hidden" onChange={handleFile} />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Upload .vtt
      </Button>
    </>
  );
}
