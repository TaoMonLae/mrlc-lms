import { Gift, Heart, Lock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  LANGUAGE_QUEST_SURPRISE_CARDS,
  type LanguageQuestSurpriseCard,
  type LanguageQuestSurpriseCardCollection,
} from '@/shared/languageQuestHeartRefill';

export function LanguageQuestSurpriseCardView({
  card,
  compact = false,
}: {
  card: LanguageQuestSurpriseCard;
  compact?: boolean;
}) {
  return (
    <article
      className={`relative isolate overflow-hidden rounded-3xl border-4 border-white/50 text-white shadow-xl ${compact ? 'min-h-64 p-4' : 'min-h-96 p-6'}`}
      style={{ background: `linear-gradient(145deg, ${card.colors[0]}, ${card.colors[1]} 60%, ${card.colors[2]})` }}
    >
      <div className="absolute -right-14 -top-14 -z-10 h-44 w-44 rounded-full bg-white/20 blur-xl" />
      <div className="absolute -bottom-20 -left-12 -z-10 h-52 w-52 rounded-full bg-slate-950/20 blur-xl" />
      <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.16em]">
        <span>{card.rarity} surprise</span>
        <span className="rounded-full bg-white/20 px-2.5 py-1">Unique</span>
      </div>
      <div className={`grid place-items-center ${compact ? 'h-28 text-7xl' : 'h-48 text-9xl'}`} aria-hidden="true">
        <span className="drop-shadow-2xl">{card.emoji}</span>
      </div>
      <h3 className={`${compact ? 'text-xl' : 'text-3xl'} font-black`}>{card.name}</h3>
      <p className="mt-1 font-bold text-white/75">{card.epithet}</p>
      <div className="mt-4 rounded-2xl border border-white/20 bg-slate-950/20 p-3 backdrop-blur-sm">
        <p className="text-xs font-black uppercase tracking-wider text-white/65">Special power</p>
        <p className="mt-1 font-black">{card.power}</p>
        {!compact && <p className="mt-2 text-sm leading-6 text-white/80">{card.story}</p>}
      </div>
    </article>
  );
}

export function LanguageQuestSurpriseCardCollection({
  collection,
}: {
  collection: LanguageQuestSurpriseCardCollection;
}) {
  const unlocked = new Set(collection.unlockedIds);
  return (
    <section className="rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-rose-50 p-5 shadow-sm dark:border-fuchsia-500/20 dark:from-fuchsia-950/25 dark:via-slate-950 dark:to-rose-950/20 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-rose-500 text-white shadow-lg">
            <Gift className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-600 dark:text-fuchsia-300">Secret collection</p>
            <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Surprise Heart Cards</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Your first successful Heart Refill Quiz each day reveals one card you do not own yet.
            </p>
          </div>
        </div>
        <Badge className="w-fit bg-fuchsia-100 px-3 py-1.5 text-fuchsia-800 hover:bg-fuchsia-100 dark:bg-fuchsia-500/15 dark:text-fuchsia-200">
          <Sparkles className="h-3.5 w-3.5" /> {collection.unlockedCount}/{collection.totalCount} found
        </Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LANGUAGE_QUEST_SURPRISE_CARDS.map((card) => {
          const found = unlocked.has(card.id);
          return found ? (
            <LanguageQuestSurpriseCardView key={card.id} card={card} compact />
          ) : (
            <article key={card.id} className="grid min-h-64 place-items-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-100/80 p-4 text-center dark:border-slate-700 dark:bg-slate-900/70">
              <div>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Lock className="h-7 w-7" />
                </span>
                <p className="mt-4 font-black text-slate-700 dark:text-slate-200">Mystery card</p>
                <p className="mt-1 text-xs leading-5 text-slate-500"><Heart className="mr-1 inline h-3.5 w-3.5 fill-current text-rose-500" />Pass a refill quiz to reveal it</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
