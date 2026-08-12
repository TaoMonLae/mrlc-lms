import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Award, Crown, Download, Eye, Loader2, Lock, Share2, Sparkles, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  LANGUAGE_QUEST_REWARD_CARDS,
  languageQuestLegendaryAwardById,
  languageQuestRewardCardById,
  languageQuestStreakFrame,
  type LanguageQuestRewardCard,
  type LanguageQuestRewardProgress,
  type LanguageQuestStreakFrame,
} from '@/shared/languageQuestRewards';
import { LanguageQuestLegendaryReveal } from './LanguageQuestLegendaryRewards';
import { downloadBlob, safeFilename, shareOrDownloadBlob } from './LanguageQuestAchievements';

const CARD_IMAGE_WIDTH = 900;
const CARD_IMAGE_HEIGHT = 1260;
const CERTIFICATE_IMAGE_WIDTH = 1600;
const CERTIFICATE_IMAGE_HEIGHT = 1131;

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitFontSize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initialSize: number, weight = 800, minSize = 24): number {
  let size = initialSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return size;
}

/** Draws a single Quest Card as a shareable portrait image, mirroring the on-screen `LanguageQuestRewardCardView`. */
function drawQuestCardImage(ctx: CanvasRenderingContext2D, card: LanguageQuestRewardCard, learnerName: string, frame: LanguageQuestStreakFrame) {
  const width = CARD_IMAGE_WIDTH;
  const height = CARD_IMAGE_HEIGHT;
  const [dark, mid, light] = card.colors;

  const backdrop = ctx.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, dark);
  backdrop.addColorStop(0.58, mid);
  backdrop.addColorStop(1, light);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  roundedRectPath(ctx, 18, 18, width - 36, height - 36, 42);
  ctx.strokeStyle = frame.colors[0];
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  roundedRectPath(ctx, 40, 40, width - 80, height - 80, 34);
  ctx.fillStyle = 'rgba(2,6,23,.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 128);
  ctx.lineTo(width - 40, 128);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = '900 26px "Geist", sans-serif';
  ctx.fillText(card.rarity.toUpperCase(), 72, 92);
  ctx.textAlign = 'right';
  ctx.fillText(`LV ${card.level}`, width - 72, 92);

  roundedRectPath(ctx, 90, 168, width - 180, 430, 28);
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  const gradient = ctx.createRadialGradient(width / 2, 168 + 215, 40, width / 2, 168 + 215, 260);
  gradient.addColorStop(0, 'rgba(255,255,255,.32)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  roundedRectPath(ctx, 90, 168, width - 180, 430, 28);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(90, 168, width - 180, 430);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '420px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.fillText(card.emoji, width / 2, 168 + 340);

  ctx.textAlign = 'left';
  const nameSize = fitFontSize(ctx, card.name, width - 180, 64, 900, 34);
  ctx.font = `900 ${nameSize}px "Geist", sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText(card.name, 90, 690);
  ctx.font = '700 26px "Geist", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillText(card.epithet, 90, 726);

  roundedRectPath(ctx, 90, 758, width - 180, 128, 22);
  ctx.fillStyle = 'rgba(2,6,23,.32)';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.65)';
  ctx.font = '800 20px "Geist", sans-serif';
  ctx.fillText('ACHIEVEMENT', 118, 800);
  ctx.fillStyle = '#fff';
  const achievementSize = fitFontSize(ctx, card.achievement, width - 236, 34, 900, 22);
  ctx.font = `900 ${achievementSize}px "Geist", sans-serif`;
  ctx.fillText(card.achievement, 118, 848);

  ctx.font = '800 22px "Geist", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillText(card.powerMove.toUpperCase(), 90, 928);
  ctx.textAlign = 'right';
  ctx.fillText(`${card.unlockXp.toLocaleString()} XP`, width - 90, 928);

  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 972);
  ctx.lineTo(width - 90, 972);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  const learnerSize = fitFontSize(ctx, learnerName, width - 260, 40, 900, 22);
  ctx.font = `900 ${learnerSize}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
  ctx.fillText(learnerName, 90, 1032);
  ctx.font = '700 18px "Geist", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  ctx.fillText(`${frame.emoji} ${frame.name} frame`, 90, 1064);

  roundedRectPath(ctx, width - 190, 1000, 100, 40, 20);
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = dark;
  ctx.font = '900 18px "Geist", sans-serif';
  ctx.fillText('LQ', width - 140, 1026);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.font = '700 17px "Geist", sans-serif';
  ctx.fillText('Mon Refugee Learning Centre  •  Language Quest', width / 2, height - 62);
}

interface QuestCertificateInput {
  learnerName: string;
  rewards: LanguageQuestRewardProgress;
  bestStreak: number;
}

/** Draws a landscape "journey so far" certificate summarizing overall Quest Card progress. */
async function drawQuestCertificate(ctx: CanvasRenderingContext2D, input: QuestCertificateInput) {
  const width = CERTIFICATE_IMAGE_WIDTH;
  const height = CERTIFICATE_IMAGE_HEIGHT;
  const navy = '#183153';
  const ink = '#24334a';
  const muted = '#667085';
  const paper = '#fffaf0';
  const gold = '#c4932f';
  const current = languageQuestRewardCardById(input.rewards.currentCardId);
  const accent = current ? current.colors[1] : '#7c3aed';
  const frame = languageQuestStreakFrame(input.bestStreak);
  const completedChapters = QUEST_CARD_CHAPTERS.filter((chapter) => input.rewards.level >= chapter.endLevel).length;

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

  ctx.textAlign = 'left';
  ctx.fillStyle = navy;
  ctx.font = '900 30px "Geist", sans-serif';
  ctx.fillText('MON REFUGEE LEARNING CENTRE', 132, 168);
  ctx.fillStyle = accent;
  ctx.font = '800 22px "Geist", sans-serif';
  ctx.fillText('LANGUAGE QUEST', 132, 205);

  roundedRectPath(ctx, 1174, 136, 294, 60, 30);
  ctx.fillStyle = navy;
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fffaf0';
  ctx.font = '800 18px "Geist", sans-serif';
  ctx.fillText('JOURNEY PROGRESS', 1321, 174);

  ctx.strokeStyle = '#dfd1b5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(132, 258);
  ctx.lineTo(width - 132, 258);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = '700 28px "Georgia", serif';
  ctx.fillText('Language Quest Progress Keepsake', width / 2, 346);

  ctx.fillStyle = muted;
  ctx.font = '600 22px "Geist", sans-serif';
  ctx.fillText('This progress keepsake celebrates', width / 2, 405);

  const nameSize = fitFontSize(ctx, input.learnerName, 1160, 86, 900, 48);
  ctx.fillStyle = navy;
  ctx.font = `900 ${nameSize}px "Georgia", "Geist", "Padauk", "Noto Sans Myanmar", serif`;
  ctx.fillText(input.learnerName, width / 2, 515);
  const measuredNameWidth = Math.min(ctx.measureText(input.learnerName).width, 980);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(width / 2 - measuredNameWidth / 2, 541);
  ctx.lineTo(width / 2 + measuredNameWidth / 2, 541);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = '600 22px "Geist", sans-serif';
  ctx.fillText('for reaching', width / 2, 606);

  ctx.fillStyle = accent;
  ctx.font = '800 46px "Geist", sans-serif';
  ctx.fillText(`Level ${input.rewards.level} • ${input.rewards.title}`, width / 2, 668);

  const facts = [
    `${input.rewards.xp.toLocaleString()} XP earned`,
    `${input.rewards.unlockedCardIds.length}/${LANGUAGE_QUEST_REWARD_CARDS.length} Quest Cards`,
    `${completedChapters}/${QUEST_CARD_CHAPTERS.length} chapters complete`,
  ].join('  •  ');
  roundedRectPath(ctx, width / 2 - 380, 706, 760, 52, 26);
  ctx.fillStyle = '#f1e8d7';
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = '700 18px "Geist", sans-serif';
  ctx.fillText(facts, width / 2, 739);

  if (current) {
    ctx.fillStyle = muted;
    ctx.font = '600 20px "Geist", sans-serif';
    ctx.fillText('Current companion', width / 2, 800);
    ctx.font = '420px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText(current.emoji, width / 2, 900);
    ctx.fillStyle = navy;
    ctx.font = '800 26px "Geist", sans-serif';
    ctx.fillText(`${current.name} — ${current.epithet}`, width / 2, 940);
  }

  const completedOn = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date());
  const baseline = 1010;
  ctx.strokeStyle = '#aeb5bf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, baseline);
  ctx.lineTo(620, baseline);
  ctx.moveTo(732, baseline);
  ctx.lineTo(1052, baseline);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = '800 20px "Geist", sans-serif';
  ctx.fillText(completedOn, 460, baseline - 12);
  ctx.fillText(`${frame.emoji} ${frame.name} streak frame`, 892, baseline - 12);
  ctx.fillStyle = muted;
  ctx.font = '600 16px "Geist", sans-serif';
  ctx.fillText('DATE ISSUED', 460, baseline + 30);
  ctx.fillText('STREAK FRAME EARNED', 892, baseline + 30);

  ctx.textAlign = 'left';
  ctx.fillStyle = muted;
  ctx.font = '600 14px "Geist", sans-serif';
  ctx.fillText('This keepsake reflects progress at the time it was generated and is not a course certificate.', 132, 1055);
  ctx.textAlign = 'right';
  ctx.fillStyle = navy;
  ctx.font = '700 15px "Geist", sans-serif';
  ctx.fillText('Learn with courage  •  Grow with community', width - 132, 1055);
}

async function createQuestCardBlob(card: LanguageQuestRewardCard, learnerName: string, frame: LanguageQuestStreakFrame): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_IMAGE_WIDTH;
  canvas.height = CARD_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image creation is not supported by this browser');
  drawQuestCardImage(ctx, card, learnerName, frame);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the card image'))), 'image/png', 0.95);
  });
}

async function createQuestCertificateBlob(input: QuestCertificateInput): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = CERTIFICATE_IMAGE_WIDTH;
  canvas.height = CERTIFICATE_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image creation is not supported by this browser');
  await drawQuestCertificate(ctx, input);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the progress keepsake'))), 'image/png', 0.95);
  });
}

const RARITY_STYLES: Record<LanguageQuestRewardCard['rarity'], string> = {
  Starter: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  Bright: 'border-cyan-300 bg-cyan-50 text-cyan-800',
  Rare: 'border-violet-300 bg-violet-50 text-violet-800',
  Epic: 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800',
  Legend: 'border-amber-300 bg-amber-50 text-amber-900',
};

const QUEST_CARD_CHAPTERS = [
  { id: 'trailhead', name: 'Trailhead', subtitle: 'Build the habit', startLevel: 1, endLevel: 4, tone: 'from-emerald-500 to-cyan-500' },
  { id: 'skillforge', name: 'Skillforge', subtitle: 'Strengthen the basics', startLevel: 5, endLevel: 8, tone: 'from-cyan-500 to-violet-500' },
  { id: 'explorers-rise', name: 'Explorer’s Rise', subtitle: 'Connect languages', startLevel: 9, endLevel: 12, tone: 'from-violet-500 to-fuchsia-500' },
  { id: 'scholars-ascent', name: 'Scholar’s Ascent', subtitle: 'Master deeper meaning', startLevel: 13, endLevel: 16, tone: 'from-fuchsia-500 to-rose-500' },
  { id: 'vaultbound', name: 'Vaultbound', subtitle: 'Prove legendary focus', startLevel: 17, endLevel: 20, tone: 'from-rose-500 to-amber-400' },
] as const;

export function LanguageQuestRewardCardView({
  card,
  unlocked,
  featured = false,
  frame,
  onSelect,
}: {
  card: LanguageQuestRewardCard;
  unlocked: boolean;
  featured?: boolean;
  frame?: LanguageQuestStreakFrame;
  onSelect?: () => void;
}) {
  const interactive = unlocked && Boolean(onSelect);
  return (
    <article
      aria-label={unlocked ? `${card.name}, ${card.achievement}${interactive ? ' — view, download, or share' : ''}` : `Locked reward at level ${card.level}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      } : undefined}
      className={`group relative isolate flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border-[3px] p-2 shadow-xl transition duration-300 [transform-style:preserve-3d] ${
        unlocked
          ? 'border-white/80 hover:z-10 hover:[transform:perspective(900px)_rotateX(3deg)_rotateY(-5deg)_translateY(-7px)_scale(1.02)]'
          : 'border-slate-400 bg-slate-300 dark:border-slate-600 dark:bg-slate-900'
      } ${featured ? 'ring-4 ring-amber-300/55' : ''} ${interactive ? 'cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-white/70' : ''}`}
      style={unlocked ? {
        background: `linear-gradient(145deg, ${card.colors[0]}, ${card.colors[1]} 58%, ${card.colors[2]})`,
        borderColor: frame?.colors[0],
        boxShadow: frame
          ? `0 0 0 3px ${frame.colors[1]}66, 0 22px 45px -24px ${card.colors[1]}`
          : `0 22px 45px -24px ${card.colors[1]}`,
      } : undefined}
    >
      {unlocked && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-20 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-55"
            style={{
              backgroundImage: 'linear-gradient(115deg, transparent 18%, rgba(255,255,255,.75) 35%, rgba(103,232,249,.55) 43%, rgba(244,114,182,.55) 52%, transparent 68%)',
              backgroundSize: '220% 220%',
            }}
          />
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/20 blur-xl" />
        </>
      )}

      <div className={`relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[1rem] border ${unlocked ? 'border-white/35 bg-slate-950/25 text-white backdrop-blur-[2px]' : 'border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300'}`}>
        <header className="flex items-center justify-between gap-2 border-b border-current/15 px-3 py-2">
          <span className="truncate text-[10px] font-black uppercase tracking-[0.16em]">
            {unlocked ? card.rarity : 'Mystery'}
          </span>
          <span className="shrink-0 text-[10px] font-black">LV {card.level}</span>
        </header>

        <div className={`relative mx-2 mt-2 grid aspect-square shrink-0 place-items-center overflow-hidden rounded-xl border ${unlocked ? 'border-white/25 bg-white/12' : 'border-dashed border-slate-300 bg-slate-200 dark:border-slate-700 dark:bg-slate-900'}`}>
          <div className={`absolute inset-0 ${unlocked ? 'bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.35),transparent_60%)]' : ''}`} />
          <span className={`relative select-none drop-shadow-lg ${unlocked ? 'text-6xl sm:text-7xl' : 'text-5xl grayscale'}`} aria-hidden="true">
            {unlocked ? card.emoji : '❔'}
          </span>
          {featured && unlocked && (
            <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-amber-300 text-amber-950 shadow-lg" title="Current companion">
              <Crown className="h-4 w-4" />
            </span>
          )}
          {interactive && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/40 py-1 text-center text-[9px] font-black uppercase tracking-wider text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
              Tap to view, save, or share
            </span>
          )}
        </div>

        <div className="px-3 pb-3 pt-2">
          <h3 className="truncate text-base font-black leading-tight sm:text-lg">{unlocked ? card.name : 'Locked companion'}</h3>
          <p className={`mt-0.5 truncate text-[10px] font-bold ${unlocked ? 'text-white/75' : 'text-slate-600 dark:text-slate-400'}`}>
            {unlocked ? card.epithet : `Reach ${card.unlockXp} XP`}
          </p>
          <div className={`mt-2 rounded-lg border px-2 py-1.5 ${unlocked ? 'border-white/20 bg-black/15' : 'border-slate-300 bg-white/50 dark:border-slate-700 dark:bg-slate-900'}`}>
            <p className="text-[9px] font-black uppercase tracking-wider opacity-70">Achievement</p>
            <p className="mt-0.5 truncate text-[11px] font-black">{unlocked ? card.achievement : 'Keep learning to reveal'}</p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wide opacity-80">
            <span className="min-w-0 truncate">{unlocked ? card.powerMove : '???'}</span>
            <span className="shrink-0">{card.unlockXp} XP</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function LanguageQuestRewardTrack({
  rewards,
  bestStreak = 0,
}: {
  rewards: LanguageQuestRewardProgress;
  bestStreak?: number;
}) {
  const current = languageQuestRewardCardById(rewards.currentCardId);
  const next = languageQuestRewardCardById(rewards.nextCardId);
  const featuredCard = current ?? next;
  const remaining = rewards.nextLevelXp === null ? 0 : rewards.nextLevelXp - rewards.xp;
  const frame = languageQuestStreakFrame(bestStreak);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 p-5 text-white shadow-xl sm:p-6 dark:border-violet-500/25">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-fuchsia-400/15 blur-2xl" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-300/25 bg-amber-300/15 text-amber-200 hover:bg-amber-300/15">
              <Trophy className="h-3 w-3" /> {rewards.level === 0 ? 'Level 0' : `Level ${rewards.level}`}
            </Badge>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">{rewards.title}</span>
          </div>
          <h2 className="mt-4 text-2xl font-black sm:text-3xl">
            {current ? `${current.name} joined your quest!` : 'Earn your first Quest Card'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/80">
            Every correct first answer earns XP. Your first companion unlocks at 100 XP, and every later card demands a bigger learning milestone.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-4 text-xs font-bold">
              <span>{rewards.xp.toLocaleString()} XP</span>
              <span>{next ? `${remaining} XP to ${next.name}` : 'All current cards unlocked'}</span>
            </div>
            <Progress value={rewards.progressPercent} className="mt-2 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-track]]:bg-white/15 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-amber-300 [&_[data-slot=progress-indicator]]:to-fuchsia-400" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {QUEST_CARD_CHAPTERS.map((chapter) => {
              const complete = rewards.level >= chapter.endLevel;
              const active = rewards.level < chapter.startLevel
                ? chapter.startLevel === Math.max(1, rewards.level + 1)
                : rewards.level <= chapter.endLevel;
              return (
                <div key={chapter.id} className={`rounded-xl border px-2.5 py-2 ${complete ? 'border-emerald-300/40 bg-emerald-300/15' : active ? 'border-amber-300/50 bg-white/10' : 'border-white/10 bg-black/10 opacity-60'}`}>
                  <p className="truncate text-[10px] font-black uppercase tracking-wider">{chapter.name}</p>
                  <p className="mt-0.5 text-[9px] font-bold text-white/60">LV {chapter.startLevel}–{chapter.endLevel}{complete ? ' • ✓' : ''}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button className="bg-white font-black text-violet-950 hover:bg-violet-50" render={<Link to="/games/language-quest/profile#quest-cards" />} nativeButton={false}>
              <Sparkles className="mr-2 h-4 w-4" /> View my collection
            </Button>
            <span className="text-xs font-semibold text-violet-200">
              {rewards.unlockedCardIds.length}/{LANGUAGE_QUEST_REWARD_CARDS.length} cards unlocked
            </span>
            <span className="text-xs font-semibold text-amber-200">
              {frame.emoji} {frame.name} frame
            </span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[230px]">
          {featuredCard && (
            <LanguageQuestRewardCardView
              card={featuredCard}
              unlocked={Boolean(current)}
              featured={Boolean(current)}
              frame={current ? frame : undefined}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function LanguageQuestRewardCardActions({
  card,
  learnerName,
  frame,
}: {
  card: LanguageQuestRewardCard;
  learnerName: string;
  frame: LanguageQuestStreakFrame;
}) {
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);

  const run = async (action: 'download' | 'share') => {
    setBusy(action);
    try {
      const blob = await createQuestCardBlob(card, learnerName, frame);
      const filename = `MRLC-${safeFilename(learnerName)}-${safeFilename(card.name)}-quest-card.png`;
      await shareOrDownloadBlob(
        blob,
        filename,
        `My ${card.name} Quest Card`,
        `${learnerName} earned the ${card.name} Quest Card (${card.achievement}) on MRLC Language Quest.`,
        action,
      );
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast.error(error?.message || 'Could not create the card image');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => run('download')} disabled={busy !== null}>
        {busy === 'download' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Save PNG
      </Button>
      <Button className="bg-white font-black text-violet-950 hover:bg-violet-50" onClick={() => run('share')} disabled={busy !== null}>
        {busy === 'share' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
      </Button>
    </div>
  );
}

function LanguageQuestRewardCardDialog({
  cardId,
  learnerName,
  frame,
  open,
  onOpenChange,
}: {
  cardId: string | null;
  learnerName: string;
  frame: LanguageQuestStreakFrame;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const card = languageQuestRewardCardById(cardId);
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-gradient-to-b from-violet-950 to-slate-950 p-5 text-white sm:max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-black text-white">{card.name}</DialogTitle>
          <DialogDescription className="text-violet-200">{card.epithet} • Level {card.level} • {card.achievement}</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[240px] py-2">
          <LanguageQuestRewardCardView card={card} unlocked featured frame={frame} />
        </div>
        <LanguageQuestRewardCardActions card={card} learnerName={learnerName} frame={frame} />
      </DialogContent>
    </Dialog>
  );
}

function LanguageQuestCertificateButton({
  learnerName,
  rewards,
  bestStreak,
}: {
  learnerName: string;
  rewards: LanguageQuestRewardProgress;
  bestStreak: number;
}) {
  const [busy, setBusy] = useState<'view' | 'download' | 'share' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const run = async (action: 'view' | 'download' | 'share') => {
    setBusy(action);
    try {
      const blob = await createQuestCertificateBlob({ learnerName, rewards, bestStreak });
      const filename = `MRLC-${safeFilename(learnerName)}-language-quest-progress.png`;
      if (action === 'view') {
        setPreviewUrl(URL.createObjectURL(blob));
        return;
      }
      await shareOrDownloadBlob(
        blob,
        filename,
        'My Language Quest progress',
        `${learnerName} reached Level ${rewards.level} (${rewards.title}) on MRLC Language Quest.`,
        action,
      );
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast.error(error?.message || 'Could not create the progress keepsake');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-300"><Award className="h-3 w-3" /> Journey progress keepsake</span>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-800 hover:bg-violet-50 dark:border-violet-500/25 dark:bg-slate-900 dark:text-violet-200" onClick={() => run('view')} disabled={busy !== null}>
          {busy === 'view' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />} View
        </Button>
        <Button size="sm" variant="outline" className="border-violet-200 bg-white text-violet-800 hover:bg-violet-50 dark:border-violet-500/25 dark:bg-slate-900 dark:text-violet-200" onClick={() => run('download')} disabled={busy !== null}>
          {busy === 'download' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Save
        </Button>
        <Button size="sm" className="bg-violet-700 font-black text-white hover:bg-violet-800" onClick={() => run('share')} disabled={busy !== null}>
          {busy === 'share' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
        </Button>
      </div>
      <Dialog open={previewUrl !== null} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Language Quest progress keepsake</DialogTitle>
            <DialogDescription>Preview of {learnerName}&apos;s current progress keepsake. This is not a course certificate.</DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt={`${learnerName}'s Language Quest progress keepsake`}
              className="h-auto w-full rounded-lg border border-violet-200 bg-white shadow-sm"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LanguageQuestRewardCollection({
  rewards,
  bestStreak = 0,
  learnerName = 'My',
}: {
  rewards: LanguageQuestRewardProgress;
  bestStreak?: number;
  learnerName?: string;
}) {
  const unlocked = new Set(rewards.unlockedCardIds);
  const frame = languageQuestStreakFrame(bestStreak);
  const [viewingCardId, setViewingCardId] = useState<string | null>(null);
  const currentChapter = QUEST_CARD_CHAPTERS.find((chapter) =>
    rewards.level >= chapter.startLevel && rewards.level <= chapter.endLevel)
    ?? (rewards.level === 0 ? QUEST_CARD_CHAPTERS[0] : QUEST_CARD_CHAPTERS.at(-1)!);
  const [activeChapterId, setActiveChapterId] = useState(currentChapter.id);
  const activeChapter = QUEST_CARD_CHAPTERS.find((chapter) => chapter.id === activeChapterId)
    ?? currentChapter;
  const activeChapterIndex = QUEST_CARD_CHAPTERS.findIndex((chapter) => chapter.id === activeChapter.id);
  const activeCards = LANGUAGE_QUEST_REWARD_CARDS.filter((card) =>
    card.level >= activeChapter.startLevel && card.level <= activeChapter.endLevel);
  const activeUnlocked = activeCards.filter((card) => unlocked.has(card.id)).length;

  return (
    <section id="quest-cards" className="scroll-mt-28 rounded-3xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-5 shadow-sm dark:border-violet-500/20 dark:from-violet-950/30 dark:to-slate-950/70 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-fuchsia-500 text-white shadow-lg"><Sparkles className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">My Quest Cards</h2>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Level {rewards.level} • {rewards.title}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            These original MRLC learning companions must be earned through study. The milestones become harder as you climb toward Level {LANGUAGE_QUEST_REWARD_CARDS.length} and the Legendary Vault.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Badge className="w-fit border-violet-200 bg-white text-violet-800 hover:bg-white dark:border-violet-500/25 dark:bg-slate-900 dark:text-violet-200">
            <Star className="h-3 w-3 fill-current" /> {rewards.xp.toLocaleString()} XP • {frame.emoji} {frame.name}
          </Badge>
          <LanguageQuestCertificateButton learnerName={learnerName} rewards={rewards} bestStreak={bestStreak} />
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-5" role="tablist" aria-label="Quest Card chapters">
        {QUEST_CARD_CHAPTERS.map((chapter, chapterIndex) => {
          const chapterCards = LANGUAGE_QUEST_REWARD_CARDS.filter((card) =>
            card.level >= chapter.startLevel && card.level <= chapter.endLevel);
          const chapterUnlocked = chapterCards.filter((card) => unlocked.has(card.id)).length;
          const selected = chapter.id === activeChapter.id;
          return (
            <button
              key={chapter.id}
              type="button"
              role="tab"
              id={`quest-chapter-tab-${chapter.id}`}
              aria-selected={selected}
              aria-controls="quest-chapter-panel"
              onClick={() => setActiveChapterId(chapter.id)}
              className={`relative overflow-hidden rounded-2xl border p-3 text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-violet-300/50 ${
                selected
                  ? 'border-violet-500 bg-white shadow-lg ring-2 ring-violet-200 dark:bg-slate-900 dark:ring-violet-500/20'
                  : 'border-violet-100 bg-white/60 hover:border-violet-300 dark:border-violet-500/15 dark:bg-slate-950/40'
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${chapter.tone}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chapter {chapterIndex + 1}</span>
              <span className="mt-1 block truncate text-xs font-black text-slate-950 dark:text-white">{chapter.name}</span>
              <span className="mt-1 block text-[10px] font-bold text-violet-700 dark:text-violet-300">{chapterUnlocked}/{chapterCards.length} earned</span>
            </button>
          );
        })}
      </div>

      <section
        id="quest-chapter-panel"
        role="tabpanel"
        aria-labelledby={`quest-chapter-tab-${activeChapter.id}`}
        className="mt-6 rounded-3xl border border-violet-100 bg-white/55 p-4 dark:border-violet-500/15 dark:bg-slate-950/35 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${activeChapter.tone} text-sm font-black text-white shadow-lg`}>{activeChapterIndex + 1}</span>
            <div>
              <h3 className="font-black text-slate-950 dark:text-white">{activeChapter.name}</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{activeChapter.subtitle} • Levels {activeChapter.startLevel}–{activeChapter.endLevel}</p>
            </div>
          </div>
          <span className="text-xs font-black text-violet-700 dark:text-violet-300">{activeUnlocked}/{activeCards.length} earned</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {activeCards.map((card) => (
            <LanguageQuestRewardCardView
              key={card.id}
              card={card}
              unlocked={unlocked.has(card.id)}
              featured={card.id === rewards.currentCardId}
              frame={unlocked.has(card.id) ? frame : undefined}
              onSelect={unlocked.has(card.id) ? () => setViewingCardId(card.id) : undefined}
            />
          ))}
        </div>
      </section>

      <LanguageQuestRewardCardDialog
        cardId={viewingCardId}
        learnerName={learnerName}
        frame={frame}
        open={viewingCardId !== null}
        onOpenChange={(open) => { if (!open) setViewingCardId(null); }}
      />
    </section>
  );
}

export function LanguageQuestRewardReveal({
  cardId,
  open,
  onOpenChange,
}: {
  cardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const legendary = languageQuestLegendaryAwardById(cardId);
  if (legendary) {
    return (
      <LanguageQuestLegendaryReveal
        awardId={legendary.id}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }
  const card = languageQuestRewardCardById(cardId);
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-gradient-to-b from-violet-950 to-slate-950 p-5 text-white sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-300 text-amber-950 shadow-lg shadow-amber-300/30">
            <Trophy className="h-6 w-6" />
          </div>
          <DialogTitle className="mt-2 text-2xl font-black text-white">New Quest Card unlocked!</DialogTitle>
          <DialogDescription className="text-violet-200">
            Level {card.level} reached • Achievement: {card.achievement}
          </DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[240px] py-2">
          <LanguageQuestRewardCardView card={card} unlocked featured />
        </div>
        <Button className="h-12 bg-white font-black text-violet-950 hover:bg-violet-50" onClick={() => onOpenChange(false)}>
          Add to my collection
        </Button>
      </DialogContent>
    </Dialog>
  );
}
