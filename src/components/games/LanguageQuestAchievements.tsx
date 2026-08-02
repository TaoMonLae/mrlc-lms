import { useEffect, useMemo, useState } from 'react';
import { Award, Download, Eye, Flame, Loader2, Lock, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LanguageQuestCourseSummary, LanguageQuestProfile } from '@/src/types/languageQuest';

interface AchievementStudioProps {
  learnerName: string;
  profile: LanguageQuestProfile;
  courses: LanguageQuestCourseSummary[];
}

type AchievementKind = 'streak' | 'certificate';

interface AchievementImageInput {
  kind: AchievementKind;
  learnerName: string;
  profile: LanguageQuestProfile;
  course?: LanguageQuestCourseSummary;
}

const CERTIFICATE_WIDTH = 1600;
const CERTIFICATE_HEIGHT = 1131;

export function safeFilename(value: string): string {
  return value.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 70) || 'learner';
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialSize: number, weight = 800, minSize = 28): number {
  let size = initialSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

// Draws `text` at `size` (already set on ctx.font by the caller) left-aligned
// at (x, y). If it still overflows `maxWidth` even at the smallest size
// fitText was willing to go (e.g. an unusually long name), this squeezes it
// horizontally so the *whole* name stays on one line and fully visible,
// rather than letting it run past the text column into the mascot artwork.
function fillTextFit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
  const width = ctx.measureText(text).width;
  if (width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(maxWidth / width, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function fillCenteredTextFit(ctx: CanvasRenderingContext2D, text: string, centerX: number, y: number, maxWidth: number) {
  const width = ctx.measureText(text).width;
  if (width <= maxWidth) {
    ctx.fillText(text, centerX, y);
    return;
  }
  ctx.save();
  ctx.translate(centerX, y);
  ctx.scale(maxWidth / width, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

interface UnitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The certificate's character illustrations (public/Icons) have generous
// transparent margins around the figure. This finds the tight bounding box
// of the actual artwork (as 0..1 fractions of the image) by rendering it
// small and scanning for non-transparent pixels, so the character can be
// composited without a lot of dead space eating into its on-canvas size.
function opaqueBounds(image: HTMLImageElement): UnitBounds {
  const fallback: UnitBounds = { x: 0, y: 0, width: 1, height: 1 };
  const probe = document.createElement('canvas');
  const scale = Math.min(240 / image.width, 240 / image.height, 1);
  probe.width = Math.max(1, Math.round(image.width * scale));
  probe.height = Math.max(1, Math.round(image.height * scale));
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  if (!pctx) return fallback;
  pctx.drawImage(image, 0, 0, probe.width, probe.height);

  let data: Uint8ClampedArray;
  try {
    data = pctx.getImageData(0, 0, probe.width, probe.height).data;
  } catch {
    return fallback;
  }

  let minX = probe.width;
  let minY = probe.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < probe.height; y++) {
    for (let x = 0; x < probe.width; x++) {
      if (data[(y * probe.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return fallback;
  return {
    x: minX / probe.width,
    y: minY / probe.height,
    width: (maxX - minX + 1) / probe.width,
    height: (maxY - minY + 1) / probe.height,
  };
}

// Draws `image` (cropped to its trimmed opaque `bounds`) scaled to fit
// inside `box` without distorting it, anchored to the box's bottom edge so a
// standing character's feet land there regardless of how much transparent
// margin the source PNG had.
function drawContained(ctx: CanvasRenderingContext2D, image: HTMLImageElement, bounds: UnitBounds, box: UnitBounds) {
  const cropWidth = image.width * bounds.width;
  const cropHeight = image.height * bounds.height;
  const scale = Math.min(box.width / cropWidth, box.height / cropHeight);
  const drawWidth = cropWidth * scale;
  const drawHeight = cropHeight * scale;
  const dx = box.x + (box.width - drawWidth) / 2;
  const dy = box.y + box.height - drawHeight;
  ctx.drawImage(
    image,
    bounds.x * image.width, bounds.y * image.height, cropWidth, cropHeight,
    dx, dy, drawWidth, drawHeight,
  );
}

function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Deep-blue ribbons keep the seal connected to Language Quest's identity
  // while the warm gold face gives the certificate a traditional finish.
  ctx.beginPath();
  ctx.moveTo(-radius * 0.62, radius * 0.46);
  ctx.lineTo(-radius * 0.32, radius * 1.62);
  ctx.lineTo(0, radius * 1.27);
  ctx.lineTo(radius * 0.32, radius * 1.62);
  ctx.lineTo(radius * 0.62, radius * 0.46);
  ctx.closePath();
  ctx.fillStyle = '#183153';
  ctx.fill();

  const seal = ctx.createRadialGradient(-radius * 0.3, -radius * 0.32, radius * 0.08, 0, 0, radius);
  seal.addColorStop(0, '#fff1b8');
  seal.addColorStop(0.58, '#d9a52e');
  seal.addColorStop(1, '#a86f12');
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = seal;
  ctx.fill();
  ctx.strokeStyle = '#7b4d0b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.72)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fffaf0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(radius * 0.52)}px "Georgia", serif`;
  ctx.fillText('LQ', 0, 1);

  ctx.restore();
}

function safeAccentColor(value: string | undefined): string {
  return value && /^#[\da-f]{6}$/i.test(value) ? value : '#b4533c';
}

function awardReference(learnerName: string, course: LanguageQuestCourseSummary): string {
  const source = `${learnerName}|${course.code}|${course.id}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `LQ-${course.code.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, '0')}`;
}

function drawCornerFlourish(ctx: CanvasRenderingContext2D, x: number, y: number, flipX: number, flipY: number, accent: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX, flipY);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 74);
  ctx.lineTo(0, 0);
  ctx.lineTo(74, 0);
  ctx.stroke();
  ctx.strokeStyle = '#d8b45b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, 58);
  ctx.lineTo(16, 16);
  ctx.lineTo(58, 16);
  ctx.stroke();
  ctx.restore();
}

async function drawCourseCertificate(ctx: CanvasRenderingContext2D, input: AchievementImageInput) {
  const course = input.course;
  if (!course) throw new Error('A completed course is required to create a certificate');

  const width = CERTIFICATE_WIDTH;
  const height = CERTIFICATE_HEIGHT;
  const navy = '#183153';
  const ink = '#24334a';
  const muted = '#667085';
  const paper = '#fffaf0';
  const gold = '#c4932f';
  const accent = safeAccentColor(course.accentColor);

  // A warm paper field is intentionally used instead of a full-bleed gradient:
  // the exported PNG remains legible when printed and feels like an award.
  ctx.fillStyle = '#e9deca';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = navy;
  ctx.fillRect(0, 0, 30, height);
  ctx.fillStyle = accent;
  ctx.fillRect(30, 0, 12, height);
  ctx.fillStyle = paper;
  ctx.fillRect(42, 0, width - 42, height);

  ctx.strokeStyle = navy;
  ctx.lineWidth = 5;
  ctx.strokeRect(70, 48, width - 118, height - 96);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(84, 62, width - 146, height - 124);

  drawCornerFlourish(ctx, 105, 83, 1, 1, accent);
  drawCornerFlourish(ctx, width - 105, 83, -1, 1, accent);
  drawCornerFlourish(ctx, 105, height - 83, 1, -1, accent);
  drawCornerFlourish(ctx, width - 105, height - 83, -1, -1, accent);

  // Subtle academic watermark behind the central copy.
  ctx.save();
  ctx.globalAlpha = 0.035;
  ctx.strokeStyle = navy;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(width / 2, 590, 260, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width / 2, 590, 212, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '900 240px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = navy;
  ctx.fillText('LQ', width / 2, 672);
  ctx.restore();

  const logo = await loadImage('/icon-192.png');
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(182, 166, 58, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e4d5b7';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.clip();
    ctx.drawImage(logo, 132, 116, 100, 100);
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = navy;
  ctx.font = '900 30px "Geist", sans-serif';
  ctx.fillText('MON REFUGEE LEARNING CENTRE', 265, 156);
  ctx.fillStyle = accent;
  ctx.font = '800 22px "Geist", sans-serif';
  ctx.fillText('LANGUAGE QUEST', 265, 193);

  roundedRect(ctx, 1174, 124, 274, 60, 30);
  ctx.fillStyle = navy;
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fffaf0';
  ctx.font = '800 18px "Geist", sans-serif';
  ctx.fillText('COURSE COMPLETION', 1311, 162);

  ctx.strokeStyle = '#dfd1b5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(132, 246);
  ctx.lineTo(width - 132, 246);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = '700 28px "Georgia", serif';
  ctx.fillText('Certificate of Completion', width / 2, 334);

  ctx.fillStyle = muted;
  ctx.font = '600 22px "Geist", sans-serif';
  ctx.fillText('This certificate is proudly presented to', width / 2, 395);

  const nameSize = fitText(ctx, input.learnerName, 1160, 86, 900, 48);
  ctx.fillStyle = navy;
  ctx.font = `900 ${nameSize}px "Georgia", "Geist", "Padauk", "Noto Sans Myanmar", serif`;
  fillCenteredTextFit(ctx, input.learnerName, width / 2, 505, 1160);
  const measuredNameWidth = Math.min(ctx.measureText(input.learnerName).width, 980);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(width / 2 - measuredNameWidth / 2, 531);
  ctx.lineTo(width / 2 + measuredNameWidth / 2, 531);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = '600 22px "Geist", sans-serif';
  ctx.fillText('for successfully completing the Language Quest course', width / 2, 596);

  const courseSize = fitText(ctx, course.title, 1080, 60, 800, 38);
  ctx.fillStyle = accent;
  ctx.font = `800 ${courseSize}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
  fillCenteredTextFit(ctx, course.title, width / 2, 678, 1080);

  const courseFacts = [course.language, `${course.lessonCount} lessons`, `${course.challengeCount} challenges`]
    .filter(Boolean)
    .join('  •  ');
  roundedRect(ctx, width / 2 - 300, 717, 600, 52, 26);
  ctx.fillStyle = '#f1e8d7';
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = '700 18px "Geist", sans-serif';
  ctx.fillText(courseFacts, width / 2, 750);

  const completedOn = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date());
  const baseline = 920;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#aeb5bf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(260, baseline);
  ctx.lineTo(540, baseline);
  ctx.moveTo(672, baseline);
  ctx.lineTo(952, baseline);
  ctx.stroke();

  ctx.fillStyle = ink;
  ctx.font = '800 20px "Geist", sans-serif';
  ctx.fillText(completedOn, 400, baseline - 12);
  ctx.fillText('Language Quest Learning Team', 812, baseline - 12);
  ctx.fillStyle = muted;
  ctx.font = '600 16px "Geist", sans-serif';
  ctx.fillText('DATE OF COMPLETION', 400, baseline + 30);
  ctx.fillText('LEARNING TEAM', 812, baseline + 30);

  drawSeal(ctx, 1192, 883, 68);

  const mascot = await loadImage('/icons/LanguageQuests_Graphics/Owl School 13.svg');
  if (mascot) {
    const bounds = opaqueBounds(mascot);
    drawContained(ctx, mascot, bounds, { x: 1330, y: 822, width: 145, height: 158 });
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = muted;
  ctx.font = '600 14px "Geist", sans-serif';
  ctx.fillText(`Award reference: ${awardReference(input.learnerName, course)}`, 132, 1025);
  ctx.textAlign = 'right';
  ctx.fillStyle = navy;
  ctx.font = '700 15px "Geist", sans-serif';
  ctx.fillText('Learn with courage  •  Grow with community', width - 132, 1025);
}

export async function createLanguageQuestAchievementBlob(input: AchievementImageInput): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  const isCertificate = input.kind === 'certificate';
  canvas.width = isCertificate ? CERTIFICATE_WIDTH : 1200;
  canvas.height = isCertificate ? CERTIFICATE_HEIGHT : 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image creation is not supported by this browser');

  if (isCertificate) {
    await drawCourseCertificate(ctx, input);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the certificate image')), 'image/png', 0.95);
    });
  }

  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#4c1d95');
  gradient.addColorStop(0.52, '#c026d3');
  gradient.addColorStop(1, '#f97316');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = 'rgba(255,255,255,.10)';
  ctx.beginPath();
  ctx.arc(1080, 90, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(105, 590, 230, 0, Math.PI * 2);
  ctx.fill();

  roundedRect(ctx, 55, 48, 1090, 534, 38);
  ctx.fillStyle = 'rgba(9,13,26,.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const logo = await loadImage('/icon-192.png');
  if (logo) {
    ctx.fillStyle = '#fff';
    roundedRect(ctx, 86, 78, 78, 78, 18);
    ctx.fill();
    ctx.drawImage(logo, 95, 87, 60, 60);
  }
  ctx.fillStyle = '#c4b5fd';
  ctx.font = '800 22px "Geist", sans-serif';
  ctx.fillText('MRLC LANGUAGE QUEST', 184, 112);
  ctx.fillStyle = '#fff';
  ctx.font = '700 18px "Geist", sans-serif';
  ctx.fillText('Learn • Practise • Grow', 184, 142);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fdba74';
  ctx.font = '900 24px "Geist", sans-serif';
  ctx.fillText('LEARNING STREAK', 600, 222);
  ctx.fillStyle = '#fff';
  ctx.font = '900 132px "Geist", sans-serif';
  ctx.fillText(String(input.profile.currentStreak), 600, 360);
  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 35px "Geist", sans-serif';
  ctx.fillText(input.profile.currentStreak === 1 ? 'DAY STRONG' : 'DAYS STRONG', 600, 408);
  const nameSize = fitText(ctx, input.learnerName, 850, 44, 900);
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${nameSize}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
  ctx.fillText(input.learnerName, 600, 476);
  ctx.fillStyle = '#ddd6fe';
  ctx.font = '700 20px "Geist", sans-serif';
  ctx.fillText(`Best streak: ${input.profile.bestStreak} days • ${input.profile.points} points`, 600, 516);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.font = '600 16px "Geist", sans-serif';
  ctx.fillText('MRLC • Language Quest', 1114, 556);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the achievement image')), 'image/png', 0.95);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

// Certificate busy-state is keyed per course (not just per kind+action) so
// downloading one course's certificate doesn't visually tie up another
// course's card -- with two or three completed courses now each getting
// their own card, a shared key would have been misleading.
function busyKey(kind: AchievementKind, action: 'view' | 'download' | 'share', courseId?: string): string {
  return courseId ? `${kind}-${action}-${courseId}` : `${kind}-${action}`;
}

export function LanguageQuestAchievements({ learnerName, profile, courses }: AchievementStudioProps) {
  // `completed` is an exact all-challenges-done flag from the server, not a
  // rounded percentage -- see languageQuest.ts's /overview route for why
  // progressPercent === 100 isn't safe to use as the completion gate.
  const completedCourses = useMemo(() => courses.filter((course) => course.completed), [courses]);
  const [busy, setBusy] = useState<string | null>(null);
  const [certificatePreview, setCertificatePreview] = useState<{ url: string; courseTitle: string } | null>(null);
  const canCreateStreak = profile.currentStreak > 0;

  useEffect(() => () => {
    if (certificatePreview) URL.revokeObjectURL(certificatePreview.url);
  }, [certificatePreview]);

  const create = async (kind: AchievementKind, action: 'view' | 'download' | 'share', course?: LanguageQuestCourseSummary) => {
    if (kind === 'streak' && !canCreateStreak) return;
    if (kind === 'certificate' && !course) return;
    const key = busyKey(kind, action, course?.id);
    setBusy(key);
    try {
      const blob = await createLanguageQuestAchievementBlob({ kind, learnerName, profile, course });
      const label = kind === 'certificate' ? `certificate-${course?.title}` : `${profile.currentStreak}-day-streak`;
      const filename = `MRLC-${safeFilename(learnerName)}-${safeFilename(label)}.png`;

      if (action === 'view' && course) {
        setCertificatePreview({ url: URL.createObjectURL(blob), courseTitle: course.title });
        return;
      }

      if (action === 'share') {
        if (navigator.share && typeof File === 'function') {
          const file = new File([blob], filename, { type: 'image/png' });
          let canShareFile = false;
          try {
            canShareFile = navigator.canShare?.({ files: [file] }) ?? false;
          } catch {
            canShareFile = false;
          }
          if (canShareFile) {
            await navigator.share({
              title: kind === 'certificate' ? 'My Language Quest certificate' : 'My Language Quest streak',
              text: kind === 'certificate'
                ? `${learnerName} completed ${course?.title} on MRLC Language Quest.`
                : `${learnerName} reached a ${profile.currentStreak}-day streak on MRLC Language Quest.`,
              files: [file],
            });
            return;
          }
        }
        downloadBlob(blob, filename);
        toast.info('Sharing files is unavailable here, so the image was saved. Attach it to your social post.');
        return;
      }

      downloadBlob(blob, filename);
      toast.success('Achievement image saved');
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast.error(error?.message || 'Could not create the achievement image');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-violet-200/80 bg-white/80 p-5 shadow-lg shadow-violet-900/5 backdrop-blur sm:p-6 dark:border-violet-500/20 dark:bg-slate-950/55">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-lg"><Sparkles className="h-5 w-5" /></span>
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">Achievements</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {completedCourses.length > 0
              ? `${completedCourses.length} certificate${completedCourses.length === 1 ? '' : 's'} earned so far. Save a personalized PNG or open your device's share menu -- only your name and achievement appear.`
              : 'Save a personalized PNG or open your device’s share menu for social media. Only your name and Language Quest achievement appear.'}
          </p>
        </div>
      </div>

      <article className={`mt-5 overflow-hidden rounded-2xl border ${canCreateStreak ? 'border-orange-200 dark:border-orange-500/25' : 'border-slate-200 opacity-70 dark:border-slate-700'}`}>
        <div className="flex flex-col gap-4 bg-gradient-to-br from-violet-800 via-fuchsia-700 to-orange-500 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 shrink-0 fill-amber-300 text-amber-300" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">Learning streak</p>
            </div>
            <p className="mt-2 text-3xl font-black">{profile.currentStreak} {profile.currentStreak === 1 ? 'day' : 'days'}</p>
            <p className="mt-1 truncate text-sm font-bold text-white/85">{learnerName} • Best: {profile.bestStreak} days • {profile.points} points</p>
          </div>
          {!canCreateStreak ? (
            <p className="flex shrink-0 items-center gap-2 text-sm font-semibold text-white/85"><Lock className="h-4 w-4" /> Complete a lesson today to unlock.</p>
          ) : (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => create('streak', 'download')} disabled={busy !== null && busy !== busyKey('streak', 'download')}>
                {busy === busyKey('streak', 'download') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Save PNG
              </Button>
              <Button size="sm" className="bg-white text-violet-900 hover:bg-white/90" onClick={() => create('streak', 'share')} disabled={busy !== null && busy !== busyKey('streak', 'share')}>
                {busy === busyKey('streak', 'share') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
              </Button>
            </div>
          )}
        </div>
      </article>

      <div className="mt-6">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
          <Award className="h-4 w-4 text-sky-600 dark:text-sky-300" /> Course certificates
          {completedCourses.length > 0 && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">{completedCourses.length}</span>
          )}
        </h3>

        {completedCourses.length === 0 ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            <Lock className="h-4 w-4 shrink-0" /> Finish every lesson in a course to unlock its certificate -- every course you complete earns its own.
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {completedCourses.map((course) => {
              const viewKey = busyKey('certificate', 'view', course.id);
              const downloadKey = busyKey('certificate', 'download', course.id);
              const shareKey = busyKey('certificate', 'share', course.id);
              const accent = safeAccentColor(course.accentColor);
              return (
                <article key={course.id} className="overflow-hidden rounded-2xl border border-amber-200/90 bg-[#fffaf0] shadow-sm dark:border-amber-400/20 dark:bg-slate-900">
                  <div className="relative aspect-[1.414/1] overflow-hidden bg-[#fffaf0] p-4 text-[#183153]">
                    <span className="absolute inset-y-0 left-0 w-2 bg-[#183153]" />
                    <span className="absolute inset-y-0 left-2 w-1" style={{ backgroundColor: accent }} />
                    <span className="pointer-events-none absolute inset-3 left-5 border border-[#c4932f]/70" />
                    <div className="relative flex items-start justify-between gap-3 pl-3">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[#183153] sm:text-[9px]">Mon Refugee Learning Centre</p>
                        <p className="mt-0.5 text-[7px] font-black uppercase tracking-[0.18em]" style={{ color: accent }}>Language Quest</p>
                      </div>
                      <span className="text-xl" aria-hidden="true">{course.imageEmoji}</span>
                    </div>
                    <div className="relative mt-3 px-4 text-center sm:mt-4">
                      <p className="font-serif text-[9px] font-bold text-[#b07c20] sm:text-[10px]">Certificate of Completion</p>
                      <p className="mt-2 truncate font-serif text-lg font-black text-[#183153] sm:text-xl">{learnerName}</p>
                      <span className="mx-auto mt-1 block h-0.5 w-20" style={{ backgroundColor: accent }} />
                      <p className="mt-2 truncate text-[9px] font-extrabold sm:text-[10px]" style={{ color: accent }}>{course.title}</p>
                    </div>
                    <span className="absolute bottom-4 right-4 grid h-7 w-7 place-items-center rounded-full border-2 border-amber-700 bg-amber-400 text-[8px] font-black text-white shadow-sm">LQ</span>
                  </div>
                  <div className="border-t border-amber-200/80 bg-white p-3 dark:border-amber-400/15 dark:bg-slate-950/50">
                    <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Print-ready landscape certificate</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => create('certificate', 'view', course)} disabled={busy !== null && busy !== viewKey}>
                        {busy === viewKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />} View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => create('certificate', 'download', course)} disabled={busy !== null && busy !== downloadKey}>
                        {busy === downloadKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Save PNG
                      </Button>
                      <Button size="sm" onClick={() => create('certificate', 'share', course)} disabled={busy !== null && busy !== shareKey}>
                        {busy === shareKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={certificatePreview !== null} onOpenChange={(open) => !open && setCertificatePreview(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{certificatePreview?.courseTitle} certificate</DialogTitle>
            <DialogDescription>Preview of your print-ready Language Quest certificate.</DialogDescription>
          </DialogHeader>
          {certificatePreview && (
            <img
              src={certificatePreview.url}
              alt={`${learnerName}'s ${certificatePreview.courseTitle} certificate`}
              className="h-auto w-full rounded-lg border border-amber-200 bg-[#fffaf0] shadow-sm"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
