import { useState } from 'react';
import { Crown, Download, Gem, Loader2, LockKeyhole, Share2, Sparkles, Star, Trophy } from 'lucide-react';
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
  LANGUAGE_QUEST_LEGENDARY_AWARDS,
  LANGUAGE_QUEST_REWARD_CARDS,
  languageQuestLegendaryAwardById,
  languageQuestLegendaryCollectionVisible,
  type LanguageQuestLegendaryAward,
  type LanguageQuestRewardProgress,
} from '@/shared/languageQuestRewards';
import { safeFilename, shareOrDownloadBlob } from './LanguageQuestAchievements';

import renownedKingsArt from '@/Mon_Kings_Cards/Renowned Mon Kings in History.jpg';
import kingUkkalapaArt from '@/Mon_Kings_Cards/King Ukkalapa.jpg';
import kingSihaSudhammaArt from '@/Mon_Kings_Cards/Kng Siha Sudhamma.jpg';
import kingSamalaArt from '@/Mon_Kings_Cards/King Samala.jpg';
import kingWimalaArt from '@/Mon_Kings_Cards/King Wimala .jpg';
import kingAsahArt from '@/Mon_Kings_Cards/King Asah.jpg';
import kingWareruArt from '@/Mon_Kings_Cards/Wareru.jpg';
import kingRajadhiratArt from '@/Mon_Kings_Cards/rajadhirat.jpg';
import queenBanyaHtauArt from '@/Mon_Kings_Cards/Queen Banya Htau.jpg';
import kingDhammachediArt from '@/Mon_Kings_Cards/634661279_2722801658071987_7324200782209241142_n.jpg';

const LEGENDARY_ART: Record<string, string> = {
  'king-ukkalapa': kingUkkalapaArt,
  'king-siha-sudhamma': kingSihaSudhammaArt,
  'king-samala': kingSamalaArt,
  'king-wimala': kingWimalaArt,
  'king-asah': kingAsahArt,
  'king-wareru': kingWareruArt,
  'king-rajadhirat': kingRajadhiratArt,
  'queen-banya-htau': queenBanyaHtauArt,
  'king-dhammachedi': kingDhammachediArt,
};

const CARD_IMAGE_WIDTH = 900;
const CARD_IMAGE_HEIGHT = 1260;

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the portrait image'));
    img.src = src;
  });
}

/** Draws `img` into the (x, y, width, height) box the way CSS `object-fit: cover; object-position: top` would. */
function drawImageCoverTop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y; // anchor to the top, matching `object-position: top`
  ctx.save();
  roundedRectPath(ctx, x, y, width, height, 0);
  ctx.clip();
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}

/** Draws a single Legendary Award as a shareable portrait image, mirroring the on-screen `LegendaryAwardCard`. */
async function drawLegendaryAwardImage(ctx: CanvasRenderingContext2D, award: LanguageQuestLegendaryAward, learnerName: string) {
  const width = CARD_IMAGE_WIDTH;
  const height = CARD_IMAGE_HEIGHT;
  const dark = '#78350f';
  const mid = '#d97706';
  const light = '#fde68a';

  const backdrop = ctx.createLinearGradient(0, 0, width, height);
  backdrop.addColorStop(0, light);
  backdrop.addColorStop(0.5, mid);
  backdrop.addColorStop(1, dark);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  roundedRectPath(ctx, 18, 18, width - 36, height - 36, 42);
  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 10;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  roundedRectPath(ctx, 40, 40, width - 80, height - 80, 34);
  ctx.fillStyle = '#0b0500';
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fde68a';
  ctx.font = '900 26px "Geist", sans-serif';
  ctx.fillText('LEGENDARY', 72, 92);
  ctx.textAlign = 'right';
  ctx.fillText(`${award.unlockXp.toLocaleString()} XP`, width - 72, 92);

  const portraitBox = { x: 64, y: 118, width: width - 128, height: 610 };
  try {
    const img = await loadImage(LEGENDARY_ART[award.id]);
    drawImageCoverTop(ctx, img, portraitBox.x, portraitBox.y, portraitBox.width, portraitBox.height);
  } catch {
    roundedRectPath(ctx, portraitBox.x, portraitBox.y, portraitBox.width, portraitBox.height, 0);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.fill();
  }
  roundedRectPath(ctx, portraitBox.x, portraitBox.y, portraitBox.width, portraitBox.height, 24);
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  const nameSize = fitFontSize(ctx, award.name, width - 180, 60, 900, 34);
  ctx.font = `900 ${nameSize}px "Geist", sans-serif`;
  ctx.fillStyle = '#fde68a';
  ctx.fillText(award.name, 90, 790);
  ctx.font = '700 24px "Geist", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillText(award.reign, 90, 824);

  roundedRectPath(ctx, 90, 856, width - 180, 128, 22);
  ctx.fillStyle = 'rgba(253,230,138,.14)';
  ctx.fill();
  ctx.fillStyle = 'rgba(253,230,138,.75)';
  ctx.font = '800 20px "Geist", sans-serif';
  ctx.fillText('ACHIEVEMENT', 118, 898);
  ctx.fillStyle = '#fff';
  const achievementSize = fitFontSize(ctx, award.achievement, width - 236, 32, 900, 22);
  ctx.font = `900 ${achievementSize}px "Geist", sans-serif`;
  ctx.fillText(award.achievement, 118, 946);

  ctx.font = '800 20px "Geist", sans-serif';
  ctx.fillStyle = 'rgba(253,230,138,.85)';
  ctx.fillText(award.virtue.toUpperCase(), 90, 1020);

  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 1054);
  ctx.lineTo(width - 90, 1054);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  const learnerSize = fitFontSize(ctx, learnerName, width - 260, 38, 900, 22);
  ctx.font = `900 ${learnerSize}px "Geist", "Padauk", "Noto Sans Myanmar", sans-serif`;
  ctx.fillText(learnerName, 90, 1110);
  ctx.font = '700 18px "Geist", sans-serif';
  ctx.fillStyle = 'rgba(253,230,138,.72)';
  ctx.fillText('Legendary history collection', 90, 1140);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.font = '700 17px "Geist", sans-serif';
  ctx.fillText('Mon Refugee Learning Centre  •  Learning Quest', width / 2, height - 62);
}

async function createLegendaryAwardBlob(award: LanguageQuestLegendaryAward, learnerName: string): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_IMAGE_WIDTH;
  canvas.height = CARD_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image creation is not supported by this browser');
  await drawLegendaryAwardImage(ctx, award, learnerName);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create the award image'))), 'image/png', 0.95);
  });
}

function LegendaryMysteryChest({ small = false }: { small?: boolean }) {
  return (
    <div className={`lq-legendary-chest relative ${small ? 'scale-75' : ''}`} aria-hidden="true">
      <div className="lq-legendary-chest-glow" />
      <div className="lq-legendary-chest-lid">
        <span className="lq-legendary-chest-band" />
      </div>
      <div className="lq-legendary-chest-base">
        <span className="lq-legendary-chest-lock"><LockKeyhole className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

function LegendaryAwardCard({
  award,
  unlocked,
  featured,
  onSelect,
}: {
  award: LanguageQuestLegendaryAward;
  unlocked: boolean;
  featured: boolean;
  onSelect?: () => void;
}) {
  const interactive = unlocked && Boolean(onSelect);
  return (
    <article
      aria-label={unlocked ? `${award.name}, legendary award${interactive ? ' — view, download, or share' : ''}` : `Mystery legendary award at ${award.unlockXp} XP`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={interactive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.();
        }
      } : undefined}
      className={`group relative overflow-hidden rounded-[1.6rem] border-2 p-2 shadow-xl transition duration-300 ${
        unlocked
          ? 'border-amber-300 bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-800'
          : 'border-amber-700/40 bg-gradient-to-b from-slate-900 to-amber-950/60'
      } ${featured ? 'ring-4 ring-yellow-300/45' : ''} ${interactive ? 'cursor-pointer outline-none hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-amber-300/60' : ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,rgba(255,255,255,.8),transparent_30%)] opacity-50" />
      <div className="relative overflow-hidden rounded-[1.15rem] border border-amber-100/50 bg-slate-950">
        {unlocked ? (
          <>
            <img
              src={LEGENDARY_ART[award.id]}
              alt={`Historical portrait card of ${award.name}`}
              className="aspect-[3/4] w-full object-cover object-top transition duration-500 group-hover:scale-[1.025]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-4 pt-16 text-white">
              <Badge className="border-amber-300/30 bg-amber-300/20 text-amber-100 hover:bg-amber-300/20">
                <Crown className="h-3 w-3" /> Legendary
              </Badge>
              <h3 className="mt-2 text-lg font-black leading-tight">{award.name}</h3>
              <p className="mt-0.5 text-xs font-bold text-amber-200">{award.reign}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wider text-white/80">{award.achievement}</p>
            </div>
            {interactive && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/50 py-1 text-center text-[9px] font-black uppercase tracking-wider text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                Tap to view, save, or share
              </span>
            )}
          </>
        ) : (
          <div className="grid aspect-[3/4] place-items-center bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,.22),transparent_45%)] p-5 text-center">
            <div>
              <LegendaryMysteryChest small />
              <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200">Sealed legend</p>
              <p className="mt-1 text-xs font-bold text-amber-100/60">Reach {award.unlockXp.toLocaleString()} XP</p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function LegendaryAwardCardActions({
  award,
  learnerName,
}: {
  award: LanguageQuestLegendaryAward;
  learnerName: string;
}) {
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);

  const run = async (action: 'download' | 'share') => {
    setBusy(action);
    try {
      const blob = await createLegendaryAwardBlob(award, learnerName);
      const filename = `MRLC-${safeFilename(learnerName)}-${safeFilename(award.name)}-legendary-card.png`;
      await shareOrDownloadBlob(
        blob,
        filename,
        `My ${award.name} Legendary Award`,
        `${learnerName} unlocked the ${award.name} legendary award (${award.achievement}) on MRLC Learning Quest.`,
        action,
      );
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast.error(error?.message || 'Could not create the award image');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" className="border-amber-300/40 bg-white/10 text-amber-50 hover:bg-white/20" onClick={() => run('download')} disabled={busy !== null}>
        {busy === 'download' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Save PNG
      </Button>
      <Button className="bg-gradient-to-r from-amber-500 to-yellow-300 font-black text-amber-950 hover:from-amber-400 hover:to-yellow-200" onClick={() => run('share')} disabled={busy !== null}>
        {busy === 'share' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Share
      </Button>
    </div>
  );
}

function LegendaryAwardCardDialog({
  awardId,
  learnerName,
  open,
  onOpenChange,
}: {
  awardId: string | null;
  learnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const award = languageQuestLegendaryAwardById(awardId);
  if (!award) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border border-amber-300/30 bg-gradient-to-b from-amber-950 to-slate-950 p-5 text-white sm:max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-black text-amber-50">{award.name}</DialogTitle>
          <DialogDescription className="text-amber-200/80">{award.reign} • {award.achievement}</DialogDescription>
        </DialogHeader>
        <div className="mx-auto w-full max-w-[240px] py-2">
          <LegendaryAwardCard award={award} unlocked featured={false} />
        </div>
        <p className="text-center text-xs leading-5 text-amber-100/70">{award.description}</p>
        <LegendaryAwardCardActions award={award} learnerName={learnerName} />
      </DialogContent>
    </Dialog>
  );
}

export function LanguageQuestLegendaryVault({
  rewards,
  expanded,
  learnerName = 'My',
}: {
  rewards: LanguageQuestRewardProgress;
  expanded?: boolean;
  learnerName?: string;
}) {
  const [viewingAwardId, setViewingAwardId] = useState<string | null>(null);
  const unlocked = new Set(rewards.unlockedLegendaryIds);
  const current = languageQuestLegendaryAwardById(rewards.currentLegendaryId);
  const next = languageQuestLegendaryAwardById(rewards.nextLegendaryId);
  const questCardGateXp = LANGUAGE_QUEST_REWARD_CARDS.at(-1)!.unlockXp;
  const previousThreshold = current?.unlockXp ?? questCardGateXp;
  const nextThreshold = next?.unlockXp ?? LANGUAGE_QUEST_LEGENDARY_AWARDS.at(-1)!.unlockXp;
  // Once the standard card path is complete, the legendary collection must
  // become visible without requiring a caller to remember an extra UI flag.
  const showCollection = languageQuestLegendaryCollectionVisible(rewards.level, expanded);
  const progress = next
    ? Math.max(0, Math.min(100, Math.round(((rewards.xp - previousThreshold) / (nextThreshold - previousThreshold)) * 100)))
    : 100;

  return (
    <section id="legendary-vault" className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-br from-[#120b02] via-[#301b05] to-[#090601] p-4 text-white shadow-2xl sm:rounded-3xl sm:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_15%,#fef3c7_0,transparent_18%),radial-gradient(circle_at_85%_5%,#f59e0b_0,transparent_24%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-300/30 bg-amber-300/15 text-amber-100 hover:bg-amber-300/15">
              <Crown className="h-3 w-3" /> Legendary Vault
            </Badge>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-amber-200/70">
              {unlocked.size}/{LANGUAGE_QUEST_LEGENDARY_AWARDS.length} historical cards
            </span>
          </div>
          <h2 className="mt-3 text-xl font-black text-amber-50 sm:mt-4 sm:text-3xl">
            {current ? `${current.name} has entered your legend.` : `A golden mystery waits beyond Level ${LANGUAGE_QUEST_REWARD_CARDS.length}.`}
          </h2>
          <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-amber-100/70 sm:text-sm sm:leading-6">
            Complete the full Quest Card path, then continue earning learning XP to open sealed golden chests and reveal MRLC’s Mon history collection. Every portrait stays hidden until its milestone is reached.
          </p>
          <div className="mt-5 max-w-xl">
            <div className="flex justify-between gap-3 text-xs font-bold text-amber-100/75">
              <span>{rewards.xp.toLocaleString()} XP</span>
              <span>{next ? `${Math.max(0, next.unlockXp - rewards.xp).toLocaleString()} XP to next chest` : 'Legendary collection complete'}</span>
            </div>
            <Progress value={progress} className="mt-2 [&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-amber-600 [&_[data-slot=progress-indicator]]:via-yellow-300 [&_[data-slot=progress-indicator]]:to-amber-500" />
          </div>
        </div>
        <div className="relative mx-auto hidden h-52 w-full max-w-[280px] overflow-hidden rounded-2xl border border-amber-300/35 bg-black shadow-xl shadow-amber-600/10 sm:block">
          <img src={renownedKingsArt} alt="Renowned Mon Kings in History collection overview" className="h-full w-full object-cover object-top opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-amber-200/10" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="font-black text-amber-50">Renowned Mon Kings in History</p>
            <p className="mt-1 text-xs text-amber-100/70">Mystery • Heritage • Achievement</p>
          </div>
        </div>
      </div>

      {showCollection && (
        <div className="relative mt-7 border-t border-amber-300/15 pt-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-amber-950"><Gem className="h-5 w-5" /></span>
            <div>
              <h3 className="font-black text-amber-50">My legendary history collection</h3>
              <p className="text-xs text-amber-100/60">Locked portraits stay secret until their golden chest opens.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {LANGUAGE_QUEST_LEGENDARY_AWARDS.map((award) => (
              <LegendaryAwardCard
                key={award.id}
                award={award}
                unlocked={unlocked.has(award.id)}
                featured={award.id === rewards.currentLegendaryId}
                onSelect={unlocked.has(award.id) ? () => setViewingAwardId(award.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      <LegendaryAwardCardDialog
        awardId={viewingAwardId}
        learnerName={learnerName}
        open={viewingAwardId !== null}
        onOpenChange={(open) => { if (!open) setViewingAwardId(null); }}
      />
    </section>
  );
}

export function LanguageQuestLegendaryReveal({
  awardId,
  open,
  onOpenChange,
}: {
  awardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const award = languageQuestLegendaryAwardById(awardId);
  if (!award) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border border-amber-300/40 bg-[#080501] p-0 text-white shadow-[0_0_120px_rgba(245,158,11,.32)] sm:max-w-xl" showCloseButton={false}>
        <div className="relative min-h-[650px] overflow-hidden px-5 pb-6 pt-8 sm:min-h-[700px]">
          <div className="lq-legendary-rays pointer-events-none absolute left-1/2 top-[42%] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2" />
          <div className="lq-legendary-spark lq-legendary-spark-a" />
          <div className="lq-legendary-spark lq-legendary-spark-b" />
          <div className="lq-legendary-spark lq-legendary-spark-c" />

          <DialogHeader className="relative z-20 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 text-amber-950 shadow-lg shadow-amber-400/30">
              <Trophy className="h-6 w-6" />
            </div>
            <DialogTitle className="mt-2 text-2xl font-black text-amber-50">Legendary chest unlocked!</DialogTitle>
            <DialogDescription className="text-amber-200/80">
              {award.unlockXp.toLocaleString()} XP milestone • {award.achievement}
            </DialogDescription>
          </DialogHeader>

          <div className="relative z-10 mx-auto mt-2 h-[410px] max-w-[280px]">
            <div className="lq-legendary-card-rise absolute inset-x-7 top-0 overflow-hidden rounded-2xl border-4 border-yellow-300 bg-amber-200 shadow-[0_0_55px_rgba(250,204,21,.65)]">
              <img src={LEGENDARY_ART[award.id]} alt={`Historical portrait card of ${award.name}`} className="aspect-[3/4] w-full object-cover object-top" />
            </div>
            <div className="lq-reveal-chest absolute inset-x-0 bottom-2 h-40">
              <div className="lq-reveal-chest-lid" />
              <div className="lq-reveal-chest-base">
                <span><Star className="h-7 w-7 fill-current" /></span>
              </div>
            </div>
          </div>

          <div className="relative z-20 -mt-1 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">{award.virtue}</p>
            <h3 className="mt-1 text-2xl font-black text-white">{award.name}</h3>
            <p className="mt-1 text-sm font-bold text-amber-200">{award.reign}</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-amber-50/70">{award.description}</p>
            <Button onClick={() => onOpenChange(false)} className="mt-5 bg-gradient-to-r from-amber-500 to-yellow-300 font-black text-amber-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-200">
              <Sparkles className="mr-2 h-4 w-4" /> Add to my legendary vault
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
