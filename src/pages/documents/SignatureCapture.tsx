import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Eraser, Loader2, PenLine, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasVisibleSignatureStrokes } from './signaturePixels';

export interface SignatureCaptureProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  id?: string;
}

const WIDTH = 1200;
const HEIGHT = 400;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PIXELS = 4_000_000;
const INK = '#102b3b';
const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function imageFromDataUrl(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be read. Choose a PNG, JPG or WebP signature.'));
    image.src = source;
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The file could not be read. Please choose it again.'));
    reader.readAsDataURL(file);
  });
}

/** Ignore transparent/near-white pixels so an empty upload or a tap is not a signature. */
function hasSignature(canvas: HTMLCanvasElement): boolean {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return false;
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return hasVisibleSignatureStrokes(data, canvas.width, canvas.height);
}

/** Capture only. The parent must review, authorize and submit the resulting image. */
export default function SignatureCapture({ value, onChange, onBusyChange, disabled = false, id }: SignatureCaptureProps) {
  const generatedId = useId();
  const captureId = id || `signature-${generatedId}`;
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [hasMarks, setHasMarks] = useState(Boolean(value));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<HTMLCanvasElement | null>(null);
  const activePointer = useRef<number | null>(null);
  const previousPoint = useRef<{ x: number; y: number } | null>(null);
  const strokeSnapshot = useRef<ImageData | null>(null);
  const marksBeforeStroke = useRef(false);
  const revision = useRef(0);
  const lastEmittedValue = useRef<string | null | undefined>(undefined);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const busyChangeRef = useRef(onBusyChange);
  busyChangeRef.current = onBusyChange;

  useEffect(() => { busyChangeRef.current?.(busy || drawing); }, [busy, drawing]);
  useEffect(() => () => {
    revision.current += 1;
    busyChangeRef.current?.(false);
  }, []);

  const getBuffer = useCallback(() => {
    if (!bufferRef.current) {
      bufferRef.current = document.createElement('canvas');
      bufferRef.current.width = WIDTH;
      bufferRef.current.height = HEIGHT;
    }
    return bufferRef.current;
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext('2d');
    context?.clearRect(0, 0, width, height);
    context?.drawImage(getBuffer(), 0, 0, width, height);
  }, [getBuffer]);

  useEffect(() => {
    paint();
    const canvas = canvasRef.current;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(paint);
    if (canvas) observer?.observe(canvas);
    window.addEventListener('resize', paint);
    return () => { observer?.disconnect(); window.removeEventListener('resize', paint); };
  }, [paint]);

  useEffect(() => {
    if (value === lastEmittedValue.current) return;
    lastEmittedValue.current = value;
    const request = ++revision.current;
    const buffer = getBuffer();
    const context = buffer.getContext('2d');
    activePointer.current = null;
    strokeSnapshot.current = null;
    setDrawing(false);
    if (!value) {
      context?.clearRect(0, 0, WIDTH, HEIGHT);
      setHasMarks(false); setBusy(false); setError(''); paint();
      return;
    }
    if (!/^data:image\/(?:png|jpeg|webp);base64,/.test(value) || value.length > MAX_FILE_BYTES * 1.4) {
      setBusy(false);
      setError('The saved signature image could not be loaded. Clear it and add your signature again.');
      return;
    }
    setBusy(true);
    imageFromDataUrl(value).then(image => {
      if (request !== revision.current) return;
      if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error('Choose an image of 4 megapixels or less.');
      context?.clearRect(0, 0, WIDTH, HEIGHT);
      const scale = Math.min(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context?.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      setHasMarks(true); setError(''); paint();
    }).catch(cause => {
      if (request === revision.current) setError(cause instanceof Error ? cause.message : 'Unable to load signature.');
    }).finally(() => { if (request === revision.current) setBusy(false); });
    return () => { if (request === revision.current) revision.current += 1; };
  }, [value, getBuffer, paint]);

  const clear = () => {
    revision.current += 1;
    activePointer.current = null;
    strokeSnapshot.current = null;
    setDrawing(false);
    getBuffer().getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT);
    setHasMarks(false); setError(''); setBusy(false);
    lastEmittedValue.current = null;
    changeRef.current(null);
    paint();
  };

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(WIDTH, (event.clientX - bounds.left) * WIDTH / bounds.width)),
      y: Math.max(0, Math.min(HEIGHT, (event.clientY - bounds.top) * HEIGHT / bounds.height)),
    };
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || busy || mode !== 'draw' || activePointer.current !== null || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    const context = getBuffer().getContext('2d');
    if (!context) { setError('Drawing is unavailable in this browser. Upload your signature instead.'); return; }
    activePointer.current = event.pointerId;
    marksBeforeStroke.current = hasMarks;
    previousPoint.current = point(event);
    strokeSnapshot.current = context.getImageData(0, 0, WIDTH, HEIGHT);
    try { event.currentTarget.setPointerCapture(event.pointerId); }
    catch {
      activePointer.current = null;
      strokeSnapshot.current = null;
      setError('Drawing is unavailable in this browser. Upload your signature instead.');
      return;
    }
    setDrawing(true);
    setError('');
  };

  const drawStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId || !previousPoint.current || disabled) return;
    event.preventDefault();
    const next = point(event);
    const context = getBuffer().getContext('2d');
    if (!context) return;
    context.strokeStyle = INK;
    context.lineWidth = 6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(previousPoint.current.x, previousPoint.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    previousPoint.current = next;
    setHasMarks(true);
    paint();
  };

  const endStroke = (event: React.PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setDrawing(false);
    previousPoint.current = null;
    const buffer = getBuffer();
    if (cancelled || disabled) {
      if (strokeSnapshot.current) buffer.getContext('2d')?.putImageData(strokeSnapshot.current, 0, 0);
      setHasMarks(marksBeforeStroke.current);
      paint();
    } else if (hasSignature(buffer)) {
      const source = buffer.toDataURL('image/png');
      lastEmittedValue.current = source;
      changeRef.current(source);
      setError('');
    } else {
      setError('Draw a complete signature with visible strokes, or upload a signature image.');
    }
    strokeSnapshot.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled || busy) return;
    if (!SUPPORTED_TYPES.includes(file.type)) { setError('Choose a PNG, JPG or WebP image. SVG and animated files are not supported.'); return; }
    if (file.size > MAX_FILE_BYTES) { setError('Choose a signature image smaller than 2 MB.'); return; }
    const request = ++revision.current;
    setBusy(true); setError('');
    try {
      const image = await imageFromDataUrl(await readFile(file));
      if (request !== revision.current) return;
      if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > MAX_PIXELS) {
        throw new Error('Choose a signature image of 4 megapixels or less.');
      }
      const candidate = document.createElement('canvas');
      candidate.width = WIDTH; candidate.height = HEIGHT;
      const context = candidate.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('This browser could not process the signature image.');
      const scale = Math.min((WIDTH - 40) / image.naturalWidth, (HEIGHT - 40) / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      if (!hasSignature(candidate)) throw new Error('The image appears blank or too small. Choose a clear image of your signature.');
      // Remove a plain white paper background so the saved signature does not
      // cover the document rules or school chop with a white rectangle.
      const pixels = context.getImageData(0, 0, WIDTH, HEIGHT);
      for (let index = 0; index < pixels.data.length; index += 4) {
        if (Math.min(pixels.data[index], pixels.data[index + 1], pixels.data[index + 2]) >= 245) pixels.data[index + 3] = 0;
      }
      context.putImageData(pixels, 0, 0);
      getBuffer().getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT);
      getBuffer().getContext('2d')?.drawImage(candidate, 0, 0);
      const source = candidate.toDataURL('image/png');
      lastEmittedValue.current = source;
      changeRef.current(source);
      setHasMarks(true); paint();
    } catch (cause) {
      if (request === revision.current) setError(cause instanceof Error ? cause.message : 'Unable to read this signature image.');
    } finally { if (request === revision.current) setBusy(false); }
  };

  return <div id={captureId} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-2" role="group" aria-label="Signature input method">
        <Button type="button" size="sm" variant={mode === 'draw' ? 'default' : 'outline'} aria-pressed={mode === 'draw'} disabled={disabled || busy || drawing} onClick={() => setMode('draw')}><PenLine aria-hidden="true" />Draw</Button>
        <Button type="button" size="sm" variant={mode === 'upload' ? 'default' : 'outline'} aria-pressed={mode === 'upload'} disabled={disabled || busy || drawing} onClick={() => setMode('upload')}><Upload aria-hidden="true" />Upload</Button>
      </div>
      <Button type="button" size="sm" variant="ghost" disabled={disabled || busy || drawing || (!hasMarks && !value)} onClick={clear}><Eraser aria-hidden="true" />Clear signature</Button>
    </div>
    <p id={`${captureId}-instructions`} className="text-xs leading-5 text-muted-foreground">
      {mode === 'draw' ? 'Draw your signature below using a mouse, finger or pen. For keyboard input, choose Upload. Clear the signature to start again.' : 'Upload a clear image of your own signature. PNG, JPG or WebP, up to 2 MB and 4 megapixels. A transparent PNG works best.'}
    </p>
    <div className="relative overflow-hidden rounded-sm border border-input bg-white">
      <canvas ref={canvasRef} role="img" aria-label={mode === 'draw' ? 'Signature drawing area' : 'Signature preview'} aria-describedby={`${captureId}-instructions`} aria-disabled={disabled || busy || mode !== 'draw'}
        className={`block aspect-[3/1] w-full ${mode === 'draw' && !disabled && !busy ? 'cursor-crosshair touch-none' : 'cursor-default'}`}
        style={{ touchAction: mode === 'draw' && !disabled && !busy ? 'none' : 'auto' }}
        onPointerDown={startStroke} onPointerMove={drawStroke} onPointerUp={event => endStroke(event)} onPointerCancel={event => endStroke(event, true)} onLostPointerCapture={event => endStroke(event, true)}>
        Use the Upload option to provide an image of your signature.
      </canvas>
      {!hasMarks && !busy && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400" aria-hidden="true">{mode === 'draw' ? 'Sign here' : 'Signature preview'}</span>}
      {busy && <span className="absolute inset-0 flex items-center justify-center gap-2 bg-white/90 text-sm text-slate-700" role="status"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Preparing signature…</span>}
    </div>
    {mode === 'upload' && <div>
      <input ref={fileRef} id={`${captureId}-file`} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload your signature image" disabled={disabled || busy} onChange={upload} tabIndex={-1} />
      <Button type="button" variant="outline" size="sm" disabled={disabled || busy} onClick={() => fileRef.current?.click()}><Upload aria-hidden="true" />Choose signature image</Button>
    </div>}
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    <p className="text-xs text-muted-foreground" aria-live="polite">{value ? 'Signature ready for review. It is applied only when you confirm signing.' : 'No signature has been submitted.'}</p>
  </div>;
}
