import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, X, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

/**
 * Camera capture with a live preview (getUserMedia). Falls back to the device
 * photo picker when the camera isn't available or permission is denied.
 */
export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [noCamera, setNoCamera] = useState(false);
  const [shot, setShot] = useState<string | null>(null); // preview data URL
  const shotBlobRef = useRef<Blob | null>(null);

  async function start() {
    setShot(null); shotBlobRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setReady(true); setNoCamera(false);
    } catch {
      setNoCamera(true);
    }
  }
  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) { setNoCamera(true); return; }
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function snap() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { toast.error('Could not capture photo'); return; }
      shotBlobRef.current = blob;
      setShot(URL.createObjectURL(blob));
      stop();
    }, 'image/jpeg', 0.9);
  }

  function confirm() {
    if (shotBlobRef.current) { onCapture(shotBlobRef.current); }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onCapture(f);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black">
        {shot ? (
          <img src={shot} alt="captured" className="w-full" />
        ) : noCamera ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-white/80">
            <Camera className="h-10 w-10" />
            <p className="text-sm">Camera isn’t available here.</p>
            <Button onClick={() => fileRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" /> Choose / take a photo</Button>
          </div>
        ) : (
          <video ref={videoRef} playsInline muted className="w-full" />
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        {shot ? (
          <>
            <Button variant="outline" className="bg-white/10 text-white" onClick={start}><RefreshCw className="mr-2 h-4 w-4" /> Retake</Button>
            <Button onClick={confirm}><Check className="mr-2 h-4 w-4" /> Use photo</Button>
          </>
        ) : !noCamera && (
          <Button size="lg" className="h-14 w-14 rounded-full p-0" onClick={snap} disabled={!ready} title="Capture">
            <Camera className="h-6 w-6" />
          </Button>
        )}
        <Button variant="ghost" className="text-white/80 hover:text-white" onClick={() => { stop(); onClose(); }}><X className="mr-1 h-4 w-4" /> Cancel</Button>
      </div>
    </div>
  );
}
