import { useMemo, useState } from 'react';
import { Award, Download, Flame, Loader2, Lock, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { LanguageQuestCourseSummary, LanguageQuestProfile } from '@/src/types/languageQuest';

interface AchievementStudioProps {
  learnerName: string;
  profile: LanguageQuestProfile;
  courses: LanguageQuestCourseSummary[];
}

type AchievementKind = 'streak' | 'certificate';

function safeFilename(value: string): string {
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

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialSize: number, weight = 800): number {
  let size = initialSize;
  while (size > 28) {
    ctx.font = `${weight} ${size}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = '/icon-192.png';
  });
}

export async function createLanguageQuestAchievementBlob(input: {
  kind: AchievementKind;
  learnerName: string;
  profile: LanguageQuestProfile;
  course?: LanguageQuestCourseSummary;
}): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image creation is not supported by this browser');

  const isCertificate = input.kind === 'certificate';
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, isCertificate ? '#312e81' : '#4c1d95');
  gradient.addColorStop(0.52, isCertificate ? '#7c3aed' : '#c026d3');
  gradient.addColorStop(1, isCertificate ? '#0ea5e9' : '#f97316');
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

  const logo = await loadLogo();
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
  if (isCertificate) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 24px "Geist", sans-serif';
    ctx.fillText('CERTIFICATE OF COMPLETION', 600, 224);
    ctx.fillStyle = '#fff';
    const nameSize = fitText(ctx, input.learnerName, 920, 62, 900);
    ctx.font = `900 ${nameSize}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
    ctx.fillText(input.learnerName, 600, 304);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 24px "Geist", sans-serif';
    ctx.fillText('has completed', 600, 350);
    ctx.fillStyle = '#fff';
    const courseTitle = input.course?.title || 'Language Quest course';
    const courseSize = fitText(ctx, courseTitle, 900, 44, 800);
    ctx.font = `800 ${courseSize}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
    ctx.fillText(courseTitle, 600, 414);
    ctx.fillStyle = '#a7f3d0';
    ctx.font = '700 21px "Geist", sans-serif';
    ctx.fillText(`${input.profile.points} points earned • ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date())}`, 600, 468);
  } else {
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
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.font = '600 16px "Geist", sans-serif';
  ctx.fillText('Developed by Tao Mon Lae', 86, 556);
  ctx.textAlign = 'right';
  ctx.fillText('MRLC • Language Quest', 1114, 556);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the achievement image')), 'image/png', 0.95);
  });
}

function downloadBlob(blob: Blob, filename: string) {
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
function busyKey(kind: AchievementKind, action: 'download' | 'share', courseId?: string): string {
  return courseId ? `${kind}-${action}-${courseId}` : `${kind}-${action}`;
}

export function LanguageQuestAchievements({ learnerName, profile, courses }: AchievementStudioProps) {
  // `completed` is an exact all-challenges-done flag from the server, not a
  // rounded percentage -- see languageQuest.ts's /overview route for why
  // progressPercent === 100 isn't safe to use as the completion gate.
  const completedCourses = useMemo(() => courses.filter((course) => course.completed), [courses]);
  const [busy, setBusy] = useState<string | null>(null);
  const canCreateStreak = profile.currentStreak > 0;

  const create = async (kind: AchievementKind, action: 'download' | 'share', course?: LanguageQuestCourseSummary) => {
    if (kind === 'streak' && !canCreateStreak) return;
    if (kind === 'certificate' && !course) return;
    const key = busyKey(kind, action, course?.id);
    setBusy(key);
    try {
      const blob = await createLanguageQuestAchievementBlob({ kind, learnerName, profile, course });
      const label = kind === 'certificate' ? `certificate-${course?.title}` : `${profile.currentStreak}-day-streak`;
      const filename = `MRLC-${safeFilename(learnerName)}-${safeFilename(label)}.png`;

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
              const downloadKey = busyKey('certificate', 'download', course.id);
              const shareKey = busyKey('certificate', 'share', course.id);
              return (
                <article key={course.id} className="overflow-hidden rounded-2xl border border-sky-200 dark:border-sky-500/25">
                  <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, #1e1b4b, ${course.accentColor}, #0ea5e9)` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl" aria-hidden="true">{course.imageEmoji}</span>
                      <Award className="h-6 w-6 text-amber-300" />
                    </div>
                    <p className="mt-3 truncate text-lg font-black">{learnerName}</p>
                    <p className="mt-0.5 truncate text-xs font-bold text-white/80">{course.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 bg-white p-3 dark:bg-slate-900">
                    <Button size="sm" variant="outline" onClick={() => create('certificate', 'download', course)} disabled={busy !== null && busy !== downloadKey}>
                      {busy === downloadKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Save
                    </Button>
                    <Button size="sm" onClick={() => create('certificate', 'share', course)} disabled={busy !== null && busy !== shareKey}>
                      {busy === shareKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
