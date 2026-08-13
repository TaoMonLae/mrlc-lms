import React from 'react';
import { Crop, Loader2, MoveHorizontal, MoveVertical, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { calculateSquareCrop } from '@/src/lib/profilePhotoCrop';
import { toast } from 'sonner';

type ProfilePhotoCropDialogProps = {
  file: File | null;
  open: boolean;
  onCancel: () => void;
  onCropped: (file: File) => void | Promise<void>;
};

const OUTPUT_SIZE = 1024;

export function ProfilePhotoCropDialog({ file, open, onCancel, onCropped }: ProfilePhotoCropDialogProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [positionX, setPositionX] = React.useState(0);
  const [positionY, setPositionY] = React.useState(0);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => {
    if (!file || !open) { setImage(null); return; }
    const objectUrl = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.onerror = () => toast.error('This image could not be opened for cropping');
    nextImage.src = objectUrl;
    setZoom(1);
    setPositionX(0);
    setPositionY(0);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, open]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const crop = calculateSquareCrop(image.naturalWidth, image.naturalHeight, zoom, positionX, positionY);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, canvas.width, canvas.height);
  }, [image, positionX, positionY, zoom]);

  const applyCrop = async () => {
    if (!file || !image) return;
    setProcessing(true);
    try {
      const output = document.createElement('canvas');
      output.width = OUTPUT_SIZE;
      output.height = OUTPUT_SIZE;
      const context = output.getContext('2d');
      if (!context) throw new Error('Image cropping is unavailable in this browser');
      const crop = calculateSquareCrop(image.naturalWidth, image.naturalHeight, zoom, positionX, positionY);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('The cropped photo could not be created');
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'profile-photo';
      await onCropped(new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to crop profile picture');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !processing) onCancel(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!processing}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crop className="size-5" /> Crop profile picture</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="mx-auto aspect-square w-full max-w-[22rem] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10">
            {image ? <canvas ref={canvasRef} width={480} height={480} className="h-full w-full" aria-label="Cropped profile picture preview" />
              : <div className="flex h-full items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 size-4 animate-spin" /> Loading photo…</div>}
          </div>

          <CropControl icon={ZoomIn} label="Zoom" value={zoom} min={1} max={3} step={0.01} onChange={setZoom} />
          <CropControl icon={MoveHorizontal} label="Horizontal position" value={positionX} min={-100} max={100} step={1} onChange={setPositionX} />
          <CropControl icon={MoveVertical} label="Vertical position" value={positionY} min={-100} max={100} step={1} onChange={setPositionY} />
          <p className="text-xs leading-relaxed text-slate-500">Adjust the framing inside the square. The saved photo will be 1024 × 1024 pixels with no filters or visual effects.</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>Cancel</Button>
          <Button type="button" onClick={applyCrop} disabled={!image || processing}>{processing ? <Loader2 className="size-4 animate-spin" /> : <Crop className="size-4" />} Use cropped photo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CropControl({ icon: Icon, label, value, min, max, step, onChange }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-xs"><Icon className="size-3.5 text-slate-400" /> {label}</Label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-primary" aria-label={label} />
    </div>
  );
}
